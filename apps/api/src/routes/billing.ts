import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { nanoid } from "nanoid";
import { getIntegration } from "../services/integrations.js";
import {
  createStripeClient,
  getOrCreateCustomer,
  createStripeInvoice,
  finalizeAndSendStripeInvoice,
  createPaymentLink,
} from "../services/stripe.js";

export async function billingRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // ── Invoices ──────────────────────────────────────────────────────────
  app.get("/invoices", auth, async (req) => {
    const { orgId, clientId, status } = req.query as Record<string, string>;
    const where: any = { organizationId: orgId };
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    return prisma.invoice.findMany({
      where,
      include: {
        client: { select: { name: true, company: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/invoices/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lineItems: true, payments: true },
    });
    if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
    return invoice;
  });

  app.post("/invoices", auth, async (req, reply) => {
    const body = req.body as any;
    const lineItems = body.lineItems ?? [];
    const subtotal = lineItems.reduce((sum: number, i: any) => sum + i.quantity * i.unitPrice, 0);
    const tax = body.tax ?? 0;
    const total = subtotal + tax;
    const currency = body.currency ?? "USD";
    const number = `INV-${Date.now().toString(36).toUpperCase()}`;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: body.orgId,
        clientId: body.clientId,
        number,
        currency,
        subtotal,
        tax,
        total,
        dueDate: new Date(body.dueDate),
        notes: body.notes,
        status: "DRAFT",
        lineItems: { createMany: { data: lineItems.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.quantity * i.unitPrice })) } },
      },
      include: { lineItems: true, client: true },
    });

    // ── Stripe: create invoice mirror if connected ────────────────────────
    try {
      const stripeInt = await getIntegration(body.orgId, "stripe");
      if (stripeInt && (invoice as any).client) {
        const client = (invoice as any).client as { name: string; email: string };
        const stripe = createStripeClient(stripeInt.credentials["secretKey"]!);
        const customer = await getOrCreateCustomer(stripe, client.email, client.name, {
          agencyOsClientId: invoice.clientId ?? "",
        });
        await createStripeInvoice(
          stripe,
          customer.id,
          lineItems.map((i: any) => ({
            description: i.description,
            amount: i.quantity * i.unitPrice,
            currency,
          })),
          new Date(body.dueDate)
        );
      }
    } catch {
      // Stripe sync is best-effort; don't fail the local invoice creation
    }

    return reply.code(201).send(invoice);
  });

  app.patch("/invoices/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    if (body.status === "PAID" && !body.paidAt) body.paidAt = new Date();
    return prisma.invoice.update({ where: { id }, data: body });
  });

  // POST /api/v1/billing/invoices/:id/send
  app.post("/invoices/:id/send", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { orgId } = req.body as { orgId?: string };

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!invoice) return reply.code(404).send({ error: "Invoice not found" });

    await prisma.invoice.update({ where: { id }, data: { status: "SENT" } });

    let paymentUrl: string | null = null;

    // ── Stripe: finalize & send via Stripe if connected ──────────────────
    if (orgId) {
      try {
        const stripeInt = await getIntegration(orgId, "stripe");
        if (stripeInt && invoice.client) {
          const stripe = createStripeClient(stripeInt.credentials["secretKey"]!);
          const customer = await getOrCreateCustomer(
            stripe,
            invoice.client.email,
            invoice.client.name
          );
          const stripeInvoices = await stripe.invoices.list({ customer: customer.id, limit: 10 });
          const matching = stripeInvoices.data.find((si) => si.status === "draft");
          if (matching) {
            const sent = await finalizeAndSendStripeInvoice(stripe, matching.id);
            paymentUrl = await createPaymentLink(stripe, sent.id);
          }
        }
      } catch {
        // best-effort
      }
    }

    return reply.code(202).send({ status: "sent", paymentUrl });
  });

  // POST /api/v1/billing/invoices/:id/payments
  app.post("/invoices/:id/payments", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const payment = await prisma.payment.create({
      data: { invoiceId: id, amount: body.amount, method: body.method, reference: body.reference, notes: body.notes },
    });
    await prisma.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
    return reply.code(201).send(payment);
  });

  // ── Revenue Dashboard ─────────────────────────────────────────────────
  app.get("/dashboard", auth, async (req) => {
    const { orgId } = req.query as { orgId: string };

    const [mrr, overdue, paidThisMonth, outstanding] = await Promise.all([
      // MRR from active subscriptions
      prisma.subscription.aggregate({ where: { isActive: true }, _sum: { amount: true } }),
      // Overdue invoices
      prisma.invoice.findMany({
        where: { organizationId: orgId, status: "OVERDUE" },
        include: { client: { select: { name: true, company: true } } },
      }),
      // Paid this month
      prisma.invoice.aggregate({
        where: {
          organizationId: orgId,
          status: "PAID",
          paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { total: true },
      }),
      // Outstanding
      prisma.invoice.aggregate({
        where: { organizationId: orgId, status: { in: ["SENT", "OVERDUE"] } },
        _sum: { total: true },
      }),
    ]);

    return {
      mrr: mrr._sum.amount ?? 0,
      paidThisMonth: paidThisMonth._sum.total ?? 0,
      outstandingAmount: outstanding._sum.total ?? 0,
      overdueInvoices: overdue,
    };
  });

  // GET /api/v1/billing/subscriptions?orgId=
  app.get("/subscriptions", auth, async (req) => {
    const { orgId } = req.query as { orgId: string };
    return prisma.subscription.findMany({
      where: { client: { organizationId: orgId } },
    });
  });

  app.post("/subscriptions", auth, async (req, reply) => {
    const body = req.body as any;
    const sub = await prisma.subscription.upsert({
      where: { clientId: body.clientId },
      create: { clientId: body.clientId, planName: body.planName, amount: body.amount, billingCycle: body.billingCycle, nextBillingAt: body.nextBillingAt ? new Date(body.nextBillingAt) : undefined },
      update: { planName: body.planName, amount: body.amount, billingCycle: body.billingCycle, isActive: true },
    });
    return reply.code(201).send(sub);
  });
}
