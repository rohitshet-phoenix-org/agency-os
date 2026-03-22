import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";

export async function projectsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/", auth, async (req) => {
    const { orgId, clientId, status } = req.query as Record<string, string>;
    const where: any = { organizationId: orgId };
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    return prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, company: true, logo: true } },
        _count: { select: { tasks: true, milestones: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
            _count: { select: { subtasks: true, comments: true } },
          },
          orderBy: [{ status: "asc" }, { order: "asc" }],
        },
        milestones: { orderBy: { dueDate: "asc" } },
        tags: { include: { tag: true } },
      },
    });
    if (!project) return reply.code(404).send({ error: "Project not found" });
    return project;
  });

  app.post("/", auth, async (req, reply) => {
    const body = req.body as any;
    const project = await prisma.project.create({
      data: {
        organizationId: body.orgId,
        clientId: body.clientId,
        name: body.name,
        description: body.description,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    return reply.code(201).send(project);
  });

  app.patch("/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    return prisma.project.update({ where: { id }, data: body });
  });

  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.project.update({ where: { id }, data: { status: "CANCELLED" } });
    return reply.code(204).send();
  });

  // GET /api/v1/projects/:id/stats
  app.get("/:id/stats", auth, async (req) => {
    const { id } = req.params as { id: string };
    const [total, byStatus, timeEntries] = await Promise.all([
      prisma.task.count({ where: { projectId: id } }),
      prisma.task.groupBy({ by: ["status"], where: { projectId: id }, _count: true }),
      prisma.timeEntry.aggregate({
        where: { task: { projectId: id } },
        _sum: { durationMin: true },
      }),
    ]);
    return {
      totalTasks: total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      totalHours: ((timeEntries._sum.durationMin ?? 0) / 60).toFixed(1),
    };
  });
}
