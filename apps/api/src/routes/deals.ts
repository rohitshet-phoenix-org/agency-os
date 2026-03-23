import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const DEAL_STAGES = ["PROSPECTING","QUALIFICATION","NEEDS_ANALYSIS","VALUE_PROPOSITION","DECISION_MAKING","PROPOSAL","NEGOTIATION","WON","LOST"] as const;

const CreateDealSchema = z.object({
  name: z.string().min(1),
  accountId: z.string().optional(),
  value: z.number().optional(),
  stage: z.enum(DEAL_STAGES).default("PROSPECTING"),
  probability: z.number().int().min(0).max(100).default(10),
  expectedCloseDate: z.string().optional(),
  source: z.enum(["REFERRAL","COLD_OUTREACH","INBOUND_SEO","INBOUND_ADS","LINKEDIN","EVENT","OTHER"]).default("OTHER"),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
});

export async function dealsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/deals
  app.get("/", auth, async (req) => {
    const { orgId, stage, accountId, search, page = "1", limit = "100" } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (stage) where.stage = stage;
    if (accountId) where.accountId = accountId;
    if (search) where.OR = [
      { name: { contains: search } },
    ];

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          account: { select: { id: true, name: true } },
          contacts: { include: { contact: { select: { id: true, firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.deal.count({ where }),
    ]);

    return { deals, total, page: Number(page), limit: Number(limit) };
  });

  // GET /api/v1/deals/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        account: true,
        contacts: { include: { contact: true } },
        activities: { orderBy: { createdAt: "desc" } },
        quotes: { select: { id: true, number: true, title: true, status: true, total: true } },
      },
    });
    if (!deal) return reply.code(404).send({ error: "Deal not found" });
    return deal;
  });

  // POST /api/v1/deals
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateDealSchema.parse(data);
    const payload = req.user as { sub: string };

    const deal = await prisma.deal.create({
      data: {
        ...body,
        organizationId: orgId,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
      } as any,
    });

    await prisma.dealActivity.create({
      data: { dealId: deal.id, type: "note", title: "Deal created", createdBy: payload.sub },
    });

    return reply.code(201).send(deal);
  });

  // PATCH /api/v1/deals/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const payload = req.user as { sub: string };

    const existing = await prisma.deal.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Deal not found" });

    if (body.stage && body.stage !== existing.stage) {
      await prisma.dealActivity.create({
        data: {
          dealId: id,
          type: "stage_change",
          title: `Stage changed from ${existing.stage} to ${body.stage}`,
          createdBy: payload.sub,
        },
      });
    }

    const updateData: any = { ...body };
    if (body.expectedCloseDate) updateData.expectedCloseDate = new Date(body.expectedCloseDate);
    if (body.stage === "WON") updateData.actualCloseDate = new Date();
    if (body.stage === "LOST") updateData.actualCloseDate = new Date();

    const deal = await prisma.deal.update({ where: { id }, data: updateData });
    return deal;
  });

  // DELETE /api/v1/deals/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.deal.delete({ where: { id } });
    return reply.code(204).send();
  });

  // POST /api/v1/deals/:id/activities
  app.post("/:id/activities", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { type, title, body: bodyText } = req.body as any;
    const payload = req.user as { sub: string };

    const activity = await prisma.dealActivity.create({
      data: { dealId: id, type, title, body: bodyText, createdBy: payload.sub },
    });
    return reply.code(201).send(activity);
  });

  // POST /api/v1/deals/:id/contacts — link a contact to a deal
  app.post("/:id/contacts", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { contactId, role } = req.body as any;

    const link = await prisma.dealContact.create({
      data: { dealId: id, contactId, role },
    });
    return reply.code(201).send(link);
  });
}
