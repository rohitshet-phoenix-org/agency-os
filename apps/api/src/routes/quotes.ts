import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const QuoteItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
});

const CreateQuoteSchema = z.object({
  title: z.string().min(1),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  status: z.enum(["DRAFT","SENT","ACCEPTED","DECLINED","EXPIRED"]).default("DRAFT"),
  validUntil: z.string().optional(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  items: z.array(QuoteItemSchema).default([]),
});

function calcTotals(items: z.infer<typeof QuoteItemSchema>[]) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return { subtotal, tax: 0, total: subtotal };
}

async function nextQuoteNumber(orgId: string): Promise<string> {
  const count = await prisma.quote.count({ where: { organizationId: orgId } });
  return `Q-${String(count + 1).padStart(4, "0")}`;
}

export async function quotesRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/quotes
  app.get("/", auth, async (req) => {
    const { orgId, status, dealId, contactId, page = "1", limit = "50" } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (dealId) where.dealId = dealId;
    if (contactId) where.contactId = contactId;

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          deal: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.quote.count({ where }),
    ]);

    return { quotes, total, page: Number(page), limit: Number(limit) };
  });

  // GET /api/v1/quotes/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        deal: true,
        contact: true,
        items: { include: { product: true } },
      },
    });
    if (!quote) return reply.code(404).send({ error: "Quote not found" });
    return quote;
  });

  // POST /api/v1/quotes
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateQuoteSchema.parse(data);
    const { items, ...quoteData } = body;
    const { subtotal, tax, total } = calcTotals(items);
    const number = await nextQuoteNumber(orgId);

    const quote = await prisma.quote.create({
      data: {
        ...quoteData,
        organizationId: orgId,
        number,
        subtotal,
        tax,
        total,
        validUntil: quoteData.validUntil ? new Date(quoteData.validUntil) : undefined,
        items: {
          create: items.map((item) => ({
            ...item,
            total: item.quantity * item.unitPrice,
          })),
        },
      } as any,
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return reply.code(201).send(quote);
  });

  // PATCH /api/v1/quotes/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;

    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Quote not found" });

    const { items, ...updateData } = body;
    if (updateData.validUntil) updateData.validUntil = new Date(updateData.validUntil);

    // If items are provided, replace them
    if (items) {
      const { subtotal, tax, total } = calcTotals(items);
      await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
      await prisma.quoteItem.createMany({
        data: items.map((item: any) => ({
          quoteId: id,
          ...item,
          total: item.quantity * item.unitPrice,
        })),
      });
      updateData.subtotal = subtotal;
      updateData.tax = tax;
      updateData.total = total;
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return quote;
  });

  // DELETE /api/v1/quotes/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.quote.delete({ where: { id } });
    return reply.code(204).send();
  });
}
