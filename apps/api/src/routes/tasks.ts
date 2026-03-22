import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";

export async function tasksRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/", auth, async (req) => {
    const { projectId, assigneeId, status, priority } = req.query as Record<string, string>;
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    where.parentId = null; // top-level only

    return prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        subtasks: { select: { id: true, title: true, status: true } },
        _count: { select: { comments: true, timeEntries: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  });

  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        creator: { select: { id: true, name: true, avatar: true } },
        subtasks: { include: { assignee: { select: { id: true, name: true, avatar: true } } } },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: "asc" },
        },
        timeEntries: { include: { user: { select: { id: true, name: true } } }, orderBy: { startedAt: "desc" } },
        attachments: true,
      },
    });
    if (!task) return reply.code(404).send({ error: "Task not found" });
    return task;
  });

  app.post("/", auth, async (req, reply) => {
    const body = req.body as any;
    const payload = req.user as { sub: string };
    const task = await prisma.task.create({
      data: {
        projectId: body.projectId,
        parentId: body.parentId,
        title: body.title,
        description: body.description,
        status: body.status ?? "TODO",
        priority: body.priority ?? "MEDIUM",
        assigneeId: body.assigneeId,
        creatorId: payload.sub,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        estimatedHrs: body.estimatedHrs,
        isQaRequired: body.isQaRequired ?? false,
      },
    });
    return reply.code(201).send(task);
  });

  app.patch("/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    if (body.status === "DONE" && !body.completedAt) body.completedAt = new Date();
    return prisma.task.update({ where: { id }, data: body });
  });

  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.task.update({ where: { id }, data: { status: "CANCELLED" } });
    return reply.code(204).send();
  });

  // POST /api/v1/tasks/:id/comments
  app.post("/:id/comments", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { body: string };
    const payload = req.user as { sub: string };
    const comment = await prisma.comment.create({
      data: { taskId: id, userId: payload.sub, body: body.body },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    return reply.code(201).send(comment);
  });

  // POST /api/v1/tasks/:id/time-entries
  app.post("/:id/time-entries", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const payload = req.user as { sub: string };
    const entry = await prisma.timeEntry.create({
      data: {
        taskId: id,
        userId: payload.sub,
        description: body.description,
        startedAt: new Date(body.startedAt),
        stoppedAt: body.stoppedAt ? new Date(body.stoppedAt) : undefined,
        durationMin: body.durationMin,
      },
    });
    return reply.code(201).send(entry);
  });

  // PATCH /api/v1/tasks/:id/reorder
  app.patch("/:id/reorder", auth, async (req) => {
    const { id } = req.params as { id: string };
    const { order } = req.body as { order: number };
    return prisma.task.update({ where: { id }, data: { order } });
  });
}
