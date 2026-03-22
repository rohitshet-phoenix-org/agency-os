import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "@agency-os/db";

// Routes
import { authRoutes } from "./routes/auth.js";
import { usersRoutes } from "./routes/users.js";
import { leadsRoutes } from "./routes/leads.js";
import { clientsRoutes } from "./routes/clients.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { projectsRoutes } from "./routes/projects.js";
import { tasksRoutes } from "./routes/tasks.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { reportsRoutes } from "./routes/reports.js";
import { socialRoutes } from "./routes/social.js";
import { emailRoutes } from "./routes/email.js";
import { seoRoutes } from "./routes/seo.js";
import { adsRoutes } from "./routes/ads.js";
import { billingRoutes } from "./routes/billing.js";
import { approvalsRoutes } from "./routes/approvals.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { webhooksRoutes } from "./routes/webhooks.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
    },
  });

  // ── Plugins ──────────────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });
  await app.register(jwt, {
    secret: process.env["JWT_SECRET"] ?? "change-me-in-production",
    sign: { expiresIn: "7d" },
  });

  // ── Decorators ───────────────────────────────────────────────────────
  app.decorate("prisma", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  // Auth decorator — verifies JWT on protected routes
  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  // ── Health check ─────────────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  // ── Routes ───────────────────────────────────────────────────────────
  const API = "/api/v1";

  await app.register(authRoutes,          { prefix: `${API}/auth` });
  await app.register(usersRoutes,         { prefix: `${API}/users` });
  await app.register(leadsRoutes,         { prefix: `${API}/leads` });
  await app.register(clientsRoutes,       { prefix: `${API}/clients` });
  await app.register(onboardingRoutes,    { prefix: `${API}/onboarding` });
  await app.register(projectsRoutes,      { prefix: `${API}/projects` });
  await app.register(tasksRoutes,         { prefix: `${API}/tasks` });
  await app.register(analyticsRoutes,     { prefix: `${API}/analytics` });
  await app.register(reportsRoutes,       { prefix: `${API}/reports` });
  await app.register(socialRoutes,        { prefix: `${API}/social` });
  await app.register(emailRoutes,         { prefix: `${API}/email` });
  await app.register(seoRoutes,           { prefix: `${API}/seo` });
  await app.register(adsRoutes,           { prefix: `${API}/ads` });
  await app.register(billingRoutes,       { prefix: `${API}/billing` });
  await app.register(approvalsRoutes,     { prefix: `${API}/approvals` });
  await app.register(notificationsRoutes, { prefix: `${API}/notifications` });
  await app.register(webhooksRoutes,      { prefix: `${API}/webhooks` });

  return app;
}
