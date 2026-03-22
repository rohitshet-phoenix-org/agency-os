import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import bcrypt from "bcryptjs";

export async function clientsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/clients?orgId=
  app.get("/", auth, async (req) => {
    const { orgId, search, isActive } = req.query as Record<string, string>;
    const where: any = { organizationId: orgId };
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];

    return prisma.client.findMany({
      where,
      include: {
        onboarding: { select: { status: true } },
        _count: { select: { projects: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  // GET /api/v1/clients/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        onboarding: { include: { checklist: true, responses: true } },
        projects: { orderBy: { createdAt: "desc" } },
        assets: true,
        credentials: true,
        tags: { include: { tag: true } },
        _count: { select: { invoices: true } },
      },
    });
    if (!client) return reply.code(404).send({ error: "Client not found" });
    // Never expose portal password
    const { portalPassword: _, ...safe } = client as any;
    return safe;
  });

  // POST /api/v1/clients
  app.post("/", auth, async (req, reply) => {
    const body = req.body as any;
    const client = await prisma.client.create({
      data: {
        organizationId: body.orgId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        website: body.website,
        industry: body.industry,
        contractValue: body.contractValue,
        billingCycle: body.billingCycle ?? "MONTHLY",
        startDate: body.startDate ? new Date(body.startDate) : undefined,
      },
    });

    // Auto-create onboarding
    await prisma.onboarding.create({
      data: {
        clientId: client.id,
        checklist: {
          createMany: {
            data: [
              { title: "Collect brand assets (logo, colors, fonts)", order: 1 },
              { title: "Set up Google Analytics 4 access", order: 2 },
              { title: "Set up Google Ads access", order: 3 },
              { title: "Set up Meta Ads access", order: 4 },
              { title: "Set up social media accounts access", order: 5 },
              { title: "Complete brand questionnaire", order: 6 },
              { title: "Define KPIs and goals", order: 7 },
              { title: "Schedule kickoff meeting", order: 8 },
            ],
          },
        },
      },
    });

    return reply.code(201).send(client);
  });

  // PATCH /api/v1/clients/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    if (body.portalPassword) {
      body.portalPassword = await bcrypt.hash(body.portalPassword, 12);
    }
    const client = await prisma.client.update({ where: { id }, data: body });
    return client;
  });

  // DELETE /api/v1/clients/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.client.update({ where: { id }, data: { isActive: false } });
    return reply.code(204).send();
  });

  // POST /api/v1/clients/:id/assets
  app.post("/:id/assets", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const asset = await prisma.clientAsset.create({
      data: { clientId: id, name: body.name, type: body.type, url: body.url, mimeType: body.mimeType },
    });
    return reply.code(201).send(asset);
  });

  // GET /api/v1/clients/:id/assets
  app.get("/:id/assets", auth, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.clientAsset.findMany({ where: { clientId: id } });
  });

  // POST /api/v1/clients/:id/credentials
  app.post("/:id/credentials", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const cred = await prisma.clientCredential.create({
      data: { clientId: id, platform: body.platform, label: body.label, username: body.username, notes: body.notes },
    });
    return reply.code(201).send(cred);
  });
}
