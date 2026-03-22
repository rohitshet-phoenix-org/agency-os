"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { Plus, Building2, Globe, CheckCircle, Clock, X, Mail, Phone } from "lucide-react";

export default function ClientsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", website: "",
    industry: "", contractValue: "", billingCycle: "MONTHLY",
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients").then((r) => r.data),
  });

  const createClient = useMutation({
    mutationFn: (data: any) => api.post("/clients", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); setShowModal(false); resetForm(); },
  });

  function resetForm() {
    setForm({ name: "", email: "", phone: "", company: "", website: "", industry: "", contractValue: "", billingCycle: "MONTHLY" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createClient.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      company: form.company,
      website: form.website || undefined,
      industry: form.industry || undefined,
      contractValue: form.contractValue ? Number(form.contractValue) : undefined,
      billingCycle: form.billingCycle,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clients</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading clients...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c: any) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {getInitials(c.company)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{c.company}</h3>
                  <p className="text-xs text-muted-foreground">{c.name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {c.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.website && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="truncate">{c.website}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{c.industry ?? "Unknown industry"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {c.onboarding?.status === "COMPLETED" ? (
                    <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /><span>Onboarded</span></>
                  ) : (
                    <><Clock className="w-3.5 h-3.5 text-yellow-500" /><span>Onboarding {c.onboarding?.status?.toLowerCase() ?? "pending"}</span></>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{c._count?.projects ?? 0} projects</div>
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No clients yet. Add your first client!</p>
            </div>
          )}
        </div>
      )}

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">Add New Client</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Contact Name *</label>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Company *</label>
                  <input required value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Acme Corp" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="jane@acme.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="+1 555 000 0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Website</label>
                  <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="https://acme.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Industry</label>
                  <input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Technology" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Contract Value ($)</label>
                  <input type="number" min="0" value={form.contractValue} onChange={(e) => setForm((f) => ({ ...f, contractValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="48000" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Billing Cycle</label>
                  <select value={form.billingCycle} onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"].map((b) => <option key={b} value={b}>{b.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createClient.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {createClient.isPending ? "Adding..." : "Add Client"}
                </button>
              </div>
              {createClient.isError && <p className="text-xs text-red-500">Failed to add client. Please try again.</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
