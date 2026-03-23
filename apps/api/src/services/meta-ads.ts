/**
 * Meta (Facebook/Instagram) Ads integration service
 * Uses the Marketing API v21 via fetch — no official maintained Node SDK needed.
 *
 * Authentication: User access token or System User access token + Ad Account ID.
 */

export interface MetaAdsCredentials {
  accessToken: string;
  adAccountId: string; // e.g. "act_123456789"
}

const BASE = "https://graph.facebook.com/v21.0";

async function metaGet(path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Meta Ads API error: ${(err as any).error?.message ?? res.statusText}`);
  }
  return res.json();
}

export async function listCampaigns(creds: MetaAdsCredentials) {
  const accountId = creds.adAccountId.startsWith("act_")
    ? creds.adAccountId
    : `act_${creds.adAccountId}`;

  const data = await metaGet(`/${accountId}/campaigns`, {
    access_token: creds.accessToken,
    fields:
      "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time",
    limit: "100",
  });

  return (data.data ?? []) as Array<{
    id: string;
    name: string;
    status: string;
    objective: string;
    daily_budget?: string;
    lifetime_budget?: string;
  }>;
}

export async function getCampaignInsights(
  creds: MetaAdsCredentials,
  campaignId: string,
  datePreset = "last_30d"
) {
  const data = await metaGet(`/${campaignId}/insights`, {
    access_token: creds.accessToken,
    fields: "impressions,clicks,spend,conversions,actions,ctr,cpc,cpp,roas",
    date_preset: datePreset,
    level: "campaign",
  });
  return data.data?.[0] ?? null;
}

export async function getAccountInsights(
  creds: MetaAdsCredentials,
  datePreset = "last_30d"
): Promise<{
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
}> {
  const accountId = creds.adAccountId.startsWith("act_")
    ? creds.adAccountId
    : `act_${creds.adAccountId}`;

  const data = await metaGet(`/${accountId}/insights`, {
    access_token: creds.accessToken,
    fields: "impressions,clicks,spend,actions,ctr,cpc",
    date_preset: datePreset,
  });

  const row = data.data?.[0] ?? {};
  const purchaseAction = (row.actions ?? []).find((a: any) => a.action_type === "purchase");
  const purchaseValue = (row.action_values ?? []).find((a: any) => a.action_type === "purchase");
  const conversions = Number(purchaseAction?.value ?? 0);
  const spend = Number(row.spend ?? 0);
  const revenue = Number(purchaseValue?.value ?? 0);

  return {
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    spend,
    conversions,
    ctr: Number(row.ctr ?? 0),
    cpc: Number(row.cpc ?? 0),
    roas: spend > 0 ? revenue / spend : 0,
  };
}

export async function getDailyInsights(
  creds: MetaAdsCredentials,
  startDate: string, // YYYY-MM-DD
  endDate: string
) {
  const accountId = creds.adAccountId.startsWith("act_")
    ? creds.adAccountId
    : `act_${creds.adAccountId}`;

  const data = await metaGet(`/${accountId}/insights`, {
    access_token: creds.accessToken,
    fields: "impressions,clicks,spend,date_start",
    time_increment: "1",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    limit: "90",
  });

  return (data.data ?? []).map((r: any) => ({
    date: r.date_start,
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    spend: Number(r.spend ?? 0),
  }));
}
