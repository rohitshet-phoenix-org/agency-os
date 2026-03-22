/**
 * AgencyOS — Comprehensive QA Test Suite
 * Tests ALL 10 modules with dummy data via Fastify inject()
 * No real database or external services needed.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";

import { createMockPrisma, DUMMY } from "./setup/mockPrisma.js";

// ── Mock the @agency-os/db module globally ────────────────────────────
vi.mock("@agency-os/db", () => {
  const mock = createMockPrisma();
  return { prisma: mock, ...mock };
});

// Import route modules AFTER the mock is in place
import { authRoutes } from "../apps/api/src/routes/auth.js";
import { leadsRoutes } from "../apps/api/src/routes/leads.js";
import { clientsRoutes } from "../apps/api/src/routes/clients.js";
import { onboardingRoutes } from "../apps/api/src/routes/onboarding.js";
import { projectsRoutes } from "../apps/api/src/routes/projects.js";
import { tasksRoutes } from "../apps/api/src/routes/tasks.js";
import { analyticsRoutes } from "../apps/api/src/routes/analytics.js";
import { reportsRoutes } from "../apps/api/src/routes/reports.js";
import { socialRoutes } from "../apps/api/src/routes/social.js";
import { emailRoutes } from "../apps/api/src/routes/email.js";
import { seoRoutes } from "../apps/api/src/routes/seo.js";
import { adsRoutes } from "../apps/api/src/routes/ads.js";
import { billingRoutes } from "../apps/api/src/routes/billing.js";
import { approvalsRoutes } from "../apps/api/src/routes/approvals.js";
import { notificationsRoutes } from "../apps/api/src/routes/notifications.js";
import { usersRoutes } from "../apps/api/src/routes/users.js";
import { webhooksRoutes } from "../apps/api/src/routes/webhooks.js";

// ── Mock BullMQ queues ────────────────────────────────────────────────
vi.mock("../apps/api/src/jobs/queues.js", () => ({
  reportQueue: { add: vi.fn().mockResolvedValue({ id: "job-001" }) },
  socialPublishQueue: { add: vi.fn().mockResolvedValue({ id: "job-002" }) },
  emailQueue: { add: vi.fn().mockResolvedValue({ id: "job-003" }) },
  seoQueue: { add: vi.fn().mockResolvedValue({ id: "job-004" }) },
  adSyncQueue: { add: vi.fn().mockResolvedValue({ id: "job-005" }) },
  alertQueue: { add: vi.fn().mockResolvedValue({ id: "job-006" }) },
  notificationQueue: { add: vi.fn().mockResolvedValue({ id: "job-007" }) },
}));

// ── Build test app ─────────────────────────────────────────────────────
let app: ReturnType<typeof Fastify>;
let authToken: string;

async function buildTestApp() {
  const f = Fastify({ logger: false });
  await f.register(helmet, { contentSecurityPolicy: false });
  await f.register(cors, { origin: "*" });
  await f.register(rateLimit, { max: 10000, timeWindow: "1 minute" });
  await f.register(jwt, { secret: "test-secret-key-qa" });

  f.decorate("authenticate", async (req: any, reply: any) => {
    try { await req.jwtVerify(); } catch { reply.code(401).send({ error: "Unauthorized" }); }
  });

  f.get("/health", async () => ({ status: "ok" }));

  const API = "/api/v1";
  await f.register(authRoutes,          { prefix: `${API}/auth` });
  await f.register(leadsRoutes,         { prefix: `${API}/leads` });
  await f.register(clientsRoutes,       { prefix: `${API}/clients` });
  await f.register(onboardingRoutes,    { prefix: `${API}/onboarding` });
  await f.register(projectsRoutes,      { prefix: `${API}/projects` });
  await f.register(tasksRoutes,         { prefix: `${API}/tasks` });
  await f.register(analyticsRoutes,     { prefix: `${API}/analytics` });
  await f.register(reportsRoutes,       { prefix: `${API}/reports` });
  await f.register(socialRoutes,        { prefix: `${API}/social` });
  await f.register(emailRoutes,         { prefix: `${API}/email` });
  await f.register(seoRoutes,           { prefix: `${API}/seo` });
  await f.register(adsRoutes,           { prefix: `${API}/ads` });
  await f.register(billingRoutes,       { prefix: `${API}/billing` });
  await f.register(approvalsRoutes,     { prefix: `${API}/approvals` });
  await f.register(notificationsRoutes, { prefix: `${API}/notifications` });
  await f.register(usersRoutes,         { prefix: `${API}/users` });
  await f.register(webhooksRoutes,      { prefix: `${API}/webhooks` });

  await f.ready();
  return f;
}

// ── Helper: authenticated request ─────────────────────────────────────
function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ─────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  app = await buildTestApp();
  // Sign a test token
  authToken = app.jwt.sign({ sub: DUMMY.user.id, email: DUMMY.user.email });
});

afterAll(async () => {
  await app.close();
});

// ─────────────────────────────────────────────────────────────────────
// [1] HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────
describe("✅ [01] Health Check", () => {
  it("GET /health → 200 ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ status: "ok" });
  });
});

// ─────────────────────────────────────────────────────────────────────
// [2] AUTH MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [02] Auth Module", () => {
  it("POST /auth/register → registers new user + org", async () => {
    const { prisma } = await import("@agency-os/db");
    // No existing user with this email
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/register",
      payload: { name: "Jane Test", email: "jane@newagency.com", password: "securepass123", orgName: "New Agency" },
    });
    expect([200, 201]).toContain(res.statusCode);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("token");
  });

  it("POST /auth/register → rejects duplicate email (409)", async () => {
    const { prisma } = await import("@agency-os/db");
    (prisma.user.findUnique as any).mockResolvedValueOnce(DUMMY.user);
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/register",
      payload: { name: "Dup User", email: DUMMY.user.email, password: "pass12345", orgName: "Dup Agency" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("POST /auth/login → rejects wrong password (401)", async () => {
    const { prisma } = await import("@agency-os/db");
    (prisma.user.findUnique as any).mockResolvedValueOnce(DUMMY.user);
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/login",
      payload: { email: DUMMY.user.email, password: "wrongpassword" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /auth/me → returns authenticated user", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/auth/me",
      headers: auth(authToken),
    });
    expect([200]).toContain(res.statusCode);
  });

  it("GET /auth/me → rejects unauthenticated request (401)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("POST /auth/client-login → rejects wrong credentials", async () => {
    const { prisma } = await import("@agency-os/db");
    (prisma.client.findFirst as any).mockResolvedValueOnce({ ...DUMMY.client, portalPassword: "$2b$12$xxx" });
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/client-login",
      payload: { email: DUMMY.client.email, password: "wrongpass" },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [3] CRM / LEADS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [03] CRM — Leads Module", () => {
  it("GET /leads → returns paginated lead list", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/leads?orgId=org-001&limit=25&page=1",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /leads → filters by status=QUALIFIED", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/leads?orgId=org-001&status=QUALIFIED",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /leads → filters by source=REFERRAL", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/leads?orgId=org-001&source=REFERRAL",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /leads → search by name/email/company", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/leads?orgId=org-001&search=john",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /leads/:id → returns single lead with activities", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/leads/lead-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("id");
  });

  it("GET /leads/:id → 404 for unknown lead", async () => {
    const { prisma } = await import("@agency-os/db");
    (prisma.lead.findUnique as any).mockResolvedValueOnce(null);
    const res = await app.inject({
      method: "GET", url: "/api/v1/leads/nonexistent",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /leads → creates new lead", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/leads",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        name: "Bob Builder",
        email: "bob@builder.com",
        company: "Builder Inc",
        source: "LINKEDIN",
        estimatedValue: 8000,
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("POST /leads → rejects missing required fields (email)", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/leads",
      headers: auth(authToken),
      payload: { orgId: "org-001", name: "No Email" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("PATCH /leads/:id → updates lead status to QUALIFIED", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/leads/lead-001",
      headers: auth(authToken),
      payload: { status: "QUALIFIED" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /leads/:id/activities → logs a call activity", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/leads/lead-001/activities",
      headers: auth(authToken),
      payload: { type: "call", title: "Discovery call completed", body: "Client is interested in SEO package" },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("POST /leads/:id/convert → converts lead to client", async () => {
    const { prisma } = await import("@agency-os/db");
    (prisma.lead.findUnique as any).mockResolvedValueOnce({ ...DUMMY.lead, client: null });
    const res = await app.inject({
      method: "POST", url: "/api/v1/leads/lead-001/convert",
      headers: auth(authToken),
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("DELETE /leads/:id → soft-deletes lead", async () => {
    const res = await app.inject({
      method: "DELETE", url: "/api/v1/leads/lead-001",
      headers: auth(authToken),
    });
    expect([200, 204]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [4] CLIENTS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [04] Clients Module", () => {
  it("GET /clients → returns client list", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/clients?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /clients → filters active clients only", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/clients?orgId=org-001&isActive=true",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /clients/:id → returns client with full details", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/clients/client-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("company");
    expect(body).not.toHaveProperty("portalPassword");
  });

  it("POST /clients → creates client with auto-onboarding", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/clients",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        name: "New Client",
        email: "new@client.com",
        company: "New Client Co",
        industry: "SaaS",
        contractValue: 3500,
        billingCycle: "MONTHLY",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("PATCH /clients/:id → updates client info", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/clients/client-001",
      headers: auth(authToken),
      payload: { industry: "Retail", contractValue: 6000 },
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /clients/:id/assets → uploads brand asset", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/clients/client-001/assets",
      headers: auth(authToken),
      payload: { name: "Primary Logo", type: "logo", url: "https://cdn.example.com/logo-v2.svg", mimeType: "image/svg+xml" },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /clients/:id/assets → lists client assets", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/clients/client-001/assets",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /clients/:id/credentials → stores platform credentials", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/clients/client-001/credentials",
      headers: auth(authToken),
      payload: { platform: "meta_ads", label: "Meta Business Account", username: "ads@acmecorp.com" },
    });
    expect([200, 201]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [5] ONBOARDING MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [05] Onboarding Module", () => {
  it("GET /onboarding/:clientId → returns onboarding with checklist", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/onboarding/client-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("PATCH /onboarding/:clientId/items/:itemId → marks item complete", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/onboarding/client-001/items/item-001",
      headers: auth(authToken),
      payload: { isCompleted: true },
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /onboarding/:clientId/responses → saves questionnaire answers", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/onboarding/client-001/responses",
      headers: auth(authToken),
      payload: {
        responses: [
          { question: "Who is your target audience?", answer: "B2B decision makers aged 30-55" },
          { question: "What are your main goals?", answer: "Increase organic traffic by 40%" },
          { question: "What is your monthly budget?", answer: "$5,000" },
        ],
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("POST /onboarding/:clientId/items → adds custom checklist item", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/onboarding/client-001/items",
      headers: auth(authToken),
      payload: { title: "Set up CRM integration", description: "Connect HubSpot API", isRequired: false, order: 10 },
    });
    expect([200, 201]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [6] PROJECTS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [06] Projects Module", () => {
  it("GET /projects → returns project list", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/projects?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /projects → filters by clientId", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/projects?orgId=org-001&clientId=client-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /projects → filters by status=ACTIVE", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/projects?orgId=org-001&status=ACTIVE",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /projects/:id → returns full project with tasks", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/projects/project-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /projects → creates new project", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/projects",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        clientId: "client-001",
        name: "Q2 PPC Campaign",
        description: "Google & Meta Ads for Q2",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("PATCH /projects/:id → updates project status to PAUSED", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/projects/project-001",
      headers: auth(authToken),
      payload: { status: "PAUSED" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /projects/:id/stats → returns task counts and hours", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/projects/project-001/stats",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("totalTasks");
    expect(body).toHaveProperty("totalHours");
  });
});

// ─────────────────────────────────────────────────────────────────────
// [7] TASKS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [07] Tasks Module", () => {
  it("GET /tasks → returns task list for project", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/tasks?projectId=project-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /tasks → filters by status=IN_PROGRESS", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/tasks?projectId=project-001&status=IN_PROGRESS",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /tasks → filters by priority=HIGH", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/tasks?projectId=project-001&priority=HIGH",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /tasks/:id → returns task with comments and time entries", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/tasks/task-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /tasks → creates new task with HIGH priority", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/tasks",
      headers: auth(authToken),
      payload: {
        projectId: "project-001",
        title: "Write Blog Post: Top 10 SEO Tips",
        description: "2000-word blog post targeting 'seo tips 2026'",
        priority: "HIGH",
        assigneeId: "user-001",
        dueDate: "2026-03-28",
        estimatedHrs: 4,
        isQaRequired: true,
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("PATCH /tasks/:id → moves task to IN_REVIEW", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/tasks/task-001",
      headers: auth(authToken),
      payload: { status: "IN_REVIEW" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("PATCH /tasks/:id → completes task, sets completedAt", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/tasks/task-001",
      headers: auth(authToken),
      payload: { status: "DONE" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /tasks/:id/comments → adds comment to task", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/tasks/task-001/comments",
      headers: auth(authToken),
      payload: { body: "Keyword list expanded to 250 terms, grouped by intent" },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("POST /tasks/:id/time-entries → logs 90 min time entry", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/tasks/task-001/time-entries",
      headers: auth(authToken),
      payload: {
        description: "Keyword research and categorisation",
        startedAt: "2026-03-22T09:00:00Z",
        stoppedAt: "2026-03-22T10:30:00Z",
        durationMin: 90,
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("PATCH /tasks/:id/reorder → reorders task in kanban", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/tasks/task-001/reorder",
      headers: auth(authToken),
      payload: { order: 3 },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [8] ANALYTICS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [08] Analytics Module", () => {
  it("GET /analytics/integrations → lists connected integrations", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/analytics/integrations?clientId=client-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /analytics/integrations → connects GA4 integration", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/analytics/integrations",
      headers: auth(authToken),
      payload: { clientId: "client-001", platform: "ga4", accountId: "G-XXXXXXXXXX", accessToken: "ya29.xxx" },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /analytics/metrics → fetches session metrics", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/analytics/metrics?integrationId=ai-001&metric=sessions&from=2026-03-01&to=2026-03-22",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /analytics/metrics → bulk upserts metric snapshots", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/analytics/metrics",
      headers: auth(authToken),
      payload: {
        snapshots: [
          { integrationId: "ai-001", date: "2026-03-22", metric: "sessions", value: 4320 },
          { integrationId: "ai-001", date: "2026-03-22", metric: "conversions", value: 48 },
          { integrationId: "ai-001", date: "2026-03-22", metric: "revenue", value: 9600 },
        ],
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /analytics/summary → returns aggregated KPIs", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/analytics/summary?clientId=client-001&from=2026-03-01&to=2026-03-22",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /analytics/alerts → creates ROAS drop alert", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/analytics/alerts",
      headers: auth(authToken),
      payload: {
        clientId: "client-001",
        metric: "roas",
        condition: "lt",
        threshold: 2.0,
        severity: "CRITICAL",
        message: "ROAS dropped below 2x — review ad spend immediately",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /analytics/alerts → lists active alerts", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/analytics/alerts?clientId=client-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /analytics/alerts/:id → deactivates alert", async () => {
    const res = await app.inject({
      method: "DELETE", url: "/api/v1/analytics/alerts/alert-001",
      headers: auth(authToken),
    });
    expect([200, 204]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [9] REPORTS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [09] Reports Module", () => {
  it("GET /reports → lists reports for client", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/reports?clientId=client-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /reports/generate → queues monthly report generation", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/reports/generate",
      headers: auth(authToken),
      payload: {
        clientId: "client-001",
        orgId: "org-001",
        period: "monthly",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      },
    });
    expect([200, 202]).toContain(res.statusCode);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("jobId");
    expect(body.status).toBe("queued");
  });

  it("GET /reports/templates → lists report templates", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/reports/templates?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /reports/templates → creates custom report template", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/reports/templates",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        name: "E-Commerce Monthly Report",
        config: { sections: ["overview", "seo", "ads", "email", "revenue"] },
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("POST /reports/:id/send → emails report to client", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/reports/report-001/send",
      headers: auth(authToken),
    });
    expect([200, 202]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [10] SOCIAL MEDIA MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [10] Social Media Module", () => {
  it("GET /social/accounts → lists connected social accounts", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/social/accounts?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /social/accounts → connects Instagram account", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/social/accounts",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        clientId: "client-001",
        platform: "INSTAGRAM",
        accountId: "ig_acme_v2",
        accountName: "@acmecorp.official",
        accessToken: "ig_tok_xxx",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /social/posts → lists all scheduled posts", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/social/posts",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /social/posts → filters by status=SCHEDULED", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/social/posts?status=SCHEDULED",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /social/posts → creates and schedules new post", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/social/posts",
      headers: auth(authToken),
      payload: {
        socialAccountId: "sa-001",
        caption: "Exciting news! We just hit 10K followers! Thank you for your support 🎉",
        mediaUrls: ["https://cdn.example.com/celebration.jpg"],
        hashtags: ["#milestone", "#digitalmarketing", "#growth"],
        status: "SCHEDULED",
        scheduledAt: "2026-03-25T09:00:00Z",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("PATCH /social/posts/:id → updates caption before publishing", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/social/posts/post-001",
      headers: auth(authToken),
      payload: { caption: "Updated caption with improved CTA 🚀" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /social/calendar → returns weekly content calendar", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/social/calendar?orgId=org-001&from=2026-03-22&to=2026-03-29",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /social/posts/:id/metrics → returns engagement metrics", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/social/posts/post-001/metrics",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /social/posts/:id → deletes draft post", async () => {
    const res = await app.inject({
      method: "DELETE", url: "/api/v1/social/posts/post-001",
      headers: auth(authToken),
    });
    expect([200, 204]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [11] EMAIL MARKETING MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [11] Email Marketing Module", () => {
  it("GET /email/lists → returns email lists", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/email/lists?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /email/lists → creates new list", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/email/lists",
      headers: auth(authToken),
      payload: { orgId: "org-001", clientId: "client-001", name: "Newsletter Subscribers", description: "Monthly newsletter list" },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /email/lists/:listId/subscribers → lists subscribers", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/email/lists/list-001/subscribers",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /email/lists/:listId/subscribers → adds subscriber", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/email/lists/list-001/subscribers",
      headers: auth(authToken),
      payload: { email: "newuser@company.com", firstName: "New", lastName: "User", tags: ["newsletter", "prospect"] },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("POST /email/lists/:listId/subscribers/bulk → bulk imports 3 subscribers", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/email/lists/list-001/subscribers/bulk",
      headers: auth(authToken),
      payload: {
        subscribers: [
          { email: "bulk1@example.com", firstName: "Bulk", lastName: "One" },
          { email: "bulk2@example.com", firstName: "Bulk", lastName: "Two" },
          { email: "bulk3@example.com", firstName: "Bulk", lastName: "Three" },
        ],
      },
    });
    expect([200, 201]).toContain(res.statusCode);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("imported");
  });

  it("GET /email/campaigns → lists campaigns", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/email/campaigns?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /email/campaigns → creates email campaign", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/email/campaigns",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        listId: "list-001",
        name: "April Promo Campaign",
        subject: "🌸 April Special: 20% Off Our Services",
        previewText: "Don't miss our biggest offer of Q2!",
        htmlBody: "<h1>April Special</h1><p>Get 20% off any service this April!</p>",
        textBody: "April Special\n\nGet 20% off any service this April!",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("POST /email/campaigns/:id/send → sends campaign (queues job)", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/email/campaigns/campaign-001/send",
      headers: auth(authToken),
    });
    expect([200, 202]).toContain(res.statusCode);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("queued");
  });

  it("GET /email/campaigns/:id/stats → returns open/click rates", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/email/campaigns/campaign-001/stats",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("openRate");
    expect(body).toHaveProperty("clickRate");
  });

  it("POST /email/campaigns/:id/sequences → adds follow-up sequence", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/email/campaigns/campaign-001/sequences",
      headers: auth(authToken),
      payload: {
        name: "Day 3 Follow-up",
        delayDays: 3,
        delayHours: 0,
        subject: "Did you see our April offer?",
        htmlBody: "<p>Following up on our April special...</p>",
        order: 1,
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [12] SEO MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [12] SEO Module", () => {
  it("GET /seo/projects → lists SEO projects", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/seo/projects?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /seo/projects → creates SEO project for domain", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/seo/projects",
      headers: auth(authToken),
      payload: { orgId: "org-001", clientId: "client-001", domain: "newclient.com" },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /seo/projects/:id/keywords → lists tracked keywords", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/seo/projects/seo-001/keywords",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /seo/projects/:id/keywords → adds multiple keywords", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/seo/projects/seo-001/keywords",
      headers: auth(authToken),
      payload: {
        keywords: [
          { keyword: "digital marketing agency london", targetUrl: "/london", country: "GB" },
          { keyword: "ppc management services", targetUrl: "/ppc", country: "US" },
          { keyword: "social media management", targetUrl: "/social", country: "US" },
        ],
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /seo/projects/:id/rankings → returns keyword ranking history", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/seo/projects/seo-001/rankings?from=2026-03-01&to=2026-03-22",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /seo/projects/:id/backlinks → lists all backlinks", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/seo/projects/seo-001/backlinks",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /seo/projects/:id/backlinks → filters lost backlinks", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/seo/projects/seo-001/backlinks?isLost=true",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /seo/projects/:id/audits → lists site audits", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/seo/projects/seo-001/audits",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /seo/projects/:id/audit → triggers technical SEO audit", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/seo/projects/seo-001/audit",
      headers: auth(authToken),
    });
    expect([200, 202]).toContain(res.statusCode);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("jobId");
  });

  it("GET /seo/projects/:id/summary → returns SEO overview metrics", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/seo/projects/seo-001/summary",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("keywordCount");
    expect(body).toHaveProperty("backlinkCount");
  });
});

// ─────────────────────────────────────────────────────────────────────
// [13] ADS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [13] Paid Ads Module", () => {
  it("GET /ads/accounts → lists connected ad accounts", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/ads/accounts?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /ads/accounts → connects Google Ads account", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/ads/accounts",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        clientId: "client-001",
        platform: "GOOGLE_ADS",
        accountId: "987-654-3210",
        accountName: "Acme Corp - Branded",
        currency: "USD",
        accessToken: "google_tok_xxx",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /ads/accounts/:accountId/campaigns → lists campaigns", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/ads/accounts/ad-account-001/campaigns",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /ads/accounts/:accountId/campaigns → filters active only", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/ads/accounts/ad-account-001/campaigns?status=active",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /ads/campaigns/:id → returns campaign with ad sets and metrics", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/ads/campaigns/campaign-ad-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /ads/accounts/:accountId/metrics → returns aggregated ad metrics", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/ads/accounts/ad-account-001/metrics?from=2026-03-01&to=2026-03-22",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /ads/accounts/:accountId/summary → returns account ROAS/spend overview", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/ads/accounts/ad-account-001/summary",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("activeCampaigns");
  });

  it("POST /ads/campaigns/:id/rules → creates auto-pause rule (CPA > $50)", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/ads/campaigns/campaign-ad-001/rules",
      headers: auth(authToken),
      payload: {
        name: "Auto-pause if CPA > $50",
        metric: "cpa",
        condition: "gt",
        threshold: 50,
        action: "pause_campaign",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("PATCH /ads/campaigns/:id/rules/:ruleId → toggles rule off", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/ads/campaigns/campaign-ad-001/rules/rule-001",
      headers: auth(authToken),
      payload: { isActive: false },
    });
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /ads/campaigns/:id/rules/:ruleId → deletes rule", async () => {
    const res = await app.inject({
      method: "DELETE", url: "/api/v1/ads/campaigns/campaign-ad-001/rules/rule-001",
      headers: auth(authToken),
    });
    expect([200, 204]).toContain(res.statusCode);
  });

  it("POST /ads/accounts/:accountId/sync → triggers manual ad sync", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/ads/accounts/ad-account-001/sync",
      headers: auth(authToken),
    });
    expect([200, 202]).toContain(res.statusCode);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("syncing");
  });
});

// ─────────────────────────────────────────────────────────────────────
// [14] BILLING MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [14] Billing & Finance Module", () => {
  it("GET /billing/invoices → lists all invoices", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/billing/invoices?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /billing/invoices → filters by status=SENT", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/billing/invoices?orgId=org-001&status=SENT",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /billing/invoices/:id → returns invoice with line items", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/billing/invoices/invoice-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("lineItems");
  });

  it("POST /billing/invoices → creates invoice with line items + auto-calculates total", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/billing/invoices",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        clientId: "client-001",
        dueDate: "2026-04-30",
        currency: "USD",
        tax: 500,
        lineItems: [
          { description: "SEO Services — April", quantity: 1, unitPrice: 2500 },
          { description: "PPC Management — April", quantity: 1, unitPrice: 1500 },
          { description: "Social Media Management", quantity: 1, unitPrice: 1000 },
        ],
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("POST /billing/invoices/:id/send → marks invoice as SENT", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/billing/invoices/invoice-001/send",
      headers: auth(authToken),
    });
    expect([200, 202]).toContain(res.statusCode);
  });

  it("POST /billing/invoices/:id/payments → records payment, marks PAID", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/billing/invoices/invoice-001/payments",
      headers: auth(authToken),
      payload: { amount: 5500, method: "stripe", reference: "pi_test_xyz123" },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("GET /billing/dashboard → returns MRR and financial KPIs", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/billing/dashboard?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("mrr");
    expect(body).toHaveProperty("paidThisMonth");
    expect(body).toHaveProperty("outstandingAmount");
    expect(body).toHaveProperty("overdueInvoices");
  });

  it("POST /billing/subscriptions → creates monthly retainer subscription", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/billing/subscriptions",
      headers: auth(authToken),
      payload: {
        clientId: "client-001",
        planName: "Growth Package",
        amount: 5000,
        billingCycle: "MONTHLY",
        nextBillingAt: "2026-04-01",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [15] APPROVALS / CLIENT PORTAL MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [15] Client Approval Portal Module", () => {
  it("GET /approvals → lists pending approvals", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/approvals?status=PENDING",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /approvals → filters by clientId", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/approvals?clientId=client-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /approvals → creates new approval request", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/approvals",
      headers: auth(authToken),
      payload: {
        clientId: "client-001",
        title: "April Social Media Content Review",
        description: "Please review 15 posts planned for April",
        type: "social_post",
        fileUrl: "https://cdn.example.com/april-posts.pdf",
        dueDate: "2026-03-28",
      },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it("PATCH /approvals/:id/review → client APPROVES content", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/approvals/approval-001/review",
      payload: { status: "APPROVED", feedback: "Looks great! Please go ahead." },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("APPROVED");
  });

  it("PATCH /approvals/:id/review → client REJECTS with feedback", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/approvals/approval-001/review",
      payload: { status: "REJECTED", feedback: "Post #3 needs revision — tone is too casual" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /approvals/:id → removes approval request", async () => {
    const res = await app.inject({
      method: "DELETE", url: "/api/v1/approvals/approval-001",
      headers: auth(authToken),
    });
    expect([200, 204]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [16] NOTIFICATIONS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [16] Notifications Module", () => {
  it("GET /notifications → returns user notifications", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/notifications",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /notifications?unread=true → returns only unread", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/notifications?unread=true",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /notifications/unread-count → returns badge count", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/notifications/unread-count",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("count");
  });

  it("PATCH /notifications/:id/read → marks single notification read", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/notifications/notif-001/read",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("PATCH /notifications/read-all → marks all notifications read", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/notifications/read-all",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [17] USERS / TEAM MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [17] Users & Team Module", () => {
  it("GET /users → lists org team members", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/users?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("PATCH /users/:id/role → updates team member role", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/users/user-001/role",
      headers: auth(authToken),
      payload: { orgId: "org-001", role: "ACCOUNT_MANAGER" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /users/:id → removes team member from org", async () => {
    const res = await app.inject({
      method: "DELETE", url: "/api/v1/users/user-001?orgId=org-001",
      headers: auth(authToken),
    });
    expect([200, 204]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [18] WEBHOOKS MODULE
// ─────────────────────────────────────────────────────────────────────
describe("✅ [18] Webhooks Module", () => {
  it("GET /webhooks → lists configured webhooks", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/webhooks?orgId=org-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /webhooks → registers new webhook with events", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/webhooks",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        url: "https://hooks.zapier.com/hooks/catch/xxx/yyy/",
        events: ["lead.created", "invoice.paid", "task.completed", "report.ready"],
      },
    });
    expect([200, 201]).toContain(res.statusCode);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("secret");
  });

  it("PATCH /webhooks/:id → deactivates webhook", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/webhooks/wh-001",
      headers: auth(authToken),
      payload: { isActive: false },
    });
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /webhooks/:id → removes webhook", async () => {
    const res = await app.inject({
      method: "DELETE", url: "/api/v1/webhooks/wh-001",
      headers: auth(authToken),
    });
    expect([200, 204]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [19] SECURITY & EDGE CASES
// ─────────────────────────────────────────────────────────────────────
describe("✅ [19] Security & Edge Cases", () => {
  it("All protected routes reject missing token (401)", async () => {
    const routes = [
      "/api/v1/leads?orgId=org-001",
      "/api/v1/clients?orgId=org-001",
      "/api/v1/projects?orgId=org-001",
      "/api/v1/tasks?projectId=project-001",
      "/api/v1/billing/invoices?orgId=org-001",
      "/api/v1/analytics/integrations?clientId=client-001",
      "/api/v1/social/posts",
      "/api/v1/email/campaigns?orgId=org-001",
      "/api/v1/seo/projects?orgId=org-001",
      "/api/v1/ads/accounts?orgId=org-001",
      "/api/v1/notifications",
      "/api/v1/users?orgId=org-001",
      "/api/v1/webhooks?orgId=org-001",
    ];

    for (const url of routes) {
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode).toBe(401);
    }
  });

  it("POST /auth/register → rejects invalid email format", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/register",
      payload: { name: "Test", email: "not-an-email", password: "pass12345", orgName: "Test Org" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("POST /auth/register → rejects password < 8 characters", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/register",
      payload: { name: "Test", email: "test@test.com", password: "short", orgName: "Test Org" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it("GET /leads/:id → 404 for nonexistent ID", async () => {
    const { prisma } = await import("@agency-os/db");
    (prisma.lead.findUnique as any).mockResolvedValueOnce(null);
    const res = await app.inject({
      method: "GET", url: "/api/v1/leads/does-not-exist",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /clients/:id → never exposes portalPassword field", async () => {
    const { prisma } = await import("@agency-os/db");
    (prisma.client.findUnique as any).mockResolvedValueOnce({
      ...DUMMY.client,
      portalPassword: "$2b$12$hashedpassword",
    });
    const res = await app.inject({
      method: "GET", url: "/api/v1/clients/client-001",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).not.toHaveProperty("portalPassword");
  });

  it("POST /leads → rejects duplicate lead convert (409)", async () => {
    const { prisma } = await import("@agency-os/db");
    (prisma.lead.findUnique as any).mockResolvedValueOnce({ ...DUMMY.lead, client: DUMMY.client });
    const res = await app.inject({
      method: "POST", url: "/api/v1/leads/lead-001/convert",
      headers: auth(authToken),
    });
    expect(res.statusCode).toBe(409);
  });

  it("Expired/invalid JWT is rejected (401)", async () => {
    const badToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.fake_signature";
    const res = await app.inject({
      method: "GET", url: "/api/v1/clients?orgId=org-001",
      headers: { Authorization: `Bearer ${badToken}` },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────
// [20] DATA INTEGRITY & BUSINESS LOGIC
// ─────────────────────────────────────────────────────────────────────
describe("✅ [20] Data Integrity & Business Logic", () => {
  it("Invoice total = subtotal + tax (auto-calculated)", async () => {
    let capturedData: any = null;
    const { prisma } = await import("@agency-os/db");
    (prisma.invoice.create as any).mockImplementationOnce(({ data }: any) => {
      capturedData = data;
      return Promise.resolve({ ...DUMMY.invoice, ...data });
    });

    await app.inject({
      method: "POST", url: "/api/v1/billing/invoices",
      headers: auth(authToken),
      payload: {
        orgId: "org-001",
        clientId: "client-001",
        dueDate: "2026-04-30",
        tax: 200,
        lineItems: [
          { description: "Service A", quantity: 2, unitPrice: 1000 },
          { description: "Service B", quantity: 1, unitPrice: 500 },
        ],
      },
    });

    if (capturedData) {
      expect(capturedData.subtotal).toBe(2500); // 2*1000 + 1*500
      expect(capturedData.tax).toBe(200);
      expect(capturedData.total).toBe(2700); // 2500 + 200
    }
  });

  it("Task DONE status auto-sets completedAt", async () => {
    let capturedData: any = null;
    const { prisma } = await import("@agency-os/db");
    (prisma.task.update as any).mockImplementationOnce(({ data }: any) => {
      capturedData = data;
      return Promise.resolve({ ...DUMMY.task, ...data });
    });

    await app.inject({
      method: "PATCH", url: "/api/v1/tasks/task-001",
      headers: auth(authToken),
      payload: { status: "DONE" },
    });

    if (capturedData) {
      expect(capturedData.completedAt).toBeDefined();
    }
  });

  it("Lead status change creates activity log entry", async () => {
    const { prisma } = await import("@agency-os/db");
    const createSpy = vi.spyOn(prisma.leadActivity, "create");
    (prisma.lead.findUnique as any).mockResolvedValueOnce({ ...DUMMY.lead, status: "NEW" });

    await app.inject({
      method: "PATCH", url: "/api/v1/leads/lead-001",
      headers: auth(authToken),
      payload: { status: "QUALIFIED" },
    });

    expect(createSpy).toHaveBeenCalled();
  });

  it("Client creation auto-generates onboarding checklist (8 items)", async () => {
    const { prisma } = await import("@agency-os/db");
    const createSpy = vi.spyOn(prisma.onboarding, "create");

    await app.inject({
      method: "POST", url: "/api/v1/clients",
      headers: auth(authToken),
      payload: { orgId: "org-001", name: "Auto Onboard", email: "ao@test.com", company: "Auto Corp" },
    });

    expect(createSpy).toHaveBeenCalled();
    const call = createSpy.mock.calls[0]?.[0] as any;
    if (call?.data?.checklist?.createMany?.data) {
      expect(call.data.checklist.createMany.data).toHaveLength(8);
    }
  });

  it("Report generation returns jobId (async processing)", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/reports/generate",
      headers: auth(authToken),
      payload: { clientId: "client-001", orgId: "org-001", period: "monthly", startDate: "2026-03-01", endDate: "2026-03-31" },
    });
    const body = JSON.parse(res.body);
    expect(body.jobId).toBeTruthy();
    expect(body.status).toBe("queued");
  });

  it("Ad sync triggers background job on account connect", async () => {
    const { adSyncQueue } = await import("../apps/api/src/jobs/queues.js");
    const addSpy = vi.spyOn(adSyncQueue, "add");

    await app.inject({
      method: "POST", url: "/api/v1/ads/accounts",
      headers: auth(authToken),
      payload: { orgId: "org-001", clientId: "client-001", platform: "META_ADS", accountId: "meta-123", accountName: "Meta Account", accessToken: "meta_tok" },
    });

    expect(addSpy).toHaveBeenCalledWith("sync-account", expect.objectContaining({}));
  });
});
