import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const CreateCaseSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  status: z.enum(["OPEN","IN_PROGRESS","PENDING_CUSTOMER","RESOLVED","CLOSED"]).default("OPEN"),
  priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).default("MEDIUM"),
  category: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function casesRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/cases
  app.get("/", auth, async (req) => {
    const { orgId, status, priority, page = "1", limit = "50" } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: { _count: { select: { comments: true } } },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.case.count({ where }),
    ]);

    return { cases, total, page: Number(page), limit: Number(limit) };
  });

  // GET /api/v1/cases/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const caseRecord = await prisma.case.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: "asc" } } },
    });
    if (!caseRecord) return reply.code(404).send({ error: "Case not found" });
    return caseRecord;
  });

  // POST /api/v1/cases
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateCaseSchema.parse(data);

    const caseRecord = await prisma.case.create({
      data: { ...body, organizationId: orgId } as any,
    });
    return reply.code(201).send(caseRecord);
  });

  // PATCH /api/v1/cases/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;

    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Case not found" });

    const updateData: any = { ...body };
    if (body.status === "RESOLVED" || body.status === "CLOSED") {
      updateData.resolvedAt = new Date();
    }

    const caseRecord = await prisma.case.update({ where: { id }, data: updateData });
    return caseRecord;
  });

  // DELETE /api/v1/cases/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.case.delete({ where: { id } });
    return reply.code(204).send();
  });

  // POST /api/v1/cases/:id/comments
  app.post("/:id/comments", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { body: bodyText, isInternal = false } = req.body as any;
    const payload = req.user as { sub: string };

    const comment = await prisma.caseComment.create({
      data: { caseId: id, body: bodyText, isInternal, createdBy: payload.sub },
    });
    return reply.code(201).send(comment);
  });
}
