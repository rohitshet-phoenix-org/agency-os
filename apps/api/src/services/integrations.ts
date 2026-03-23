/**
 * Integration credential store — reads/writes Integration rows per org.
 * Credentials are stored as JSON strings in SQLite.
 */
import { prisma } from "@agency-os/db";

export type Provider =
  | "stripe"
  | "google_ads"
  | "meta_ads"
  | "google_search_console"
  | "google_analytics"
  | "resend"
  | "sendgrid";

export async function getIntegration(orgId: string, provider: Provider) {
  const row = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId: orgId, provider } },
  });
  if (!row || !row.isActive) return null;
  try {
    return {
      ...row,
      credentials: JSON.parse(row.credentials) as Record<string, string>,
      metadata: JSON.parse(row.metadata) as Record<string, string>,
    };
  } catch {
    return null;
  }
}

export async function upsertIntegration(
  orgId: string,
  provider: Provider,
  credentials: Record<string, string>,
  metadata: Record<string, string> = {}
) {
  return prisma.integration.upsert({
    where: { organizationId_provider: { organizationId: orgId, provider } },
    create: {
      organizationId: orgId,
      provider,
      credentials: JSON.stringify(credentials),
      metadata: JSON.stringify(metadata),
      isActive: true,
    },
    update: {
      credentials: JSON.stringify(credentials),
      metadata: JSON.stringify(metadata),
      isActive: true,
      updatedAt: new Date(),
    },
  });
}

export async function listIntegrations(orgId: string) {
  const rows = await prisma.integration.findMany({
    where: { organizationId: orgId },
    orderBy: { provider: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    credentials: {}, // never expose raw credentials to API callers
    metadata: (() => {
      try { return JSON.parse(r.metadata); } catch { return {}; }
    })(),
  }));
}

export async function deleteIntegration(orgId: string, provider: Provider) {
  return prisma.integration.deleteMany({
    where: { organizationId: orgId, provider },
  });
}
