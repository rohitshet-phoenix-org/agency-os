"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Settings2,
  Zap,
  CreditCard,
  BarChart3,
  Search,
  Megaphone,
  Mail,
  Globe,
} from "lucide-react";
import { getOrgId } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Connector definitions ──────────────────────────────────────────────
const CONNECTORS = [
  {
    provider: "stripe",
    name: "Stripe",
    description: "Payment processing, invoicing, and subscription management.",
    icon: CreditCard,
    color: "bg-violet-100 text-violet-700",
    category: "Billing",
    fields: [
      { key: "secretKey", label: "Secret Key", placeholder: "sk_live_...", secret: true },
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_...", secret: true },
    ],
    docsUrl: "https://dashboard.stripe.com/apikeys",
  },
  {
    provider: "google_search_console",
    name: "Google Search Console",
    description: "Track keyword rankings, impressions, and click-through rates.",
    icon: Search,
    color: "bg-blue-100 text-blue-700",
    category: "SEO",
    fields: [
      { key: "clientEmail", label: "Service Account Email", placeholder: "name@project.iam.gserviceaccount.com" },
      { key: "privateKey", label: "Private Key (JSON)", placeholder: "-----BEGIN PRIVATE KEY-----\n...", secret: true, multiline: true },
      { key: "siteUrl", label: "Site URL", placeholder: "https://yourdomain.com" },
    ],
    docsUrl: "https://search.google.com/search-console",
  },
  {
    provider: "google_analytics",
    name: "Google Analytics 4",
    description: "Sessions, users, conversions, and traffic source analysis.",
    icon: BarChart3,
    color: "bg-orange-100 text-orange-700",
    category: "Analytics",
    fields: [
      { key: "clientEmail", label: "Service Account Email", placeholder: "name@project.iam.gserviceaccount.com" },
      { key: "privateKey", label: "Private Key (JSON)", placeholder: "-----BEGIN PRIVATE KEY-----\n...", secret: true, multiline: true },
      { key: "propertyId", label: "GA4 Property ID", placeholder: "123456789" },
    ],
    docsUrl: "https://analytics.google.com",
  },
  {
    provider: "google_ads",
    name: "Google Ads",
    description: "Sync campaigns, ad groups, and performance metrics from Google Ads.",
    icon: Megaphone,
    color: "bg-yellow-100 text-yellow-700",
    category: "Ads",
    fields: [
      { key: "developerToken", label: "Developer Token", placeholder: "ABCDEF...", secret: true },
      { key: "clientId", label: "OAuth Client ID", placeholder: "123456.apps.googleusercontent.com" },
      { key: "clientSecret", label: "OAuth Client Secret", placeholder: "GOCSPX-...", secret: true },
      { key: "refreshToken", label: "Refresh Token", placeholder: "1//...", secret: true },
      { key: "managerCustomerId", label: "Manager Customer ID (MCC)", placeholder: "123-456-7890", required: false },
    ],
    docsUrl: "https://ads.google.com/nav/selectaccount",
  },
  {
    provider: "meta_ads",
    name: "Meta Ads",
    description: "Sync Facebook & Instagram ad campaigns, insights, and spend data.",
    icon: Globe,
    color: "bg-indigo-100 text-indigo-700",
    category: "Ads",
    fields: [
      { key: "accessToken", label: "System User Access Token", placeholder: "EAABs...", secret: true },
      { key: "adAccountId", label: "Ad Account ID", placeholder: "act_123456789" },
    ],
    docsUrl: "https://developers.facebook.com/tools/explorer",
  },
  {
    provider: "resend",
    name: "Resend",
    description: "Send transactional & marketing emails to subscribers via Resend.",
    icon: Mail,
    color: "bg-green-100 text-green-700",
    category: "Email",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "re_...", secret: true },
      { key: "fromName", label: "From Name", placeholder: "Agency OS" },
      { key: "fromEmail", label: "From Email", placeholder: "campaigns@yourdomain.com" },
    ],
    docsUrl: "https://resend.com/api-keys",
  },
] as const;

type Provider = (typeof CONNECTORS)[number]["provider"];

interface IntegrationRow {
  id: string;
  provider: string;
  isActive: boolean;
  metadata: Record<string, string>;
}

// ── API helpers ────────────────────────────────────────────────────────
async function fetchIntegrations(orgId: string): Promise<IntegrationRow[]> {
  const token = localStorage.getItem("agency-os-token");
  const res = await fetch(`${API}/integrations?orgId=${orgId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function saveIntegration(orgId: string, provider: string, credentials: Record<string, string>) {
  const token = localStorage.getItem("agency-os-token");
  const res = await fetch(`${API}/integrations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, provider, credentials }),
  });
  if (!res.ok) throw new Error("Failed to save integration");
  return res.json();
}

