import { Worker } from "bullmq";
import { prisma } from "@agency-os/db";
import { getIntegration } from "../services/integrations.js";
import { createResendClient, sendBulkCampaign } from "../services/resend-email.js";
import { createGSCClient, getKeywordPositions } from "../services/google-search-console.js";
import { listCampaigns as listGoogleCampaigns, getDailyMetrics as getGoogleDailyMetrics } from "../services/google-ads.js";
import { listCampaigns as listMetaCampaigns, getAccountInsights as getMetaInsights } from "../services/meta-ads.js";

const connection = {
  host: process.env["REDIS_HOST"] ?? "localhost",
  port: Number(process.env["REDIS_PORT"] ?? 6379),
  password: process.env["REDIS_PASSWORD"],
};

// ── Report Worker ─────────────────────────────────────────────────────
const reportWorker = new Worker(
  "reports",
  async (job) => {
    if (job.name === "generate-report") {
      const { clientId, period, startDate, endDate, orgId, templateId } = job.data;

      const integrations = await prisma.analyticsIntegration.findMany({ where: { clientId, isActive: true } });
      const integrationIds = integrations.map((i) => i.id);

      const metrics = await prisma.metricSnapshot.findMany({
        where: {
          integrationId: { in: integrationIds },
          date: { gte: new Date(startDate), lte: new Date(endDate) },
        },
      });

      const data = {
        period,
        metrics,
        generatedAt: new Date().toISOString(),
        summary: {
          sessions: metrics.filter((m) => m.metric === "sessions").reduce((s, m) => s + m.value, 0),
          conversions: metrics.filter((m) => m.metric === "conversions").reduce((s, m) => s + m.value, 0),
          spend: metrics.filter((m) => m.metric === "spend").reduce((s, m) => s + m.value, 0),
          revenue: metrics.filter((m) => m.metric === "revenue").reduce((s, m) => s + m.value, 0),
        },
      };

      await prisma.report.create({
        data: {
          organizationId: orgId,
          clientId,
          templateId,
          title: `${period.charAt(0).toUpperCase() + period.slice(1)} Report`,
          period,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          data,
        },
      });
    }
  },
  { connection, concurrency: 5 }
);

// ── Social Publish Worker ─────────────────────────────────────────────
const socialWorker = new Worker(
  "social-publish",
  async (job) => {
    if (job.name === "publish-post") {
      const { postId } = job.data;
      const post = await prisma.socialPost.findUnique({
        where: { id: postId },
        include: { socialAccount: true },
      });
      if (!post) return;

      try {
        // In production: call platform API (Meta Graph, Twitter v2, LinkedIn, etc.)
        await prisma.socialPost.update({
          where: { id: postId },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      } catch (err) {
        await prisma.socialPost.update({
          where: { id: postId },
          data: { status: "FAILED", failureReason: String(err) },
        });
        throw err;
      }
    }
  },
  { connection, concurrency: 10 }
);

// ── Email Worker — sends via Resend ───────────────────────────────────
const emailWorker = new Worker(
  "email",
  async (job) => {
    if (job.name === "send-campaign") {
      const { campaignId } = job.data;
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: {
          list: { include: { subscribers: { where: { isActive: true } } } },
          segment: true,
        },
      });
      if (!campaign) return;

      const subscribers = campaign.list.subscribers;
      let sent = 0;

      // ── Try Resend first ────────────────────────────────────────────
      const resendInt = await getIntegration(campaign.organizationId, "resend");
      if (resendInt && campaign.htmlBody) {
        const resend = createResendClient(resendInt.credentials["apiKey"]!);
        const fromEmail = resendInt.credentials["fromEmail"] ?? `campaigns@${resendInt.credentials["domain"] ?? "youragency.com"}`;

        const result = await sendBulkCampaign(resend, {
          from: `${resendInt.credentials["fromName"] ?? "Agency OS"} <${fromEmail}>`,
          subject: campaign.subject,
          htmlBody: campaign.htmlBody,
          previewText: campaign.previewText ?? undefined,
          recipients: subscribers.map((s) => ({ email: s.email, name: s.firstName ?? undefined })),
          campaignId,
        });
        sent = result.sent;

        // Record sends
        for (const sub of subscribers) {
          await prisma.emailSend.upsert({
            where: { campaignId_subscriberId: { campaignId, subscriberId: sub.id } },
            create: { campaignId, subscriberId: sub.id, sentAt: new Date() },
            update: { sentAt: new Date() },
          }).catch(() => {});
        }
      } else {
        // Fallback: record without sending (no Resend configured)
        for (const sub of subscribers) {
          try {
            await prisma.emailSend.upsert({
              where: { campaignId_subscriberId: { campaignId, subscriberId: sub.id } },
              create: { campaignId, subscriberId: sub.id, sentAt: new Date() },
              update: { sentAt: new Date() },
            });
            sent++;
          } catch {}
        }
      }

      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED", sentAt: new Date(), totalSent: sent },
      });
    }
  },
  { connection, concurrency: 5 }
);

