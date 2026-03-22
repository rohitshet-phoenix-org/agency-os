import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { emailQueue } from "../jobs/queues.js";

export async function emailRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // ── Lists ─────────────────────────────────────────────────────────────
  app.get("/lists", auth, async (req) => {
    const { orgId } = req.query as { orgId: string };
    return prisma.emailList.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { subscribers: true } } },
    });
  });

  app.post("/lists", auth, async (req, reply) => {
    const body = req.body as any;
    const list = await prisma.emailList.create({
      data: { organizationId: body.orgId, clientId: body.clientId, name: body.name, description: body.description },
    });
    return reply.code(201).send(list);
  });

  // ── Subscribers ───────────────────────────────────────────────────────
  app.get("/lists/:listId/subscribers", auth, async (req) => {
    const { listId } = req.params as { listId: string };
    const { isActive, search } = req.query as Record<string, string>;
    const where: any = { listId };
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) where.OR = [{ email: { contains: search, mode: "insensitive" } }, { firstName: { contains: search, mode: "insensitive" } }];
    return prisma.emailSubscriber.findMany({ where, orderBy: { subscribedAt: "desc" } });
  });

  app.post("/lists/:listId/subscribers", auth, async (req, reply) => {
    const { listId } = req.params as { listId: string };
    const body = req.body as any;
    const sub = await prisma.emailSubscriber.upsert({
      where: { listId_email: { listId, email: body.email } },
      create: { listId, email: body.email, firstName: body.firstName, lastName: body.lastName, tags: body.tags ?? [], metadata: body.metadata },
      update: { isActive: true, firstName: body.firstName, lastName: body.lastName },
    });
    return reply.code(201).send(sub);
  });

  // Bulk import
  app.post("/lists/:listId/subscribers/bulk", auth, async (req, reply) => {
    const { listId } = req.params as { listId: string };
    const { subscribers } = req.body as { subscribers: any[] };
    let created = 0;
    for (const s of subscribers) {
      await prisma.emailSubscriber.upsert({
        where: { listId_email: { listId, email: s.email } },
        create: { listId, email: s.email, firstName: s.firstName, lastName: s.lastName, tags: s.tags ?? [] },
        update: { isActive: true },
      });
      created++;
    }
    return reply.code(201).send({ imported: created });
  });

  // ── Campaigns ─────────────────────────────────────────────────────────
  app.get("/campaigns", auth, async (req) => {
    const { orgId, status } = req.query as Record<string, string>;
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return prisma.emailCampaign.findMany({
      where,
      include: { list: { select: { name: true } }, _count: { select: { sends: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/campaigns/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: { sequences: { orderBy: { order: "asc" } }, list: true, segment: true },
    });
    if (!campaign) return reply.code(404).send({ error: "Campaign not found" });
    return campaign;
  });

  app.post("/campaigns", auth, async (req, reply) => {
    const body = req.body as any;
    const campaign = await prisma.emailCampaign.create({
      data: {
        organizationId: body.orgId,
        listId: body.listId,
        segmentId: body.segmentId,
        name: body.name,
        subject: body.subject,
        previewText: body.previewText,
        htmlBody: body.htmlBody,
        textBody: body.textBody,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
    });
    return reply.code(201).send(campaign);
  });

  app.patch("/campaigns/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    if (body.scheduledAt) body.scheduledAt = new Date(body.scheduledAt);
    return prisma.emailCampaign.update({ where: { id }, data: body });
  });

  // POST /api/v1/email/campaigns/:id/send
  app.post("/campaigns/:id/send", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.emailCampaign.update({ where: { id }, data: { status: "RUNNING" } });
    await emailQueue.add("send-campaign", { campaignId: id });
    return reply.code(202).send({ status: "queued" });
  });

  // GET /api/v1/email/campaigns/:id/stats
  app.get("/campaigns/:id/stats", auth, async (req) => {
    const { id } = req.params as { id: string };
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      select: { totalSent: true, totalOpened: true, totalClicked: true, totalBounced: true, totalUnsubscribed: true },
    });
    if (!campaign) return { error: "Campaign not found" };
    const openRate = campaign.totalSent > 0 ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1) : "0";
    const clickRate = campaign.totalOpened > 0 ? ((campaign.totalClicked / campaign.totalOpened) * 100).toFixed(1) : "0";
    return { ...campaign, openRate: `${openRate}%`, clickRate: `${clickRate}%` };
  });

  // ── Sequences ─────────────────────────────────────────────────────────
  app.post("/campaigns/:id/sequences", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const seq = await prisma.emailSequence.create({
      data: { campaignId: id, name: body.name, delayDays: body.delayDays ?? 0, delayHours: body.delayHours ?? 0, subject: body.subject, htmlBody: body.htmlBody, order: body.order ?? 0 },
    });
    return reply.code(201).send(seq);
  });
}
