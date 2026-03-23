import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { nanoid } from "nanoid";
import { prisma as db } from "@agency-os/db";
import { constructStripeWebhookEvent } from "../services/stripe.js";

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

  // ── Stripe Webhook (no auth — verified by signature) ──────────────────
  app.post("/stripe", {
    config: { rawBody: true },
  }, async (req, reply) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (!webhookSecret || !sig) return reply.code(400).send({ error: "Missing signature" });

    let event: any;
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new (Stripe as any)(process.env["STRIPE_SECRET_KEY"] ?? "", {
        apiVersion: "2025-01-27.acacia",
      });
      event = constructStripeWebhookEvent(stripe, (req as any).rawBody ?? req.body as any, sig, webhookSecret);
    } catch (err: any) {
      return reply.code(400).send({ error: `Webhook error: ${err.message}` });
    }

    // Handle events
    switch (event.type) {
      case "invoice.payment_succeeded": {
        const stripeInv = event.data.object;
        // Find local invoice by Stripe customer email and update to PAID
        await db.invoice.updateMany({
          where: { status: "SENT", total: stripeInv.amount_paid / 100 },
          data: { status: "PAID", paidAt: new Date() },
        });
        break;
      }
      case "invoice.payment_failed": {
        const stripeInv = event.data.object;
        await db.invoice.updateMany({
          where: { status: "SENT", total: stripeInv.amount_due / 100 },
          data: { status: "OVERDUE" },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { isActive: false },
        });
        break;
      }
    }

    return { received: true };
  });
}
