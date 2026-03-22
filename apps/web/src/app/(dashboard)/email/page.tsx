"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, STATUS_COLORS } from "@/lib/utils";
import { Plus, Mail, Users, BarChart2, Send } from "lucide-react";

export default function EmailPage() {
  const orgId = "demo-org";

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["email-campaigns", orgId],
    queryFn: () => api.get(`/email/campaigns?orgId=${orgId}`).then((r) => r.data),
  });

  const { data: lists = [] } = useQuery({
    queryKey: ["email-lists", orgId],
    queryFn: () => api.get(`/email/lists?orgId=${orgId}`).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Marketing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Campaigns, sequences, and subscriber management</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <Mail className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{campaigns.length}</p>
          <p className="text-sm text-muted-foreground">Total Campaigns</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <Users className="w-5 h-5 text-cyan-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {lists.reduce((s: number, l: any) => s + (l._count?.subscribers ?? 0), 0).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">Total Subscribers</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <BarChart2 className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">28.4%</p>
          <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <Send className="w-5 h-5 text-violet-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">4.8%</p>
          <p className="text-sm text-muted-foreground">Avg. Click Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Campaigns */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Campaigns</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Sent</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Open Rate</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No campaigns yet</td></tr>
              ) : (
                campaigns.map((c: any) => {
                  const openRate = c.totalSent > 0 ? ((c.totalOpened / c.totalSent) * 100).toFixed(1) : "—";
                  return (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/10 transition-colors cursor-pointer">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.subject}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{c.totalSent.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-medium text-foreground">{openRate !== "—" ? `${openRate}%` : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Lists */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Lists</h3>
            <button className="text-xs text-primary hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <div className="divide-y divide-border">
            {lists.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No lists yet</div>
            ) : (
              lists.map((l: any) => (
                <div key={l.id} className="px-5 py-3 hover:bg-muted/20 cursor-pointer transition-colors">
                  <p className="font-medium text-sm text-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l._count?.subscribers ?? 0} subscribers</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
