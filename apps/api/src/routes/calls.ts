import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const CreateCallSchema = z.object({
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  direction: z.enum(["INBOUND","OUTBOUND"]).default("OUTBOUND"),
  duration: z.number().int().optional(),
  outcome: z.enum(["CONNECTED","NO_ANSWER","VOICEMAIL","BUSY","WRONG_NUMBER"]).default("CONNECTED"),
  notes: z.string().optional(),
  calledAt: z.string().optional(),
});

export async function callsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/calls
  app.get("/", auth, async (req) => {
    const { orgId, contactId, leadId, dealId, page = "1", limit = "50" } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (contactId) where.contactId = contactId;
    if (leadId) where.leadId = leadId;
    if (dealId) where.dealId = dealId;

    const [calls, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { calledAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.callLog.count({ where }),
    ]);

    return { calls, total, page: Number(page), limit: Number(limit) };
  });

  // POST /api/v1/calls
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateCallSchema.parse(data);
    const payload = req.user as { sub: string };

    const call = await prisma.callLog.create({
      data: {
        ...body,
        organizationId: orgId,
        createdBy: payload.sub,
        calledAt: body.calledAt ? new Date(body.calledAt) : new Date(),
      },
    });
    return reply.code(201).send(call);
  });

  // PATCH /api/v1/calls/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;

    const existing = await prisma.callLog.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Call not found" });

    const call = await prisma.callLog.update({ where: { id }, data: body });
    return call;
  });

  // DELETE /api/v1/calls/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.callLog.delete({ where: { id } });
    return reply.code(204).send();
  });
}
