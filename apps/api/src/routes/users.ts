import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";

export async function usersRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/", auth, async (req) => {
    const { orgId } = req.query as { orgId: string };
    return prisma.organizationUser.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, isActive: true, lastLoginAt: true } } },
    });
  });

  app.patch("/:id/role", auth, async (req) => {
    const { id } = req.params as { id: string };
    const { orgId, role } = req.body as { orgId: string; role: string };
    return prisma.organizationUser.update({
      where: { organizationId_userId: { organizationId: orgId, userId: id } },
      data: { role: role as any },
    });
  });

  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { orgId } = req.query as { orgId: string };
    await prisma.organizationUser.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: id } },
    });
    return reply.code(204).send();
  });
}
