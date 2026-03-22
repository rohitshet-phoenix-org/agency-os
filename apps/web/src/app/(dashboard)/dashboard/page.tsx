"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, Users, Briefcase, TrendingUp, CheckSquare,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const MOCK_REVENUE = [
  { month: "Jan", revenue: 42000, spend: 12000 },
  { month: "Feb", revenue: 48000, spend: 14000 },
  { month: "Mar", revenue: 45000, spend: 13000 },
  { month: "Apr", revenue: 53000, spend: 15000 },
  { month: "May", revenue: 58000, spend: 16000 },
  { month: "Jun", revenue: 62000, spend: 17000 },
];

const MOCK_CHANNELS = [
  { name: "SEO", value: 35, color: "#6366f1" },
  { name: "PPC", value: 25, color: "#8b5cf6" },
  { name: "Social", value: 20, color: "#06b6d4" },
  { name: "Email", value: 12, color: "#10b981" },
  { name: "Other", value: 8, color: "#f59e0b" },
];

function StatCard({ label, value, change, icon: Icon, color }: any) {
  const up = change >= 0;
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3">
        {up ? (
          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${up ? "text-emerald-500" : "text-red-500"}`}>
          {Math.abs(change)}%
        </span>
        <span className="text-sm text-muted-foreground">vs last month</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Command Center</h2>
        <p className="text-muted-foreground text-sm mt-1">Welcome back. Here&apos;s what&apos;s happening across all clients.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Monthly Revenue" value={formatCurrency(62000)} change={6.9} icon={DollarSign} color="bg-primary" />
        <StatCard label="Active Clients" value="24" change={4.2} icon={Users} color="bg-violet-500" />
        <StatCard label="Active Projects" value="38" change={-2.1} icon={Briefcase} color="bg-cyan-500" />
        <StatCard label="Avg. ROAS" value="4.2x" change={8.5} icon={TrendingUp} color="bg-emerald-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Revenue vs Ad Spend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={MOCK_REVENUE}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenue)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="spend" stroke="#8b5cf6" fill="none" strokeWidth={2} strokeDasharray="4 4" name="Ad Spend" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Mix */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Traffic by Channel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={MOCK_CHANNELS} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                {MOCK_CHANNELS.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Tasks */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Overdue Tasks</h3>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">5 overdue</span>
          </div>
          <div className="space-y-3">
            {[
              { title: "Finalize Meta Ads campaign for Q1", client: "Acme Corp", due: "2 days ago", priority: "HIGH" },
              { title: "Monthly SEO report for TechStart", client: "TechStart", due: "1 day ago", priority: "MEDIUM" },
              { title: "Social media calendar for March", client: "Fashion Co", due: "Today", priority: "HIGH" },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.client} · Due {t.due}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${t.priority === "HIGH" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">This Week</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Posts Scheduled", value: "47", icon: "📅" },
              { label: "Emails Sent", value: "2,840", icon: "📧" },
              { label: "Leads Generated", value: "18", icon: "🎯" },
              { label: "Invoices Paid", value: "$34,500", icon: "💰" },
              { label: "Tasks Completed", value: "63", icon: "✅" },
              { label: "Reports Sent", value: "8", icon: "📊" },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/40 flex items-center gap-3">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
