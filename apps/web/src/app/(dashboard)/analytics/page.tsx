"use client";

import { useState } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Eye, MousePointer, ShoppingCart, DollarSign } from "lucide-react";

const MOCK_DATA = [
  { date: "Mar 1", sessions: 4200, clicks: 380, conversions: 42, spend: 2100, revenue: 8800 },
  { date: "Mar 5", sessions: 4800, clicks: 420, conversions: 48, spend: 2300, revenue: 9600 },
  { date: "Mar 10", sessions: 5200, clicks: 480, conversions: 55, spend: 2500, revenue: 11000 },
  { date: "Mar 15", sessions: 4900, clicks: 450, conversions: 51, spend: 2400, revenue: 10200 },
  { date: "Mar 20", sessions: 5600, clicks: 510, conversions: 62, spend: 2700, revenue: 12400 },
  { date: "Mar 25", sessions: 6100, clicks: 560, conversions: 70, spend: 2900, revenue: 14000 },
];

const PLATFORMS = [
  { name: "Google Ads", spend: 12400, conversions: 284, roas: 4.2, color: "#6366f1" },
  { name: "Meta Ads", spend: 8600, conversions: 196, roas: 3.8, color: "#8b5cf6" },
  { name: "Google Analytics", sessions: 42800, bounceRate: "38%", avgDuration: "2m 14s", color: "#06b6d4" },
];

function MetricCard({ label, value, change, icon: Icon, prefix = "" }: any) {
  const up = change >= 0;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mt-2 text-foreground">{prefix}{typeof value === "number" ? formatNumber(value) : value}</p>
      <div className="flex items-center gap-1 mt-2">
        {up ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
        <span className={`text-xs font-medium ${up ? "text-emerald-500" : "text-red-500"}`}>{Math.abs(change)}%</span>
        <span className="text-xs text-muted-foreground">vs prev period</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [client, setClient] = useState("all");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Unified view across all channels & platforms</p>
        </div>
        <div className="flex gap-2">
          <select value={client} onChange={(e) => setClient(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Clients</option>
            <option value="acme">Acme Corp</option>
            <option value="techstart">TechStart</option>
          </select>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {["7d", "30d", "90d"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm ${period === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Total Sessions" value={29600} change={8.4} icon={Eye} />
        <MetricCard label="Total Clicks" value={2798} change={5.2} icon={MousePointer} />
        <MetricCard label="Conversions" value={328} change={12.1} icon={ShoppingCart} />
        <MetricCard label="Total Revenue" value="$65,200" change={9.3} icon={DollarSign} />
      </div>

      {/* Main Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Sessions & Conversions Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={MOCK_DATA}>
            <defs>
              <linearGradient id="sessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="sessions" stroke="#6366f1" fill="url(#sessions)" strokeWidth={2} name="Sessions" />
            <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={false} name="Conversions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Spend vs Revenue */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Spend vs Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="spend" fill="#8b5cf6" name="Ad Spend" radius={[3, 3, 0, 0]} />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Table */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Platform Performance</h3>
          <div className="space-y-3">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full" style={{ backgroundColor: p.color }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.spend ? `Spend: ${formatCurrency(p.spend)}` : `Sessions: ${formatNumber(p.sessions!)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {p.roas && <p className="text-sm font-bold text-emerald-600">{p.roas}x ROAS</p>}
                  {p.conversions && <p className="text-xs text-muted-foreground">{p.conversions} conversions</p>}
                  {p.bounceRate && <p className="text-sm font-medium text-foreground">{p.bounceRate} bounce</p>}
                  {p.avgDuration && <p className="text-xs text-muted-foreground">Avg {p.avgDuration}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