// ── SEO Worker — syncs rankings via Google Search Console ─────────────
const seoWorker = new Worker(
  "seo",
  async (job) => {
    if (job.name === "check-rankings") {
      const { seoProjectId } = job.data;
      const project = await prisma.seoProject.findUnique({ where: { id: seoProjectId } });
      if (!project) return;

      const keywords = await prisma.seoKeyword.findMany({ where: { seoProjectId } });
      const today = new Date(new Date().toDateString());
      const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const endDate = today.toISOString().slice(0, 10);

      // ── Try Google Search Console ───────────────────────────────────
      const gscInt = await getIntegration(project.organizationId, "google_search_console");
      if (gscInt && project.domain && keywords.length > 0) {
        try {
          const gsc = createGSCClient({
            clientEmail: gscInt.credentials["clientEmail"]!,
            privateKey: gscInt.credentials["privateKey"]!,
          });
          const siteUrl = gscInt.credentials["siteUrl"] ?? `https://${project.domain}`;
          const positions = await getKeywordPositions(
            gsc,
            siteUrl,
            keywords.map((k) => k.keyword),
            startDate,
            endDate
          );

          for (const pos of positions) {
            const kw = keywords.find((k) => k.keyword.toLowerCase() === pos.keyword.toLowerCase());
            if (!kw) continue;
            await prisma.keywordRanking.upsert({
              where: { keywordId_date: { keywordId: kw.id, date: today } },
              create: {
                keywordId: kw.id,
                date: today,
                position: pos.position !== null ? Math.round(pos.position) : null,
                clicks: pos.clicks,
                impressions: pos.impressions,
                ctr: pos.ctr,
              },
              update: {
                position: pos.position !== null ? Math.round(pos.position) : null,
                clicks: pos.clicks,
                impressions: pos.impressions,
                ctr: pos.ctr,
              },
            });
          }
          return;
        } catch (err) {
          console.error("GSC sync failed:", err);
        }
      }

      // Fallback: upsert with null position (no GSC configured)
      for (const kw of keywords) {
        await prisma.keywordRanking.upsert({
          where: { keywordId_date: { keywordId: kw.id, date: today } },
          create: { keywordId: kw.id, date: today, position: null },
          update: {},
        });
      }
    }

    if (job.name === "run-audit") {
      const { seoProjectId } = job.data;
      await prisma.seoAudit.create({
        data: { seoProjectId, score: 0, issues: [], pagesScanned: 0 },
      });
    }
  },
  { connection, concurrency: 3 }
);

