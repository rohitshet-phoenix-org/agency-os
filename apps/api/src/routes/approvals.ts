import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";

export async function approvalsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/", auth, async (req) => {
    const { clientId, status } = req.query as Record<string, string>;
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    return prisma.approval.findMany({
      where,
      include: { client: { select: { name: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const approval = await prisma.approval.findUnique({ where: { id }, include: { client: true, socialPost: true } });
    if (!approval) return reply.code(404).send({ error: "Approval not found" });
    return approval;
  });

  app.post("/", auth, async (req, reply) => {
    const body = req.body as any;
    const approval = await prisma.approval.create({
      data: {
        clientId: body.clientId,
        title: body.title,
        description: body.description,
        type: body.type,
        fileUrl: body.fileUrl,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });
    return reply.code(201).send(approval);
  });

  // PATCH /api/v1/approvals/:id/review — client reviews an approval
  app.patch("/:id/review", async (req, reply) => {
    // No JWT required for client portal — use portal token
    const { id } = req.params as { id: string };
    const { status, feedback } = req.body as { status: "APPROVED" | "REJECTED"; feedback?: string };

    const approval = await prisma.approval.update({
      where: { id },
      data: { status, feedback, reviewedAt: new Date() },
    });

    // If it was a social post, update post status accordingly
    if (approval.socialPost) {
      await prisma.socialPost.update({
        where: { approvalId: id },
        data: { status: status === "APPROVED" ? "APPROVED" : "DRAFT" },
      });
    }

    return approval;
  });

  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.approval.delete({ where: { id } });
    return reply.code(204).send();
  });
}
