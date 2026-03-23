import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const CreateContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  accountId: z.string().optional(),
  leadId: z.string().optional(),
  source: z.enum(["REFERRAL","COLD_OUTREACH","INBOUND_SEO","INBOUND_ADS","LINKEDIN","EVENT","OTHER"]).default("OTHER"),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
});

export async function contactsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/contacts
  app.get("/", auth, async (req) => {
    const { orgId, accountId, search, page = "1", limit = "50" } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (accountId) where.accountId = accountId;
    if (search) where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { account: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.contact.count({ where }),
    ]);

    return { contacts, total, page: Number(page), limit: Number(limit) };
  });

  // GET /api/v1/contacts/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        account: true,
        activities: { orderBy: { createdAt: "desc" } },
        deals: { include: { deal: { select: { id: true, name: true, stage: true, value: true } } } },
        calls: { orderBy: { calledAt: "desc" }, take: 20 },
        quotes: { select: { id: true, number: true, title: true, status: true, total: true } },
      },
    });
    if (!contact) return reply.code(404).send({ error: "Contact not found" });
    return contact;
  });

  // POST /api/v1/contacts
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateContactSchema.parse(data);
    const payload = req.user as { sub: string };

    const contact = await prisma.contact.create({
      data: { ...body, organizationId: orgId } as any,
    });

    await prisma.contactActivity.create({
      data: { contactId: contact.id, type: "note", title: "Contact created", createdBy: payload.sub },
    });

    return reply.code(201).send(contact);
  });

  // PATCH /api/v1/contacts/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Partial<z.infer<typeof CreateContactSchema>>;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Contact not found" });

    const contact = await prisma.contact.update({ where: { id }, data: body as any });
    return contact;
  });

  // DELETE /api/v1/contacts/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.contact.delete({ where: { id } });
    return reply.code(204).send();
  });

  // POST /api/v1/contacts/:id/activities
  app.post("/:id/activities", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { type, title, body: bodyText } = req.body as any;
    const payload = req.user as { sub: string };

    const activity = await prisma.contactActivity.create({
      data: { contactId: id, type, title, body: bodyText, createdBy: payload.sub },
    });
    return reply.code(201).send(activity);
  });
}
