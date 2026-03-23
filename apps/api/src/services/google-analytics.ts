/**
 * Google Analytics 4 (GA4) Data API integration service
 * Fetches traffic, sessions, conversions, and page-level metrics.
 */
import { google } from "googleapis";

export function createGA4Client(credentials: {
  clientEmail: string;
  privateKey: string;
}) {
  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  return google.analyticsdata({ version: "v1beta", auth });
}

export async function runReport(
  client: ReturnType<typeof createGA4Client>,
  propertyId: string, // "properties/123456789"
  {
    startDate,
    endDate,
    dimensions = ["date"],
    metrics = ["sessions", "activeUsers", "newUsers", "conversions"],
  }: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    metrics?: string[];
  }
) {
  const propertyPath = propertyId.startsWith("properties/")
    ? propertyId
    : `properties/${propertyId}`;

  const res = await client.properties.runReport({
    property: propertyPath,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
    },
  });

  return res.data;
}

export async function getTrafficSummary(
  client: ReturnType<typeof createGA4Client>,
  propertyId: string,
  startDate: string,
  endDate: string
) {
  const data = await runReport(client, propertyId, {
    startDate,
    endDate,
    dimensions: [],
    metrics: ["sessions", "activeUsers", "newUsers", "conversions", "bounceRate"],
  });

  const row = data.rows?.[0];
  const vals = row?.metricValues ?? [];
  return {
    sessions: Number(vals[0]?.value ?? 0),
    activeUsers: Number(vals[1]?.value ?? 0),
    newUsers: Number(vals[2]?.value ?? 0),
    conversions: Number(vals[3]?.value ?? 0),
    bounceRate: Number(vals[4]?.value ?? 0),
  };
}

export async function getTopPages(
  client: ReturnType<typeof createGA4Client>,
  propertyId: string,
  startDate: string,
  endDate: string,
  limit = 10
) {
  const data = await runReport(client, propertyId, {
    startDate,
    endDate,
    dimensions: ["pagePath"],
    metrics: ["sessions", "activeUsers"],
  });

  return (data.rows ?? []).slice(0, limit).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "",
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
    users: Number(row.metricValues?.[1]?.value ?? 0),
  }));
}
