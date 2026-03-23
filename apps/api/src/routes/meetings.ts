import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const CreateMeetingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string(),
  endAt: z.string().optional(),
  status: z.enum(["SCHEDULED","COMPLETED","CANCELLED","NO_SHOW"]).default("SCHEDULED"),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
});

export async function meetingsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/meetings
  app.get("/", auth, async (req) => {
    const { orgId, status, leadId, dealId, page = "1", limit = "50" } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;
    if (dealId) where.dealId = dealId;

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        include: {
          contacts: { include: { contact: { select: { id: true, firstName: true, lastName: true } } } },
        },
        orderBy: { startAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.meeting.count({ where }),
    ]);

    return { meetings, total, page: Number(page), limit: Number(limit) };
  });

  // GET /api/v1/meetings/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        contacts: { include: { contact: true } },
      },
    });
    if (!meeting) return reply.code(404).send({ error: "Meeting not found" });
    return meeting;
  });

  // POST /api/v1/meetings
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateMeetingSchema.parse(data);
    const payload = req.user as { sub: string };

    const { contactIds, ...meetingData } = body;

    const meeting = await prisma.meeting.create({
      data: {
        ...meetingData,
        organizationId: orgId,
        createdBy: payload.sub,
        startAt: new Date(meetingData.startAt),
        endAt: meetingData.endAt ? new Date(meetingData.endAt) : undefined,
        contacts: contactIds?.length
          ? { create: contactIds.map((contactId) => ({ contactId })) }
          : undefined,
      } as any,
      include: {
        contacts: { include: { contact: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    return reply.code(201).send(meeting);
  });

  // PATCH /api/v1/meetings/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;

    const existing = await prisma.meeting.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Meeting not found" });

    const updateData: any = { ...body };
    if (body.startAt) updateData.startAt = new Date(body.startAt);
    if (body.endAt) updateData.endAt = new Date(body.endAt);
    delete updateData.contactIds;

    const meeting = await prisma.meeting.update({ where: { id }, data: updateData });
    return meeting;
  });

  // DELETE /api/v1/meetings/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.meeting.delete({ where: { id } });
    return reply.code(204).send();
  });
}
