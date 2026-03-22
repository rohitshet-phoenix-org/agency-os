import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const CreateLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  source: z.enum(["REFERRAL","COLD_OUTREACH","INBOUND_SEO","INBOUND_ADS","LINKEDIN","EVENT","OTHER"]).default("OTHER"),
  estimatedValue: z.number().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function leadsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/leads?orgId=&status=&source=&page=&limit=
  app.get("/", auth, async (req) => {
    const { orgId, status, source, page = "1", limit = "25", search } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total, page: Number(page), limit: Number(limit) };
  });

  // GET /api/v1/leads/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { activities: { orderBy: { createdAt: "desc" } }, tags: { include: { tag: true } } },
    });
    if (!lead) return reply.code(404).send({ error: "Lead not found" });
    return lead;
  });

  // POST /api/v1/leads
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateLeadSchema.parse(data);
    const payload = req.user as { sub: string };

    const lead = await prisma.lead.create({
      data: { ...body, organizationId: orgId },
    });

    await prisma.leadActivity.create({
      data: { leadId: lead.id, type: "note", title: "Lead created", createdBy: payload.sub },
    });

    return reply.code(201).send(lead);
  });

  // PATCH /api/v1/leads/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Partial<z.infer<typeof CreateLeadSchema>> & { status?: string };
    const payload = req.user as { sub: string };

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Lead not found" });

    if (body.status && body.status !== existing.status) {
      await prisma.leadActivity.create({
        data: {
          leadId: id,
          type: "status_change",
          title: `Status changed from ${existing.status} to ${body.status}`,
          createdBy: payload.sub,
        },
      });
    }

    const lead = await prisma.lead.update({ where: { id }, data: body as any });
    return lead;
  });

  // DELETE /api/v1/leads/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.lead.delete({ where: { id } });
    return reply.code(204).send();
  });

  // POST /api/v1/leads/:id/activities
  app.post("/:id/activities", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { type, title, body: bodyText } = req.body as any;
    const payload = req.user as { sub: string };

    const activity = await prisma.leadActivity.create({
      data: { leadId: id, type, title, body: bodyText, createdBy: payload.sub },
    });
    return reply.code(201).send(activity);
  });

  // POST /api/v1/leads/:id/convert  — convert lead to client
  app.post("/:id/convert", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.code(404).send({ error: "Lead not found" });
    if (lead.client) return reply.code(409).send({ error: "Lead already converted" });

    const client = await prisma.client.create({
      data: {
        organizationId: lead.organizationId,
        leadId: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? undefined,
        company: lead.company ?? "Unknown",
        website: lead.website ?? undefined,
      },
    });

    await prisma.lead.update({ where: { id }, data: { status: "WON", wonAt: new Date() } });
    return reply.code(201).send(client);
  });
}
