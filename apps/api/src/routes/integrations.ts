/**
 * /api/v1/integrations — manage third-party connector credentials per org
 *
 * Supported providers:
 *   stripe | google_ads | meta_ads | google_search_console | google_analytics | resend | sendgrid
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getIntegration,
  upsertIntegration,
  listIntegrations,
  deleteIntegration,
  type Provider,
} from "../services/integrations.js";
import { createStripeClient } from "../services/stripe.js";
import { createGSCClient, getSiteMetrics } from "../services/google-search-console.js";
import { createGA4Client, getTrafficSummary } from "../services/google-analytics.js";
import { createResendClient } from "../services/resend-email.js";

const PROVIDERS = [
  "stripe",
  "google_ads",
  "meta_ads",
  "google_search_console",
  "google_analytics",
  "resend",
  "sendgrid",
] as const;

const UpsertSchema = z.object({
  orgId: z.string(),
  provider: z.enum(PROVIDERS),
  credentials: z.record(z.string()),
  metadata: z.record(z.string()).optional().default({}),
});

export async function integrationsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /api/v1/integrations?orgId=xxx  — list all (credentials stripped)
  app.get("/", auth, async (req) => {
    const { orgId } = req.query as { orgId: string };
    return listIntegrations(orgId);
  });

  // POST /api/v1/integrations  — save/update credentials
  app.post("/", auth, async (req, reply) => {
    const body = UpsertSchema.parse(req.body);
    const row = await upsertIntegration(
      body.orgId,
      body.provider as Provider,
      body.credentials,
      body.metadata
    );
    return reply.code(201).send({ id: row.id, provider: row.provider, isActive: row.isActive });
  });

  // DELETE /api/v1/integrations/:provider?orgId=xxx  — disconnect
  app.delete("/:provider", auth, async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const { orgId } = req.query as { orgId: string };
    await deleteIntegration(orgId, provider as Provider);
    return reply.code(204).send();
  });

  // POST /api/v1/integrations/:provider/test  — verify credentials work
  app.post("/:provider/test", auth, async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const { orgId } = req.body as { orgId: string };

    const integration = await getIntegration(orgId, provider as Provider);
    if (!integration) {
      return reply.code(404).send({ error: "Integration not configured" });
    }

    const creds = integration.credentials;

    try {
      switch (provider) {
        case "stripe": {
          const stripe = createStripeClient(creds["secretKey"]!);
          const acct = await stripe.accounts.retrieve();
          return { ok: true, info: { accountId: acct.id, country: acct.country } };
        }
        case "google_search_console": {
          const gsc = createGSCClient({
            clientEmail: creds["clientEmail"]!,
            privateKey: creds["privateKey"]!,
          });
          const endDate = new Date().toISOString().slice(0, 10);
          const startDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
          const metrics = await getSiteMetrics(gsc, creds["siteUrl"]!, startDate, endDate);
          return { ok: true, info: metrics };
        }
        case "google_analytics": {
          const ga4 = createGA4Client({
            clientEmail: creds["clientEmail"]!,
            privateKey: creds["privateKey"]!,
          });
          const endDate = new Date().toISOString().slice(0, 10);
          const startDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
          const summary = await getTrafficSummary(ga4, creds["propertyId"]!, startDate, endDate);
          return { ok: true, info: summary };
        }
        case "resend": {
          const resend = createResendClient(creds["apiKey"]!);
          const domains = await resend.domains.list();
          return { ok: true, info: { domains: (domains.data?.data ?? []).length } };
        }
        case "google_ads":
        case "meta_ads":
          // For these, just confirm credentials are present
          return { ok: true, info: { note: "Credentials saved. Sync will validate on next run." } };
        default:
          return { ok: false, error: "Unknown provider" };
      }
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message });
    }
  });
}
