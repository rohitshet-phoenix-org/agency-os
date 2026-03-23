"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getOrgId } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Plus, X, Globe, Phone, Users, TrendingUp, Pencil, Trash2 } from "lucide-react";

const INDUSTRIES = ["Technology","Marketing","Finance","Healthcare","Retail","Education","Manufacturing","Real Estate","Media","Other"];

const emptyForm = {
  name: "", website: "", industry: "", phone: "", billingAddress: "",
  employees: "", revenue: "", notes: "",
};

export default function AccountsPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", orgId, search],
    queryFn: () => api.get(`/accounts?orgId=${orgId}&limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`).then(r => r.data),
  });

  const accounts = data?.accounts ?? [];

  const create = useMutation({
    mutationFn: (d: any) => api.post("/accounts", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); closeModal(); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/accounts/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  function openNew() { setEditAccount(null); setForm({ ...emptyForm }); setShowModal(true); }
  function openEdit(a: any) {
    setEditAccount(a);
    setForm({ name: a.name, website: a.website ?? "", industry: a.industry ?? "",
      phone: a.phone ?? "", billingAddress: a.billingAddress ?? "",
      employees: a.employees ?? "", revenue: a.revenue ?? "", notes: a.notes ?? "" });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditAccount(null); setForm({ ...emptyForm }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { name: form.name };
    if (form.website) payload.website = form.website;
    if (form.industry) payload.industry = form.industry;
    if (form.phone) payload.phone = form.phone;
    if (form.billingAddress) payload.billingAddress = form.billingAddress;
    if (form.employees) payload.employees = Number(form.employees);
    if (form.revenue) payload.revenue = Number(form.revenue);
    if (form.notes) payload.notes = form.notes;
    if (editAccount) update.mutate({ id: editAccount.id, ...payload });
    else create.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading accounts...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Accounts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{accounts.length} companies</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Search accounts..." />

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account: any) => (
          <div key={account.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-indigo-600">{account.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(account)} className="p-1 hover:bg-muted rounded">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => remove.mutate(account.id)} className="p-1 hover:bg-red-50 rounded">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground">{account.name}</h3>
            {account.industry && <p className="text-xs text-muted-foreground mt-0.5">{account.industry}</p>}
            <div className="mt-3 space-y-1.5">
              {account.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  <a href={account.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate">{account.website}</a>
                </div>
              )}
              {account.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{account.phone}</span>
                </div>
              )}
              {account.revenue && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Revenue: {formatCurrency(account.revenue)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex gap-4">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{account._count?.contacts ?? 0} contacts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{account._count?.deals ?? 0} deals</span>
              </div>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">No accounts yet. Add your first account!</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">{editAccount ? "Edit Account" : "Add New Account"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Company Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Acme Corporation" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Industry</label>
                  <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— Select —</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
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
                  <label className="text-sm font-medium text-foreground block mb-1.5">Employees</label>
                  <input type="number" min="0" value={form.employees} onChange={e => setForm(f => ({ ...f, employees: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="50" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Annual Revenue ($)</label>
                  <input type="number" min="0" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="1000000" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Billing Address</label>
                <textarea value={form.billingAddress} onChange={e => setForm(f => ({ ...f, billingAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={2} />
              </div>
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
                  {(create.isPending || update.isPending) ? "Saving..." : editAccount ? "Save Changes" : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
