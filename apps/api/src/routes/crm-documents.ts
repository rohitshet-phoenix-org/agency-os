import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { z } from "zod";

const CreateDocumentSchema = z.object({
  name: z.string().min(1),
  fileType: z.string().optional(),
  url: z.string().min(1),
  sizeBytes: z.number().int().optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  accountId: z.string().optional(),
});

export async function crmDocumentsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/crm-documents
  app.get("/", auth, async (req) => {
    const { orgId, leadId, contactId, dealId, accountId, page = "1", limit = "50" } =
      req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (leadId) where.leadId = leadId;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (accountId) where.accountId = accountId;

    const [documents, total] = await Promise.all([
      prisma.crmDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.crmDocument.count({ where }),
    ]);

    return { documents, total, page: Number(page), limit: Number(limit) };
  });

  // POST /api/v1/crm-documents
  app.post("/", auth, async (req, reply) => {
    const { orgId, ...data } = req.body as any;
    const body = CreateDocumentSchema.parse(data);
    const payload = req.user as { sub: string };

    const doc = await prisma.crmDocument.create({
      data: { ...body, organizationId: orgId, uploadedBy: payload.sub } as any,
    });
    return reply.code(201).send(doc);
  });

  // DELETE /api/v1/crm-documents/:id
  app.delete("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.crmDocument.delete({ where: { id } });
    return reply.code(204).send();
  });
}
