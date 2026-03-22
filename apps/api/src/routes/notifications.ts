import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";

export async function notificationsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/", auth, async (req) => {
    const payload = req.user as { sub: string };
    const { unread } = req.query as { unread?: string };
    const where: any = { userId: payload.sub };
    if (unread === "true") where.isRead = false;

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  app.patch("/:id/read", auth, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  });

  app.patch("/read-all", auth, async (req) => {
    const payload = req.user as { sub: string };
    await prisma.notification.updateMany({ where: { userId: payload.sub, isRead: false }, data: { isRead: true } });
    return { success: true };
  });

  app.get("/unread-count", auth, async (req) => {
    const payload = req.user as { sub: string };
    const count = await prisma.notification.count({ where: { userId: payload.sub, isRead: false } });
    return { count };
  });
}
