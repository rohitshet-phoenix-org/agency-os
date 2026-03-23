"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, STATUS_COLORS } from "@/lib/utils";
import { getOrgId } from "@/lib/auth";
import { Plus, Phone, Mail, Globe, ChevronRight, X, Pencil, Trash2 } from "lucide-react";

const STAGES = ["NEW","CONTACTED","QUALIFIED","PROPOSAL_SENT","NEGOTIATING","WON","LOST"] as const;
const SOURCES = ["REFERRAL","COLD_OUTREACH","INBOUND_SEO","INBOUND_ADS","LINKEDIN","EVENT","OTHER"];
const STAGE_LABELS: Record<string, string> = {
  NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent", NEGOTIATING: "Negotiating", WON: "Won", LOST: "Lost",
};

const emptyForm = {
  name: "", email: "", phone: "", company: "", website: "",
  status: "NEW", source: "OTHER", estimatedValue: "", notes: "",
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ["leads", orgId],
    queryFn: () => api.get(`/leads?orgId=${orgId}&limit=200`).then(r => r.data),
  });

  const leads = data?.leads ?? data ?? [];

  const byStage = (stage: string) => leads.filter((l: any) => l.status === stage);

  const createLead = useMutation({
    mutationFn: (d: any) => api.post("/leads", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); closeModal(); },
  });

  const updateLead = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/leads/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); closeModal(); },
  });

  const deleteLead = useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const convertLead = useMutation({
    mutationFn: (id: string) => api.post(`/leads/${id}/convert`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  function openNew() { setEditLead(null); setForm({ ...emptyForm }); setShowModal(true); }
  function openEdit(lead: any) {
    setEditLead(lead);
    setForm({ name: lead.name, email: lead.email, phone: lead.phone ?? "", company: lead.company ?? "",
      website: lead.website ?? "", status: lead.status, source: lead.source, estimatedValue: lead.estimatedValue ?? "", notes: lead.notes ?? "" });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditLead(null); setForm({ ...emptyForm }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name, email: form.email,
      phone: form.phone || undefined, company: form.company || undefined,
      website: form.website || undefined, status: form.status, source: form.source,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      notes: form.notes || undefined,
    };
    if (editLead) updateLead.mutate({ id: editLead.id, ...payload });
    else createLead.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading leads...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Leads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{leads.length} total · {byStage("WON").length} won</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["kanban","list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium capitalize ${view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Pipeline Value Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Pipeline", value: leads.reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0), color: "text-foreground" },
          { label: "Qualified", value: byStage("QUALIFIED").reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0), color: "text-purple-600" },
          { label: "In Proposal", value: byStage("PROPOSAL_SENT").reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0), color: "text-orange-600" },
          { label: "Won", value: byStage("WON").reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0), color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{formatCurrency(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <div key={stage} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[stage] ?? "bg-gray-100 text-gray-700"}`}>
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-muted-foreground">{byStage(stage).length}</span>
              </div>
              <div className="space-y-2">
                {byStage(stage).map((lead: any) => (
                  <div key={lead.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.company}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button onClick={() => openEdit(lead)} className="p-1 hover:bg-muted rounded">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => deleteLead.mutate(lead.id)} className="p-1 hover:bg-red-50 rounded">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                    {lead.estimatedValue && (
                      <p className="text-sm font-semibold text-emerald-600 mt-2">{formatCurrency(lead.estimatedValue)}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {lead.email && <Mail className="w-3 h-3 text-muted-foreground" />}
                      {lead.phone && <Phone className="w-3 h-3 text-muted-foreground" />}
                      {lead.website && <Globe className="w-3 h-3 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground ml-auto">{lead.source?.replace(/_/g, " ").toLowerCase()}</span>
                    </div>
                    {lead.status !== "WON" && lead.status !== "LOST" && (
                      <button onClick={() => convertLead.mutate(lead.id)}
                        className="mt-2 w-full text-xs text-primary border border-primary/30 rounded-lg py-1 hover:bg-primary/5 transition-colors">
                        Convert to Client
                      </button>
                    )}
                  </div>
                ))}
                {byStage(stage).length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground">Empty</div>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: any) => (
                <tr key={lead.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {STAGE_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{lead.source?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(lead)} className="p-1.5 hover:bg-muted rounded-lg">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteLead.mutate(lead.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No leads yet. Add your first lead!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">{editLead ? "Edit Lead" : "Add New Lead"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="John Smith" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="john@company.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Company</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Acme Inc" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="+1 555 000 0000" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Website</label>
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://acme.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Estimated Value ($)</label>
                <input type="number" min="0" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="12000" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={2} placeholder="Any additional notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createLead.isPending || updateLead.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {(createLead.isPending || updateLead.isPending) ? "Saving..." : editLead ? "Save Changes" : "Add Lead"}
                </button>
              </div>
              {(createLead.isError || updateLead.isError) && <p className="text-xs text-red-500">Failed to save. Please try again.</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
