"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, DollarSign, MousePointer, ShoppingCart, Plus, RefreshCw } from "lucide-react";

const MOCK_CAMPAIGNS = [
  { name: "Brand Awareness Q1", platform: "GOOGLE_ADS", status: "active", spend: 4200, impressions: 142000, clicks: 3840, conversions: 127, roas: 4.8 },
  { name: "Retargeting — All Visitors", platform: "META_ADS", status: "active", spend: 1800, impressions: 68000, clicks: 2100, conversions: 89, roas: 5.2 },
  { name: "Lead Gen — Business Owners", platform: "LINKEDIN_ADS", status: "active", spend: 2200, impressions: 34000, clicks: 920, conversions: 42, roas: 3.1 },
  { name: "Summer Promo", platform: "META_ADS", status: "paused", spend: 680, impressions: 22000, clicks: 540, conversions: 18, roas: 2.4 },
];

const MOCK_DAILY = [
  { date: "Mar 17", google: 1200, meta: 680, linkedin: 440 },
  { date: "Mar 18", google: 1350, meta: 720, linkedin: 480 },
  { date: "Mar 19", google: 1100, meta: 650, linkedin: 390 },
  { date: "Mar 20", google: 1420, meta: 810, linkedin: 520 },
  { date: "Mar 21", google: 1280, meta: 760, linkedin: 440 },
  { date: "Mar 22", google: 1180, meta: 690, linkedin: 410 },
];

const PLATFORM_BADGE: Record<string, string> = {
  GOOGLE_ADS: "bg-blue-100 text-blue-700",
  META_ADS: "bg-indigo-100 text-indigo-700",
  LINKEDIN_ADS: "bg-sky-100 text-sky-700",
  TIKTOK_ADS: "bg-pink-100 text-pink-700",
};

export default function AdsPage() {
  const totalSpend = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalConversions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0);
  const avgRoas = (MOCK_CAMPAIGNS.reduce((s, c) => s + c.roas, 0) / MOCK_CAMPAIGNS.length).toFixed(1);
  const totalImpressions = MOCK_CAMPAIGNS.reduce((s, c) => s + c.impressions, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ads Manager</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Cross-platform campaign performance</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-border text-sm rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Sync All
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Connect Account
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Spend</p>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Avg. ROAS</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{avgRoas}x</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Conversions</p>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalConversions}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Impressions</p>
            <MousePointer className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatNumber(totalImpressions)}</p>
        </div>
      </div>

      {/* Spend Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Daily Spend by Platform</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={MOCK_DAILY}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Legend iconSize={8} />
            <Bar dataKey="google" fill="#6366f1" name="Google Ads" radius={[3, 3, 0, 0]} stackId="a" />
            <Bar dataKey="meta" fill="#8b5cf6" name="Meta Ads" radius={[0, 0, 0, 0]} stackId="a" />
            <Bar dataKey="linkedin" fill="#06b6d4" name="LinkedIn Ads" radius={[3, 3, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Campaigns Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Campaigns</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Campaign</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Platform</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Spend</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Impressions</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Clicks</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Conv.</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">ROAS</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CAMPAIGNS.map((c, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/10 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLATFORM_BADGE[c.platform]}`}>
                    {c.platform.replace("_ADS", "")}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">{formatCurrency(c.spend)}</td>
                <td className="px-5 py-3 text-right text-muted-foreground">{formatNumber(c.impressions)}</td>
                <td className="px-5 py-3 text-right text-muted-foreground">{formatNumber(c.clicks)}</td>
                <td className="px-5 py-3 text-right">{c.conversions}</td>
                <td className={`px-5 py-3 text-right font-bold ${c.roas >= 4 ? "text-emerald-600" : c.roas >= 2 ? "text-yellow-600" : "text-red-500"}`}>
                  {c.roas}x
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
