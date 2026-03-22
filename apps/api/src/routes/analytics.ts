import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";

export async function analyticsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/analytics/integrations?clientId=
  app.get("/integrations", auth, async (req) => {
    const { clientId } = req.query as { clientId: string };
    return prisma.analyticsIntegration.findMany({
      where: { clientId },
      select: { id: true, platform: true, accountId: true, isActive: true, createdAt: true },
    });
  });

  // POST /api/v1/analytics/integrations
  app.post("/integrations", auth, async (req, reply) => {
    const body = req.body as any;
    const integration = await prisma.analyticsIntegration.upsert({
      where: { clientId_platform_accountId: { clientId: body.clientId, platform: body.platform, accountId: body.accountId } },
      create: { clientId: body.clientId, platform: body.platform, accountId: body.accountId, accessToken: body.accessToken, refreshToken: body.refreshToken },
      update: { accessToken: body.accessToken, refreshToken: body.refreshToken, isActive: true },
    });
    return reply.code(201).send(integration);
  });

  // GET /api/v1/analytics/metrics?integrationId=&metric=&from=&to=
  app.get("/metrics", auth, async (req) => {
    const { integrationId, metric, from, to } = req.query as Record<string, string>;

    const where: any = { integrationId };
    if (metric) where.metric = metric;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    return prisma.metricSnapshot.findMany({
      where,
      orderBy: { date: "asc" },
    });
  });

  // POST /api/v1/analytics/metrics (bulk upsert from sync job)
  app.post("/metrics", auth, async (req, reply) => {
    const { snapshots } = req.body as { snapshots: any[] };

    await prisma.$transaction(
      snapshots.map((s) =>
        prisma.metricSnapshot.upsert({
          where: { integrationId_date_metric: { integrationId: s.integrationId, date: new Date(s.date), metric: s.metric } },
          create: { integrationId: s.integrationId, date: new Date(s.date), metric: s.metric, value: s.value, dimensions: s.dimensions },
          update: { value: s.value },
        })
      )
    );

    return reply.code(201).send({ synced: snapshots.length });
  });

  // GET /api/v1/analytics/summary?clientId=&from=&to=
  app.get("/summary", auth, async (req) => {
    const { clientId, from, to } = req.query as Record<string, string>;

    const integrations = await prisma.analyticsIntegration.findMany({ where: { clientId, isActive: true } });
    const integrationIds = integrations.map((i) => i.id);

    const metrics = await prisma.metricSnapshot.groupBy({
      by: ["metric"],
      where: {
        integrationId: { in: integrationIds },
        date: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
      _sum: { value: true },
      _avg: { value: true },
    });

    return { clientId, from, to, metrics };
  });

  // GET /api/v1/analytics/alerts?clientId=
  app.get("/alerts", auth, async (req) => {
    const { clientId } = req.query as { clientId: string };
    return prisma.alert.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
  });

  // POST /api/v1/analytics/alerts
  app.post("/alerts", auth, async (req, reply) => {
    const body = req.body as any;
    const alert = await prisma.alert.create({ data: body });
    return reply.code(201).send(alert);
  });

  // DELETE /api/v1/analytics/alerts/:id
  app.delete("/alerts/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.alert.update({ where: { id }, data: { isActive: false } });
    return reply.code(204).send();
  });
}