// ── Ad Sync Worker — syncs from Google Ads + Meta Ads ─────────────────
const adSyncWorker = new Worker(
  "ad-sync",
  async (job) => {
    if (job.name === "sync-account") {
      const { adAccountId } = job.data;
      const account = await prisma.adAccount.findUnique({ where: { id: adAccountId } });
      if (!account) return;

      const orgId = account.organizationId;

      if (account.platform === "GOOGLE") {
        const googleInt = await getIntegration(orgId, "google_ads");
        if (!googleInt) {
          console.log(`Google Ads: no credentials for org ${orgId}`);
          return;
        }
        const creds = {
          developerToken: googleInt.credentials["developerToken"]!,
          clientId: googleInt.credentials["clientId"]!,
          clientSecret: googleInt.credentials["clientSecret"]!,
          refreshToken: googleInt.credentials["refreshToken"]!,
          managerCustomerId: googleInt.credentials["managerCustomerId"],
        };

        try {
          const campaigns = await listGoogleCampaigns(creds, account.accountId);
          for (const c of campaigns) {
            const existing = await prisma.adCampaign.findFirst({
              where: { adAccountId, externalId: String(c.id) },
            });
            const campaignData = {
              name: c.name,
              status: c.status === "ENABLED" ? "ACTIVE" : "PAUSED",
              budget: 0,
              externalId: String(c.id),
            };
            if (existing) {
              await prisma.adCampaign.update({ where: { id: existing.id }, data: campaignData });
            } else {
              await prisma.adCampaign.create({ data: { ...campaignData, adAccountId } as any });
            }
          }

          // Store daily metrics as MetricSnapshots
          const daily = await getGoogleDailyMetrics(creds, account.accountId, 7);
          for (const d of daily) {
            const integration = await prisma.analyticsIntegration.findFirst({
              where: { clientId: account.clientId ?? "" },
            });
            if (!integration) continue;
            for (const [metric, value] of Object.entries({
              spend: d.spend,
              impressions: d.impressions,
              clicks: d.clicks,
              conversions: d.conversions,
            })) {
              await prisma.metricSnapshot.upsert({
                where: { integrationId_metric_date: { integrationId: integration.id, metric, date: new Date(d.date) } },
                create: { integrationId: integration.id, metric, value: Number(value), date: new Date(d.date) },
                update: { value: Number(value) },
              });
            }
          }
        } catch (err) {
          console.error("Google Ads sync error:", err);
        }
      }

      if (account.platform === "META") {
        const metaInt = await getIntegration(orgId, "meta_ads");
        if (!metaInt) {
          console.log(`Meta Ads: no credentials for org ${orgId}`);
          return;
        }
        const creds = {
          accessToken: metaInt.credentials["accessToken"]!,
          adAccountId: account.accountId,
        };

        try {
          const campaigns = await listMetaCampaigns(creds);
          for (const c of campaigns) {
            const existing = await prisma.adCampaign.findFirst({
              where: { adAccountId, externalId: c.id },
            });
            const campaignData = {
              name: c.name,
              status: c.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
              budget: 0,
              externalId: c.id,
            };
            if (existing) {
              await prisma.adCampaign.update({ where: { id: existing.id }, data: campaignData });
            } else {
              await prisma.adCampaign.create({ data: { ...campaignData, adAccountId } as any });
            }
          }

          const insights = await getMetaInsights(creds);
          await prisma.adMetric.create({
            data: {
              adAccountId,
              date: new Date(),
              impressions: insights.impressions,
              clicks: insights.clicks,
              spend: insights.spend,
              conversions: insights.conversions,
              roas: insights.roas,
            } as any,
          });
        } catch (err) {
          console.error("Meta Ads sync error:", err);
        }
      }
    }
  },
  { connection, concurrency: 5 }
);

// ── Alert Worker ──────────────────────────────────────────────────────
const alertWorker = new Worker(
  "alerts",
  async (job) => {
    if (job.name === "evaluate-alerts") {
      const alerts = await prisma.alert.findMany({ where: { isActive: true, resolvedAt: null } });

      for (const alert of alerts) {
        const integrations = await prisma.analyticsIntegration.findMany({ where: { clientId: alert.clientId } });
        const integrationIds = integrations.map((i) => i.id);

        const latest = await prisma.metricSnapshot.findFirst({
          where: { integrationId: { in: integrationIds }, metric: alert.metric },
          orderBy: { date: "desc" },
        });

        if (!latest) continue;

        let triggered = false;
        if (alert.condition === "gt" && latest.value > alert.threshold) triggered = true;
        if (alert.condition === "lt" && latest.value < alert.threshold) triggered = true;

        if (triggered && !alert.triggeredAt) {
          await prisma.alert.update({ where: { id: alert.id }, data: { triggeredAt: new Date() } });
        }
      }
    }
  },
  { connection, concurrency: 2 }
);

export { reportWorker, socialWorker, emailWorker, seoWorker, adSyncWorker, alertWorker };
