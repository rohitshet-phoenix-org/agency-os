"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, STATUS_COLORS } from "@/lib/utils";
import { Plus, Mail, Users, BarChart2, Send, X } from "lucide-react";

export default function EmailPage() {
  const qc = useQueryClient();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "", subject: "", previewText: "", htmlBody: "", listId: "",
  });
  const [listForm, setListForm] = useState({ name: "", description: "" });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: () => api.get("/email/campaigns").then((r) => r.data),
  });

  const { data: lists = [] } = useQuery({
    queryKey: ["email-lists"],
    queryFn: () => api.get("/email/lists").then((r) => r.data),
  });

  const createCampaign = useMutation({
    mutationFn: (data: any) => api.post("/email/campaigns", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-campaigns"] }); setShowCampaignModal(false); setCampaignForm({ name: "", subject: "", previewText: "", htmlBody: "", listId: "" }); },
  });

  const createList = useMutation({
    mutationFn: (data: any) => api.post("/email/lists", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-lists"] }); setShowListModal(false); setListForm({ name: "", description: "" }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Marketing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Campaigns, sequences, and subscriber management</p>
        </div>
        <button onClick={() => setShowCampaignModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
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
          <p className="text-2xl font-bold text-foreground">
            {campaigns.length > 0
              ? `${(campaigns.reduce((s: number, c: any) => s + (c.totalSent > 0 ? c.totalOpened / c.totalSent : 0), 0) / campaigns.length * 100).toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <Send className="w-5 h-5 text-violet-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {campaigns.length > 0
              ? `${(campaigns.reduce((s: number, c: any) => s + (c.totalSent > 0 ? c.totalClicked / c.totalSent : 0), 0) / campaigns.length * 100).toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-sm text-muted-foreground">Avg. Click Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Campaigns Table */}
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

        {/* Lists Sidebar */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Lists</h3>
            <button onClick={() => setShowListModal(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
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

      {/* New Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">New Campaign</h3>
              <button onClick={() => setShowCampaignModal(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createCampaign.mutate({ ...campaignForm, listId: campaignForm.listId || lists[0]?.id }); }} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Campaign Name *</label>
                <input required value={campaignForm.name} onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="March Newsletter" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Subject Line *</label>
                <input required value={campaignForm.subject} onChange={(e) => setCampaignForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Your March updates are here 🎉" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Preview Text</label>
                <input value={campaignForm.previewText} onChange={(e) => setCampaignForm((f) => ({ ...f, previewText: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Shown in email preview..." />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">List</label>
                <select value={campaignForm.listId} onChange={(e) => setCampaignForm((f) => ({ ...f, listId: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select a list...</option>
                  {lists.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">HTML Body *</label>
                <textarea required value={campaignForm.htmlBody} onChange={(e) => setCampaignForm((f) => ({ ...f, htmlBody: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-mono"
                  rows={5} placeholder="<h1>Hello!</h1><p>Your email content...</p>" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCampaignModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createCampaign.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {createCampaign.isPending ? "Creating..." : "Create Campaign"}
                </button>
              </div>
              {createCampaign.isError && <p className="text-xs text-red-500">Failed to create campaign.</p>}
            </form>
          </div>
        </div>
      )}

      {/* New List Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">New List</h3>
              <button onClick={() => setShowListModal(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createList.mutate(listForm); }} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">List Name *</label>
                <input required value={listForm.name} onChange={(e) => setListForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Main Newsletter" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea value={listForm.description} onChange={(e) => setListForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={2} placeholder="Optional description" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowListModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createList.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {createList.isPending ? "Creating..." : "Create List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
