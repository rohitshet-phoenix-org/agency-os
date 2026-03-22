import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { nanoid } from "nanoid";

export async function webhooksRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/", auth, async (req) => {
    const { orgId } = req.query as { orgId: string };
    return prisma.webhook.findMany({
      where: { organizationId: orgId },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true },
    });
  });

  app.post("/", auth, async (req, reply) => {
    const body = req.body as any;
    const webhook = await prisma.webhook.create({
      data: {
        organizationId: body.orgId,
        url: body.url,
        events: body.events,
        secret: nanoid(32),
      },
      select: { id: true, url: true, events: true, secret: true, createdAt: true },
    });
    return reply.code(201).send(webhook);
  });

  app.patch("/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    return prisma.webhook.update({ where: { id }, data: body });
  });

  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.webhook.delete({ where: { id } });
    return reply.code(204).send();
  });
}
