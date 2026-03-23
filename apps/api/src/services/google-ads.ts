/**
 * Google Ads integration service
 * Uses the Google Ads Query Language (GAQL) via REST API to fetch campaigns,
 * ad groups, and performance metrics.
 *
 * Authentication: uses a refresh token + OAuth2 (developer token required).
 */
import { google } from "googleapis";

export interface GoogleAdsCredentials {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  managerCustomerId?: string; // MCC account
}

async function getAccessToken(creds: GoogleAdsCredentials): Promise<string> {
  const oauth2 = new google.auth.OAuth2(creds.clientId, creds.clientSecret);
  oauth2.setCredentials({ refresh_token: creds.refreshToken });
  const { token } = await oauth2.getAccessToken();
  if (!token) throw new Error("Unable to retrieve Google Ads access token");
  return token;
}

async function gaqlQuery(
  creds: GoogleAdsCredentials,
  customerId: string, // without dashes
  query: string
): Promise<any[]> {
  const accessToken = await getAccessToken(creds);
  const cleanId = customerId.replace(/-/g, "");

  const res = await fetch(
    `https://googleads.googleapis.com/v19/customers/${cleanId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": creds.developerToken,
        "Content-Type": "application/json",
        ...(creds.managerCustomerId
          ? { "login-customer-id": creds.managerCustomerId.replace(/-/g, "") }
          : {}),
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads API error: ${err}`);
  }

  const chunks: any[] = await res.json();
  return chunks.flatMap((chunk: any) => chunk.results ?? []);
}

export async function listCampaigns(creds: GoogleAdsCredentials, customerId: string) {
  const rows = await gaqlQuery(
    creds,
    customerId,
    `SELECT campaign.id, campaign.name, campaign.status,
            campaign.advertising_channel_type,
            metrics.impressions, metrics.clicks, metrics.cost_micros,
            metrics.conversions, metrics.all_conversions_value
     FROM campaign
     WHERE segments.date DURING LAST_30_DAYS
       AND campaign.status != 'REMOVED'
     ORDER BY metrics.cost_micros DESC
     LIMIT 100`
  );

  return rows.map((r: any) => ({
    id: r.campaign?.id,
    name: r.campaign?.name,
    status: r.campaign?.status,
    type: r.campaign?.advertisingChannelType,
    impressions: Number(r.metrics?.impressions ?? 0),
    clicks: Number(r.metrics?.clicks ?? 0),
    spend: (Number(r.metrics?.costMicros ?? 0) / 1_000_000).toFixed(2),
    conversions: Number(r.metrics?.conversions ?? 0),
    conversionValue: Number(r.metrics?.allConversionsValue ?? 0),
    roas:
      Number(r.metrics?.costMicros ?? 0) > 0
        ? (Number(r.metrics?.allConversionsValue ?? 0) /
            (Number(r.metrics?.costMicros ?? 0) / 1_000_000)).toFixed(2)
        : "0.00",
  }));
}

export async function getDailyMetrics(
  creds: GoogleAdsCredentials,
  customerId: string,
  days = 7
) {
  const rows = await gaqlQuery(
    creds,
    customerId,
    `SELECT segments.date,
            metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
     FROM campaign
     WHERE segments.date DURING LAST_${days}_DAYS
     ORDER BY segments.date ASC
     LIMIT 500`
  );

  const byDate: Record<string, { impressions: number; clicks: number; spend: number; conversions: number }> = {};
  for (const r of rows) {
    const d = r.segments?.date ?? "";
    if (!byDate[d]) byDate[d] = { impressions: 0, clicks: 0, spend: 0, conversions: 0 };
    byDate[d]!.impressions += Number(r.metrics?.impressions ?? 0);
    byDate[d]!.clicks += Number(r.metrics?.clicks ?? 0);
    byDate[d]!.spend += Number(r.metrics?.costMicros ?? 0) / 1_000_000;
    byDate[d]!.conversions += Number(r.metrics?.conversions ?? 0);
  }
  return Object.entries(byDate).map(([date, m]) => ({ date, ...m }));
}
