import type { FastifyInstance } from "fastify";
import { prisma } from "@agency-os/db";
import { reportQueue } from "../jobs/queues.js";

export async function reportsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/", auth, async (req) => {
    const { clientId, period } = req.query as Record<string, string>;
    const where: any = { clientId };
    if (period) where.period = period;
    return prisma.report.findMany({ where, orderBy: { startDate: "desc" } });
  });

  app.get("/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.code(404).send({ error: "Report not found" });
    return report;
  });

  // POST /api/v1/reports/generate — queue a report generation job
  app.post("/generate", auth, async (req, reply) => {
    const { clientId, period, startDate, endDate, templateId, orgId } = req.body as any;

    const job = await reportQueue.add("generate-report", {
      clientId,
      orgId,
      period,
      startDate,
      endDate,
      templateId,
    });

    return reply.code(202).send({ jobId: job.id, status: "queued" });
  });

  // GET /api/v1/reports/templates?orgId=
  app.get("/templates", auth, async (req) => {
    const { orgId } = req.query as { orgId: string };
    return prisma.reportTemplate.findMany({ where: { organizationId: orgId } });
  });

  // POST /api/v1/reports/templates
  app.post("/templates", auth, async (req, reply) => {
    const body = req.body as any;
    const tpl = await prisma.reportTemplate.create({
      data: { organizationId: body.orgId, name: body.name, config: body.config },
    });
    return reply.code(201).send(tpl);
  });

  // POST /api/v1/reports/:id/send — email report to client
  app.post("/:id/send", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await reportQueue.add("send-report", { reportId: id });
    await prisma.report.update({ where: { id }, data: { sentAt: new Date() } });
    return reply.code(202).send({ status: "sending" });
  });
}
