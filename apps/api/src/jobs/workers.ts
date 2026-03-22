import { Worker } from "bullmq";
import { prisma } from "@agency-os/db";

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

      // Gather metrics from all integrations
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
        // In production: call platform API (Meta, Twitter, LinkedIn, etc.)
        // For now, mark as published
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

// ── Email Worker ──────────────────────────────────────────────────────
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

      let subscribers = campaign.list.subscribers;
      // Apply segment filters if present (simplified)
      if (campaign.segmentId && campaign.segment) {
        // In production: evaluate segment rules against subscriber metadata
      }

      let sent = 0;
      for (const sub of subscribers) {
        try {
          // In production: send via Resend/Nodemailer
          await prisma.emailSend.upsert({
            where: { campaignId_subscriberId: { campaignId, subscriberId: sub.id } },
            create: { campaignId, subscriberId: sub.id, sentAt: new Date() },
            update: { sentAt: new Date() },
          });
          sent++;
        } catch {
          // continue on individual failure
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

// ── SEO Worker ────────────────────────────────────────────────────────
const seoWorker = new Worker(
  "seo",
  async (job) => {
    if (job.name === "check-rankings") {
      const { seoProjectId } = job.data;
      const keywords = await prisma.seoKeyword.findMany({ where: { seoProjectId } });

      // In production: call Google Search Console or DataForSEO API
      for (const kw of keywords) {
        await prisma.keywordRanking.upsert({
          where: { keywordId_date: { keywordId: kw.id, date: new Date(new Date().toDateString()) } },
          create: { keywordId: kw.id, date: new Date(new Date().toDateString()), position: null },
          update: {},
        });
      }
    }

    if (job.name === "run-audit") {
      const { seoProjectId } = job.data;
      // In production: run technical SEO audit
      await prisma.seoAudit.create({
        data: {
          seoProjectId,
          score: 0,
          issues: [],
          pagesScanned: 0,
        },
      });
    }
  },
  { connection, concurrency: 3 }
);

// ── Ad Sync Worker ────────────────────────────────────────────────────
const adSyncWorker = new Worker(
  "ad-sync",
  async (job) => {
    if (job.name === "sync-account") {
      const { adAccountId } = job.data;
      const account = await prisma.adAccount.findUnique({ where: { id: adAccountId } });
      if (!account) return;

      // In production: call Google Ads API / Meta Marketing API
      // Upsert campaigns and metrics
      console.log(`Syncing ad account ${account.accountName} (${account.platform})`);
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
