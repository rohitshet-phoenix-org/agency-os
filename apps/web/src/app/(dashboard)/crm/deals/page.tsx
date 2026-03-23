"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { getOrgId } from "@/lib/auth";
import { Plus, X, Pencil, Trash2, Building2, ChevronRight } from "lucide-react";

const DEAL_STAGES = ["PROSPECTING","QUALIFICATION","NEEDS_ANALYSIS","VALUE_PROPOSITION","DECISION_MAKING","PROPOSAL","NEGOTIATION","WON","LOST"] as const;
const SOURCES = ["REFERRAL","COLD_OUTREACH","INBOUND_SEO","INBOUND_ADS","LINKEDIN","EVENT","OTHER"];

const STAGE_COLORS: Record<string, string> = {
  PROSPECTING: "bg-slate-100 text-slate-700",
  QUALIFICATION: "bg-blue-100 text-blue-700",
  NEEDS_ANALYSIS: "bg-indigo-100 text-indigo-700",
  VALUE_PROPOSITION: "bg-violet-100 text-violet-700",
  DECISION_MAKING: "bg-yellow-100 text-yellow-700",
  PROPOSAL: "bg-orange-100 text-orange-700",
  NEGOTIATION: "bg-pink-100 text-pink-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

const STAGE_PROB: Record<string, number> = {
  PROSPECTING: 10, QUALIFICATION: 20, NEEDS_ANALYSIS: 30,
  VALUE_PROPOSITION: 40, DECISION_MAKING: 60, PROPOSAL: 75,
  NEGOTIATION: 90, WON: 100, LOST: 0,
};

const emptyForm = {
  name: "", accountId: "", value: "", stage: "PROSPECTING", probability: "10",
  expectedCloseDate: "", source: "OTHER", notes: "", lostReason: "",
};

export default function DealsPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showModal, setShowModal] = useState(false);
  const [editDeal, setEditDeal] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ["deals", orgId],
    queryFn: () => api.get(`/deals?orgId=${orgId}&limit=200`).then(r => r.data),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts", orgId],
    queryFn: () => api.get(`/accounts?orgId=${orgId}&limit=100`).then(r => r.data),
  });

  const deals = data?.deals ?? [];
  const accounts = accountsData?.accounts ?? [];

  const byStage = (stage: string) => deals.filter((d: any) => d.stage === stage);
  const activeDeals = deals.filter((d: any) => !["WON","LOST"].includes(d.stage));
  const pipeline = activeDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0);
  const weighted = activeDeals.reduce((s: number, d: any) => s + ((d.value ?? 0) * (d.probability / 100)), 0);

  const create = useMutation({
    mutationFn: (d: any) => api.post("/deals", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deals"] }); closeModal(); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/deals/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deals"] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  function openNew() { setEditDeal(null); setForm({ ...emptyForm }); setShowModal(true); }
  function openEdit(d: any) {
    setEditDeal(d);
    setForm({ name: d.name, accountId: d.accountId ?? "", value: d.value ?? "",
      stage: d.stage, probability: d.probability, source: d.source,
      expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.slice(0, 10) : "",
      notes: d.notes ?? "", lostReason: d.lostReason ?? "" });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditDeal(null); setForm({ ...emptyForm }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      name: form.name, stage: form.stage,
      probability: Number(form.probability), source: form.source,
    };
    if (form.accountId) payload.accountId = form.accountId;
    if (form.value) payload.value = Number(form.value);
    if (form.expectedCloseDate) payload.expectedCloseDate = form.expectedCloseDate;
    if (form.notes) payload.notes = form.notes;
    if (form.lostReason) payload.lostReason = form.lostReason;
    if (editDeal) update.mutate({ id: editDeal.id, ...payload });
    else create.mutate(payload);
  }

  // Auto-fill probability when stage changes
  function handleStageChange(stage: string) {
    setForm(f => ({ ...f, stage, probability: String(STAGE_PROB[stage] ?? f.probability) }));
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading deals...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Deals</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{activeDeals.length} active · {byStage("WON").length} won</p>
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
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Deals", value: String(deals.length), color: "text-foreground" },
          { label: "Pipeline Value", value: formatCurrency(pipeline), color: "text-emerald-600" },
          { label: "Weighted Value", value: formatCurrency(weighted), color: "text-blue-600" },
          { label: "Won Value", value: formatCurrency(byStage("WON").reduce((s: number, d: any) => s + (d.value ?? 0), 0)), color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map(stage => (
            <div key={stage} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                  {stage.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-muted-foreground">{byStage(stage).length}</span>
              </div>
              <div className="space-y-2">
                {byStage(stage).map((deal: any) => (
                  <div key={deal.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate flex-1">{deal.name}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button onClick={() => openEdit(deal)} className="p-1 hover:bg-muted rounded">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => remove.mutate(deal.id)} className="p-1 hover:bg-red-50 rounded">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                    {deal.account && (
                      <div className="flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{deal.account.name}</span>
                      </div>
                    )}
                    {deal.value && <p className="text-sm font-semibold text-emerald-600 mt-2">{formatCurrency(deal.value)}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{deal.probability}% probability</span>
                      {deal.expectedCloseDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(deal.expectedCloseDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Probability</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Close Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal: any) => (
                <tr key={deal.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{deal.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{deal.account?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[deal.stage]}`}>
                      {deal.stage.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{deal.value ? formatCurrency(deal.value) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{deal.probability}%</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(deal)} className="p-1.5 hover:bg-muted rounded-lg">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => remove.mutate(deal.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No deals yet. Add your first deal!</td></tr>
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
              <h3 className="font-semibold text-foreground">{editDeal ? "Edit Deal" : "Add New Deal"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Deal Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="New SEO Campaign Deal" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Account</label>
                  <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— No Account —</option>
                    {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Value ($)</label>
                  <input type="number" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="25000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Stage</label>
                  <select value={form.stage} onChange={e => handleStageChange(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {DEAL_STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Probability (%)</label>
                  <input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Expected Close Date</label>
                  <input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              {form.stage === "LOST" && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Lost Reason</label>
                  <input value={form.lostReason} onChange={e => setForm(f => ({ ...f, lostReason: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={create.isPending || update.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {(create.isPending || update.isPending) ? "Saving..." : editDeal ? "Save Changes" : "Add Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
