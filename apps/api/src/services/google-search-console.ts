/**
 * Google Search Console integration service
 * Fetches keyword ranking data, impressions, clicks, CTR, and average position.
 */
import { google } from "googleapis";

export function createGSCClient(credentials: {
  clientEmail: string;
  privateKey: string;
}) {
  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return google.searchconsole({ version: "v1", auth });
}

export async function getSearchAnalytics(
  client: ReturnType<typeof createGSCClient>,
  siteUrl: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,
  dimensions: string[] = ["query", "page"],
  rowLimit = 500
) {
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit,
    },
  });
  return res.data.rows ?? [];
}

export async function getKeywordPositions(
  client: ReturnType<typeof createGSCClient>,
  siteUrl: string,
  keywords: string[],
  startDate: string,
  endDate: string
): Promise<
  Array<{
    keyword: string;
    position: number | null;
    clicks: number;
    impressions: number;
    ctr: number;
  }>
> {
  const rows = await getSearchAnalytics(client, siteUrl, startDate, endDate, ["query"]);
  const kwSet = new Set(keywords.map((k) => k.toLowerCase()));
  const results = rows
    .filter((r) => kwSet.has((r.keys?.[0] ?? "").toLowerCase()))
    .map((r) => ({
      keyword: r.keys?.[0] ?? "",
      position: r.position ?? null,
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
    }));
  return results;
}

export async function getSiteMetrics(
  client: ReturnType<typeof createGSCClient>,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<{
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}> {
  const rows = await getSearchAnalytics(client, siteUrl, startDate, endDate, ["date"]);
  if (!rows.length) return { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0 };

  const totalClicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition = rows.reduce((s, r) => s + (r.position ?? 0), 0) / rows.length;
  return { totalClicks, totalImpressions, avgCtr, avgPosition };
}
