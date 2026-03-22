import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { socialPublishQueue } from "../jobs/queues.js";

export async function socialRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // ── Social Accounts ───────────────────────────────────────────────────

  app.get("/accounts", auth, async (req) => {
    const { orgId, clientId } = req.query as Record<string, string>;
    const where: any = { organizationId: orgId };
    if (clientId) where.clientId = clientId;
    return prisma.socialAccount.findMany({ where, select: { id: true, platform: true, accountName: true, isActive: true } });
  });

  app.post("/accounts", auth, async (req, reply) => {
    const body = req.body as any;
    const account = await prisma.socialAccount.upsert({
      where: { organizationId_platform_accountId: { organizationId: body.orgId, platform: body.platform, accountId: body.accountId } },
      create: { organizationId: body.orgId, clientId: body.clientId, platform: body.platform, accountId: body.accountId, accountName: body.accountName, accessToken: body.accessToken },
      update: { accessToken: body.accessToken, accountName: body.accountName, isActive: true },
    });
    return reply.code(201).send(account);
  });

  // ── Posts ─────────────────────────────────────────────────────────────

  app.get("/posts", auth, async (req) => {
    const { socialAccountId, status, from, to } = req.query as Record<string, string>;
    const where: any = {};
    if (socialAccountId) where.socialAccountId = socialAccountId;
    if (status) where.status = status;
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) where.scheduledAt.lte = new Date(to);
    }

    return prisma.socialPost.findMany({
      where,
      include: {
        socialAccount: { select: { platform: true, accountName: true } },
        approval: { select: { status: true, feedback: true } },
        metrics: { orderBy: { fetchedAt: "desc" }, take: 1 },
      },
      orderBy: { scheduledAt: "asc" },
    });
  });

  app.get("/posts/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const post = await prisma.socialPost.findUnique({
      where: { id },
      include: { socialAccount: true, approval: true, metrics: { orderBy: { fetchedAt: "desc" } } },
    });
    if (!post) return reply.code(404).send({ error: "Post not found" });
    return post;
  });

  app.post("/posts", auth, async (req, reply) => {
    const body = req.body as any;
    const post = await prisma.socialPost.create({
      data: {
        socialAccountId: body.socialAccountId,
        caption: body.caption,
        mediaUrls: body.mediaUrls ?? [],
        hashtags: body.hashtags ?? [],
        status: body.status ?? "DRAFT",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
    });

    // If scheduled, enqueue publish job
    if (post.status === "SCHEDULED" && post.scheduledAt) {
      const delay = post.scheduledAt.getTime() - Date.now();
      await socialPublishQueue.add("publish-post", { postId: post.id }, { delay: Math.max(0, delay) });
    }

    return reply.code(201).send(post);
  });

  app.patch("/posts/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    if (body.scheduledAt) body.scheduledAt = new Date(body.scheduledAt);
    return prisma.socialPost.update({ where: { id }, data: body });
  });

  app.delete("/posts/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.socialPost.delete({ where: { id } });
    return reply.code(204).send();
  });

  // GET /api/v1/social/calendar?orgId=&from=&to=
  app.get("/calendar", auth, async (req) => {
    const { orgId, from, to } = req.query as Record<string, string>;
    const accounts = await prisma.socialAccount.findMany({ where: { organizationId: orgId } });
    const accountIds = accounts.map((a) => a.id);

    return prisma.socialPost.findMany({
      where: {
        socialAccountId: { in: accountIds },
        scheduledAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
      include: { socialAccount: { select: { platform: true, accountName: true, clientId: true } } },
      orderBy: { scheduledAt: "asc" },
    });
  });

  // GET /api/v1/social/posts/:id/metrics
  app.get("/posts/:id/metrics", auth, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.socialPostMetric.findMany({
      where: { postId: id },
      orderBy: { fetchedAt: "desc" },
    });
  });
}