async function testIntegration(orgId: string, provider: string): Promise<{ ok: boolean; info?: any; error?: string }> {
  const token = localStorage.getItem("agency-os-token");
  const res = await fetch(`${API}/integrations/${provider}/test`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ orgId }),
  });
  return res.json();
}

async function disconnectIntegration(orgId: string, provider: string) {
  const token = localStorage.getItem("agency-os-token");
  await fetch(`${API}/integrations/${provider}?orgId=${orgId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Connect Modal ──────────────────────────────────────────────────────
function ConnectModal({
  connector,
  onClose,
  onSaved,
}: {
  connector: (typeof CONNECTORS)[number];
  onClose: () => void;
  onSaved: () => void;
}) {
  const orgId = getOrgId();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setError("");
    try {
      await saveIntegration(orgId, connector.provider, form);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!orgId) return;
    setTesting(true);
    setTestResult(null);
    // Save first, then test
    try {
      await saveIntegration(orgId, connector.provider, form);
      const result = await testIntegration(orgId, connector.provider);
      setTestResult({ ok: result.ok, message: result.ok ? JSON.stringify(result.info) : (result.error ?? "Unknown error") });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center gap-3">
          <div className={`p-2 rounded-lg ${connector.color}`}>
            <connector.icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Connect {connector.name}</h2>
            <p className="text-sm text-gray-500">{connector.description}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {connector.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {(field as any).required === false && (
                  <span className="ml-1 text-gray-400 font-normal">(optional)</span>
                )}
              </label>
              {(field as any).multiline ? (
                <textarea
                  rows={4}
                  placeholder={field.placeholder}
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              ) : (
                <input
                  type={(field as any).secret ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              )}
            </div>
          ))}

          {testResult && (
            <div className={`rounded-lg p-3 text-sm ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <strong>{testResult.ok ? "✓ Connection successful" : "✗ Connection failed"}</strong>
              <p className="mt-1 font-mono text-xs break-all">{testResult.message}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-gray-400">
            Need help?{" "}
            <a href={connector.docsUrl} target="_blank" rel="noopener noreferrer" className="underline">
              View {connector.name} docs
            </a>
          </p>
        </div>

        <div className="p-6 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 text-sm rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50 disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Connector Card ────────────────────────────────────────────────────
function ConnectorCard({
  connector,
  integration,
  onConnect,
  onDisconnect,
}: {
  connector: (typeof CONNECTORS)[number];
  integration?: IntegrationRow;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connected = !!integration?.isActive;

  return (
    <div className={`bg-white rounded-xl border p-5 flex items-start gap-4 ${connected ? "border-green-200" : "border-gray-200"}`}>
      <div className={`p-3 rounded-lg shrink-0 ${connector.color}`}>
        <connector.icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{connector.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {connector.category}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{connector.description}</p>

        {connected && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connected
          </div>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        {connected ? (
          <>
            <button
              onClick={onConnect}
              className="px-3 py-1.5 text-xs rounded-lg border hover:bg-gray-50 flex items-center gap-1"
            >
              <Settings2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5" /> Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
const CATEGORIES = ["Billing", "SEO", "Analytics", "Ads", "Email"] as const;

export default function IntegrationsPage() {
  const orgId = getOrgId();
  const qc = useQueryClient();
  const [activeModal, setActiveModal] = useState<(typeof CONNECTORS)[number] | null>(null);

  const { data: integrations = [] } = useQuery<IntegrationRow[]>({
    queryKey: ["integrations", orgId],
    queryFn: () => fetchIntegrations(orgId!),
    enabled: !!orgId,
  });

  const disconnectMutation = useMutation({
    mutationFn: (provider: string) => disconnectIntegration(orgId!, provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const getIntegration = (provider: string) => integrations.find((i) => i.provider === provider);
  const connected = integrations.filter((i) => i.isActive).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-500 mt-1">
            Connect your tools to power CRM, SEO, Ads, and Billing with real data.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          {connected} of {CONNECTORS.length} connected
        </div>
      </div>

      {/* Connectors by category */}
      {CATEGORIES.map((cat) => {
        const items = CONNECTORS.filter((c) => c.category === cat);
        return (
          <section key={cat}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {cat}
            </h2>
            <div className="space-y-3">
              {items.map((connector) => (
                <ConnectorCard
                  key={connector.provider}
                  connector={connector}
                  integration={getIntegration(connector.provider)}
                  onConnect={() => setActiveModal(connector)}
                  onDisconnect={() => disconnectMutation.mutate(connector.provider)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Modal */}
      {activeModal && (
        <ConnectModal
          connector={activeModal}
          onClose={() => setActiveModal(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["integrations"] })}
        />
      )}
    </div>
  );
}
