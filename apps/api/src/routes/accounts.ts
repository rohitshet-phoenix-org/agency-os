import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  website: z.string().optional(),
  industry: z.string().optional(),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  employees: z.number().int().optional(),
  revenue: z.number().optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
});

export async function accountsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/accounts
  app.get("/", auth, async (req) => {
    const { orgId, search, page = "1", limit = "50" } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (search) where.OR = [
      { name: { contains: search } },
      { industry: { contains: search } },
    ];

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          _count: { select: { contacts: true, deals: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.account.count({ where }),
    ]);

    return { accounts, total, page: Number(page), limit: Number(limit) };
  });

  // GET /api/v1/accounts/:id
  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        contacts: { select: { id: true, firstName: true, lastName: true, email: true, title: true } },
        deals: { select: { id: true, name: true, stage: true, value: true, expectedCloseDate: true } },
      },
    });
    if (!account) return reply.code(404).send({ error: "Account not found" });
    return account;
  });

  // POST /api/v1/accounts
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateAccountSchema.parse(data);

    const account = await prisma.account.create({
      data: { ...body, organizationId: orgId } as any,
    });
    return reply.code(201).send(account);
  });

  // PATCH /api/v1/accounts/:id
  app.patch("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Partial<z.infer<typeof CreateAccountSchema>>;

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Account not found" });

    const account = await prisma.account.update({ where: { id }, data: body as any });
    return account;
  });

  // DELETE /api/v1/accounts/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.account.delete({ where: { id } });
    return reply.code(204).send();
  });
}
