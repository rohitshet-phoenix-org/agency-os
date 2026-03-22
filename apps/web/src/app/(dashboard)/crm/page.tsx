"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, STATUS_COLORS } from "@/lib/utils";
import { Plus, Phone, Mail, Globe, ChevronRight } from "lucide-react";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATING", "WON", "LOST"] as const;

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost",
};

export default function CRMPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showNew, setShowNew] = useState(false);

  // In production, get orgId from auth context/store
  const orgId = "demo-org";
  const { data, isLoading } = useQuery({
    queryKey: ["leads", orgId],
    queryFn: () => api.get(`/leads?orgId=${orgId}&limit=100`).then((r) => r.data),
  });

  const leads = data?.leads ?? [];

  const byStage = (stage: string) => leads.filter((l: any) => l.status === stage);

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading CRM...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">CRM Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{leads.length} leads · {byStage("WON").length} won</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["kanban", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium capitalize ${view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Pipeline Value */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Pipeline", value: leads.reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0), color: "text-foreground" },
          { label: "Qualified", value: byStage("QUALIFIED").reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0), color: "text-purple-600" },
          { label: "In Proposal", value: byStage("PROPOSAL_SENT").reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0), color: "text-orange-600" },
          { label: "Won This Month", value: byStage("WON").reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0), color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{formatCurrency(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.filter((s) => !["WON", "LOST"].includes(s)).map((stage) => (
            <div key={stage} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[stage]}`}>
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="text-xs text-muted-foreground">{byStage(stage).length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {byStage(stage).map((lead: any) => (
                  <div key={lead.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{lead.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.company}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {lead.estimatedValue && (
                      <p className="text-sm font-semibold text-emerald-600 mt-2">{formatCurrency(lead.estimatedValue)}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {lead.email && <Mail className="w-3 h-3 text-muted-foreground" />}
                      {lead.phone && <Phone className="w-3 h-3 text-muted-foreground" />}
                      {lead.website && <Globe className="w-3 h-3 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground ml-auto">{lead.source?.toLowerCase().replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
                {byStage(stage).length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground">
                    No leads
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: any) => (
                <tr key={lead.id} className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status]}`}>
                      {STAGE_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{lead.source?.replace("_", " ")}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">No leads yet. Add your first lead!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
