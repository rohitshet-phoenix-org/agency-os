import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z.number().min(0),
  currency: z.string().default("USD"),
  isActive: z.boolean().default(true),
});

export async function productsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/products
  app.get("/", auth, async (req) => {
    const { orgId, search, isActive } = req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) where.OR = [
      { name: { contains: search } },
      { category: { contains: search } },
    ];

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return { products, total: products.length };
  });

  // GET /api/v1/products/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return reply.code(404).send({ error: "Product not found" });
    return product;
  });

  // POST /api/v1/products
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateProductSchema.parse(data);

    const product = await prisma.product.create({
      data: { ...body, organizationId: orgId } as any,
    });
    return reply.code(201).send(product);
  });

  // PATCH /api/v1/products/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Partial<z.infer<typeof CreateProductSchema>>;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Product not found" });

    const product = await prisma.product.update({ where: { id }, data: body as any });
    return product;
  });

  // DELETE /api/v1/products/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.product.delete({ where: { id } });
    return reply.code(204).send();
  });
}
