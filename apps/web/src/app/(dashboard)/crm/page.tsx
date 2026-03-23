"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { getOrgId } from "@/lib/auth";
import {
  Target, Users, Building2, TrendingUp, FileText,
  ShieldAlert, Phone, CalendarClock, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export default function CRMOverviewPage() {
  const orgId = getOrgId();

  const { data: leadsData }    = useQuery({ queryKey: ["leads", orgId],    queryFn: () => api.get(`/leads?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: contactsData } = useQuery({ queryKey: ["contacts", orgId], queryFn: () => api.get(`/contacts?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: accountsData } = useQuery({ queryKey: ["accounts", orgId], queryFn: () => api.get(`/accounts?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: dealsData }    = useQuery({ queryKey: ["deals", orgId],    queryFn: () => api.get(`/deals?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: casesData }    = useQuery({ queryKey: ["cases", orgId],    queryFn: () => api.get(`/cases?orgId=${orgId}&limit=10`).then(r => r.data) });
  const { data: meetingsData } = useQuery({ queryKey: ["meetings", orgId], queryFn: () => api.get(`/meetings?orgId=${orgId}&limit=5`).then(r => r.data) });

  const leads    = leadsData?.leads    ?? leadsData    ?? [];
  const contacts = contactsData?.contacts ?? [];
  const accounts = accountsData?.accounts ?? [];
  const deals    = dealsData?.deals    ?? [];
  const cases    = casesData?.cases    ?? [];
  const meetings = meetingsData?.meetings ?? [];

  const wonDeals      = deals.filter((d: any) => d.stage === "WON");
  const activeDeals   = deals.filter((d: any) => !["WON","LOST"].includes(d.stage));
  const pipeline      = activeDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0);
  const wonValue      = wonDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0);
  const openCases     = cases.filter((c: any) => c.status === "OPEN").length;

  const stats = [
    { label: "Leads",          value: leads.length,      icon: Target,       href: "/crm/leads",      color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Contacts",       value: contacts.length,   icon: Users,        href: "/crm/contacts",   color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Accounts",       value: accounts.length,   icon: Building2,    href: "/crm/accounts",   color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Active Deals",   value: activeDeals.length,icon: TrendingUp,   href: "/crm/deals",      color: "text-emerald-600",bg: "bg-emerald-50" },
    { label: "Pipeline Value", value: formatCurrency(pipeline), icon: TrendingUp, href: "/crm/deals", color: "text-emerald-600",bg: "bg-emerald-50", isText: true },
    { label: "Won Value",      value: formatCurrency(wonValue), icon: TrendingUp, href: "/crm/deals", color: "text-green-600",  bg: "bg-green-50",  isText: true },
    { label: "Open Cases",     value: openCases,         icon: ShieldAlert,  href: "/crm/cases",      color: "text-red-600",    bg: "bg-red-50" },
    { label: "Meetings",       value: meetings.length,   icon: CalendarClock,href: "/crm/activities", color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const DEAL_STAGES = ["PROSPECTING","QUALIFICATION","NEEDS_ANALYSIS","VALUE_PROPOSITION","DECISION_MAKING","PROPOSAL","NEGOTIATION"];
  const pipelineStages = DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((d: any) => d.stage === stage);
    return { stage, count: stageDeals.length, value: stageDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">CRM Overview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Your complete sales pipeline at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.filter((_, i) => i < 4).map((s) => (
          <Link key={s.label} href={s.href}
            className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Pipeline + Won Value */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Pipeline</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(pipeline)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{activeDeals.length} active deals</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Won This Period</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(wonValue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{wonDeals.length} deals closed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pipeline by Stage */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Pipeline by Stage</h3>
            <Link href="/crm/deals" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {pipelineStages.map(({ stage, count, value }) => (
              <div key={stage} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground w-36 truncate">
                    {stage.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </div>
                <span className="text-sm font-medium text-foreground">{formatCurrency(value)}</span>
              </div>
            ))}
            {pipelineStages.every(s => s.count === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No active deals yet</p>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Leads</h3>
            <Link href="/crm/leads" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead: any) => (
              <div key={lead.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.company ?? lead.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ml-2 whitespace-nowrap">
                  {lead.status?.replace(/_/g, " ")}
                </span>
              </div>
            ))}
            {leads.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No leads yet</p>}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Upcoming Meetings</h3>
            <Link href="/crm/activities" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {meetings.slice(0, 4).map((m: any) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.startAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {meetings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No meetings scheduled</p>}
          </div>
        </div>

        {/* Open Cases */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Open Cases</h3>
            <Link href="/crm/cases" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {cases.filter((c: any) => c.status === "OPEN").slice(0, 4).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">{c.category ?? "General"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ml-2 whitespace-nowrap ${
                  c.priority === "URGENT" ? "bg-red-100 text-red-700" :
                  c.priority === "HIGH"   ? "bg-orange-100 text-orange-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>{c.priority}</span>
              </div>
            ))}
            {openCases === 0 && <p className="text-sm text-muted-foreground text-center py-4">No open cases</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
