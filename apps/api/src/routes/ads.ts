import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { adSyncQueue } from "../jobs/queues.js";

export async function adsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // ── Ad Accounts ───────────────────────────────────────────────────────
  app.get("/accounts", auth, async (req) => {
    const { orgId, clientId } = req.query as Record<string, string>;
    const where: any = { organizationId: orgId };
    if (clientId) where.clientId = clientId;
    return prisma.adAccount.findMany({
      where,
      include: { _count: { select: { campaigns: true } } },
    });
  });

  app.post("/accounts", auth, async (req, reply) => {
    const body = req.body as any;
    const account = await prisma.adAccount.upsert({
      where: { organizationId_platform_accountId: { organizationId: body.orgId, platform: body.platform, accountId: body.accountId } },
      create: { organizationId: body.orgId, clientId: body.clientId, platform: body.platform, accountId: body.accountId, accountName: body.accountName, currency: body.currency ?? "USD", accessToken: body.accessToken },
      update: { accessToken: body.accessToken, isActive: true },
    });

    // Trigger initial sync
    await adSyncQueue.add("sync-account", { adAccountId: account.id });

    return reply.code(201).send(account);
  });

  // ── Campaigns ─────────────────────────────────────────────────────────
  app.get("/accounts/:accountId/campaigns", auth, async (req) => {
    const { accountId } = req.params as { accountId: string };
    const { status } = req.query as { status?: string };
    const where: any = { adAccountId: accountId };
    if (status) where.status = status;
    return prisma.adCampaign.findMany({
      where,
      include: { _count: { select: { adSets: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/campaigns/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
      include: {
        adAccount: { select: { platform: true, accountName: true, currency: true } },
        adSets: { include: { ads: true } },
        metrics: { orderBy: { date: "desc" }, take: 30 },
        rules: true,
      },
    });
    if (!campaign) return reply.code(404).send({ error: "Campaign not found" });
    return campaign;
  });

  // GET /api/v1/ads/accounts/:accountId/metrics?from=&to=
  app.get("/accounts/:accountId/metrics", auth, async (req) => {
    const { accountId } = req.params as { accountId: string };
    const { from, to } = req.query as Record<string, string>;

    const campaigns = await prisma.adCampaign.findMany({ where: { adAccountId: accountId } });
    const campaignIds = campaigns.map((c) => c.id);

    const metrics = await prisma.adMetric.groupBy({
      by: ["date"],
      where: {
        campaignId: { in: campaignIds },
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      _sum: { impressions: true, clicks: true, spend: true, conversions: true, revenue: true, reach: true },
      _avg: { ctr: true, roas: true, cpa: true, cpc: true },
      orderBy: { date: "asc" },
    });

    return metrics;
  });

  // GET /api/v1/ads/accounts/:accountId/summary
  app.get("/accounts/:accountId/summary", auth, async (req) => {
    const { accountId } = req.params as { accountId: string };
    const campaigns = await prisma.adCampaign.findMany({ where: { adAccountId: accountId } });
    const campaignIds = campaigns.map((c) => c.id);

    const totals = await prisma.adMetric.aggregate({
      where: { campaignId: { in: campaignIds } },
      _sum: { impressions: true, clicks: true, spend: true, conversions: true, revenue: true },
      _avg: { roas: true, ctr: true, cpa: true },
    });

    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    return { activeCampaigns, totalCampaigns: campaigns.length, ...totals };
  });

  // ── Rules ─────────────────────────────────────────────────────────────
  app.post("/campaigns/:id/rules", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const rule = await prisma.adRule.create({
      data: { campaignId: id, name: body.name, metric: body.metric, condition: body.condition, threshold: body.threshold, action: body.action, adjustment: body.adjustment },
    });
    return reply.code(201).send(rule);
  });

  app.patch("/campaigns/:id/rules/:ruleId", auth, async (req) => {
    const { ruleId } = req.params as { id: string; ruleId: string };
    const body = req.body as any;
    return prisma.adRule.update({ where: { id: ruleId }, data: body });
  });

  app.delete("/campaigns/:id/rules/:ruleId", auth, async (req, reply) => {
    const { ruleId } = req.params as { id: string; ruleId: string };
    await prisma.adRule.delete({ where: { id: ruleId } });
    return reply.code(204).send();
  });

  // POST /api/v1/ads/accounts/:accountId/sync — manual sync trigger
  app.post("/accounts/:accountId/sync", auth, async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const job = await adSyncQueue.add("sync-account", { adAccountId: accountId });
    return reply.code(202).send({ jobId: job.id, status: "syncing" });
  });
}
