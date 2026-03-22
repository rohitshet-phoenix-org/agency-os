import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { seoQueue } from "../jobs/queues.js";

export async function seoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // ── SEO Projects ──────────────────────────────────────────────────────
  app.get("/projects", auth, async (req) => {
    const { orgId, clientId } = req.query as Record<string, string>;
    const where: any = { organizationId: orgId };
    if (clientId) where.clientId = clientId;
    return prisma.seoProject.findMany({
      where,
      include: {
        _count: { select: { keywords: true, backlinks: true, audits: true } },
      },
    });
  });

  app.post("/projects", auth, async (req, reply) => {
    const body = req.body as any;
    const project = await prisma.seoProject.create({
      data: { organizationId: body.orgId, clientId: body.clientId, domain: body.domain },
    });
    return reply.code(201).send(project);
  });

  // ── Keywords ──────────────────────────────────────────────────────────
  app.get("/projects/:id/keywords", auth, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.seoKeyword.findMany({
      where: { seoProjectId: id },
      include: {
        rankings: { orderBy: { date: "desc" }, take: 30 },
      },
    });
  });

  app.post("/projects/:id/keywords", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const keywords = Array.isArray(body.keywords) ? body.keywords : [body];

    const created = await prisma.$transaction(
      keywords.map((k: any) =>
        prisma.seoKeyword.upsert({
          where: { seoProjectId_keyword_country: { seoProjectId: id, keyword: k.keyword, country: k.country ?? "US" } },
          create: { seoProjectId: id, keyword: k.keyword, targetUrl: k.targetUrl, country: k.country ?? "US", language: k.language ?? "en" },
          update: { targetUrl: k.targetUrl },
        })
      )
    );

    // Queue rank check
    await seoQueue.add("check-rankings", { seoProjectId: id });

    return reply.code(201).send(created);
  });

  // GET /api/v1/seo/projects/:id/rankings?from=&to=
  app.get("/projects/:id/rankings", auth, async (req) => {
    const { id } = req.params as { id: string };
    const { from, to } = req.query as Record<string, string>;

    const keywords = await prisma.seoKeyword.findMany({ where: { seoProjectId: id } });
    const kwIds = keywords.map((k) => k.id);

    return prisma.keywordRanking.findMany({
      where: {
        keywordId: { in: kwIds },
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { keyword: { select: { keyword: true, targetUrl: true, country: true } } },
      orderBy: { date: "desc" },
    });
  });

  // ── Backlinks ─────────────────────────────────────────────────────────
  app.get("/projects/:id/backlinks", auth, async (req) => {
    const { id } = req.params as { id: string };
    const { isLost } = req.query as { isLost?: string };
    const where: any = { seoProjectId: id };
    if (isLost !== undefined) where.isLost = isLost === "true";
    return prisma.backlink.findMany({ where, orderBy: { domainRating: "desc" } });
  });

  // ── Audits ────────────────────────────────────────────────────────────
  app.get("/projects/:id/audits", auth, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.seoAudit.findMany({ where: { seoProjectId: id }, orderBy: { auditedAt: "desc" } });
  });

  // POST /api/v1/seo/projects/:id/audit — trigger audit
  app.post("/projects/:id/audit", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await seoQueue.add("run-audit", { seoProjectId: id });
    return reply.code(202).send({ jobId: job.id, status: "queued" });
  });

  // GET /api/v1/seo/projects/:id/summary
  app.get("/projects/:id/summary", auth, async (req) => {
    const { id } = req.params as { id: string };
    const [keywordCount, backlinkCount, latestAudit, topKeywords] = await Promise.all([
      prisma.seoKeyword.count({ where: { seoProjectId: id } }),
      prisma.backlink.count({ where: { seoProjectId: id, isLost: false } }),
      prisma.seoAudit.findFirst({ where: { seoProjectId: id }, orderBy: { auditedAt: "desc" } }),
      prisma.seoKeyword.findMany({
        where: { seoProjectId: id },
        include: { rankings: { orderBy: { date: "desc" }, take: 1 } },
        take: 10,
      }),
    ]);

    return { keywordCount, backlinkCount, latestAudit, topKeywords };
  });
}
