import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";

export async function onboardingRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/:clientId", auth, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const onboarding = await prisma.onboarding.findUnique({
      where: { clientId },
      include: { checklist: { orderBy: { order: "asc" } }, responses: true },
    });
    if (!onboarding) return reply.code(404).send({ error: "Onboarding not found" });
    return onboarding;
  });

  // PATCH /api/v1/onboarding/:clientId/items/:itemId
  app.patch("/:clientId/items/:itemId", auth, async (req) => {
    const { itemId } = req.params as { clientId: string; itemId: string };
    const { isCompleted } = req.body as { isCompleted: boolean };
    const item = await prisma.onboardingItem.update({
      where: { id: itemId },
      data: { isCompleted, completedAt: isCompleted ? new Date() : null },
    });

    // Check if all required items are complete — auto-complete onboarding
    const { onboardingId } = item;
    const pending = await prisma.onboardingItem.count({
      where: { onboardingId, isRequired: true, isCompleted: false },
    });

    if (pending === 0) {
      await prisma.onboarding.update({
        where: { id: onboardingId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    return item;
  });

  // POST /api/v1/onboarding/:clientId/responses
  app.post("/:clientId/responses", auth, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const { responses } = req.body as { responses: { question: string; answer: string }[] };
    const onboarding = await prisma.onboarding.findUnique({ where: { clientId } });
    if (!onboarding) return reply.code(404).send({ error: "Onboarding not found" });

    const saved = await prisma.$transaction(
      responses.map((r) =>
        prisma.questionnaireResponse.upsert({
          where: { id: `${onboarding.id}-${Buffer.from(r.question).toString("base64").slice(0, 10)}` },
          create: { onboardingId: onboarding.id, question: r.question, answer: r.answer, answeredAt: new Date() },
          update: { answer: r.answer, answeredAt: new Date() },
        })
      )
    );

    return reply.code(201).send(saved);
  });

  // Add custom onboarding item
  app.post("/:clientId/items", auth, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const body = req.body as any;
    const onboarding = await prisma.onboarding.findUnique({ where: { clientId } });
    if (!onboarding) return reply.code(404).send({ error: "Onboarding not found" });

    const item = await prisma.onboardingItem.create({
      data: {
        onboardingId: onboarding.id,
        title: body.title,
        description: body.description,
        isRequired: body.isRequired ?? true,
        order: body.order ?? 99,
      },
    });
    return reply.code(201).send(item);
  });
}
