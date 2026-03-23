"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { getOrgId } from "@/lib/auth";
import { Plus, X, Pencil, Trash2, FileText, PlusCircle, MinusCircle } from "lucide-react";

const QUOTE_STATUSES = ["DRAFT","SENT","ACCEPTED","DECLINED","EXPIRED"];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
};

type LineItem = { productId: string; description: string; quantity: string; unitPrice: string };

const emptyItem = (): LineItem => ({ productId: "", description: "", quantity: "1", unitPrice: "0" });
const emptyForm = { title: "", dealId: "", contactId: "", status: "DRAFT", validUntil: "", currency: "USD", notes: "" };

export default function QuotesPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [showModal, setShowModal] = useState(false);
  const [editQuote, setEditQuote] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const { data, isLoading } = useQuery({
    queryKey: ["quotes", orgId],
    queryFn: () => api.get(`/quotes?orgId=${orgId}&limit=100`).then(r => r.data),
  });

  const { data: dealsData } = useQuery({ queryKey: ["deals", orgId], queryFn: () => api.get(`/deals?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: contactsData } = useQuery({ queryKey: ["contacts", orgId], queryFn: () => api.get(`/contacts?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: productsData } = useQuery({ queryKey: ["products", orgId], queryFn: () => api.get(`/products?orgId=${orgId}&isActive=true`).then(r => r.data) });

  const quotes = data?.quotes ?? [];
  const deals = dealsData?.deals ?? [];
  const contacts = contactsData?.contacts ?? [];
  const products = productsData?.products ?? [];

  const subtotal = items.reduce((s, item) => s + Number(item.quantity) * Number(item.unitPrice), 0);

  const create = useMutation({
    mutationFn: (d: any) => api.post("/quotes", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); closeModal(); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/quotes/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  function openNew() { setEditQuote(null); setForm({ ...emptyForm }); setItems([emptyItem()]); setShowModal(true); }
  function openEdit(q: any) {
    setEditQuote(q);
    setForm({ title: q.title, dealId: q.dealId ?? "", contactId: q.contactId ?? "",
      status: q.status, validUntil: q.validUntil ? q.validUntil.slice(0, 10) : "",
      currency: q.currency, notes: q.notes ?? "" });
    setItems(q.items?.length ? q.items.map((i: any) => ({
      productId: i.productId ?? "", description: i.description,
      quantity: String(i.quantity), unitPrice: String(i.unitPrice),
    })) : [emptyItem()]);
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditQuote(null); setForm({ ...emptyForm }); setItems([emptyItem()]); }

  function handleProductSelect(index: number, productId: string) {
    const product = products.find((p: any) => p.id === productId);
    setItems(prev => prev.map((item, i) => i === index ? {
      ...item, productId,
      description: product ? product.name : item.description,
      unitPrice: product ? String(product.unitPrice) : item.unitPrice,
    } : item));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { title: form.title, status: form.status, currency: form.currency,
      items: items.map(i => ({ productId: i.productId || undefined, description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })) };
    if (form.dealId) payload.dealId = form.dealId;
    if (form.contactId) payload.contactId = form.contactId;
    if (form.validUntil) payload.validUntil = form.validUntil;
    if (form.notes) payload.notes = form.notes;
    if (editQuote) update.mutate({ id: editQuote.id, ...payload });
    else create.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading quotes...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quotes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{quotes.length} quotes</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Create Quote
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quote #</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deal</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Valid Until</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q: any) => (
              <tr key={q.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{q.number}</td>
                <td className="px-4 py-3 font-medium text-foreground">{q.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{q.contact ? `${q.contact.firstName} ${q.contact.lastName}` : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{q.deal?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[q.status]}`}>{q.status}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(q.total, q.currency)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(q)} className="p-1.5 hover:bg-muted rounded-lg">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => remove.mutate(q.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No quotes yet. Create your first quote!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quote Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">{editQuote ? `Edit Quote ${editQuote.number}` : "Create Quote"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Quote Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="SEO Services Proposal" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Contact</label>
                  <select value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— None —</option>
                    {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Deal</label>
                  <select value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— None —</option>
                    {deals.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {QUOTE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Valid Until</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {["USD","EUR","GBP","INR","AUD","CAD"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Line Items</label>
                  <button type="button" onClick={() => setItems(prev => [...prev, emptyItem()])}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <PlusCircle className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <select value={item.productId} onChange={e => handleProductSelect(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="">Custom item</option>
                          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input value={item.description} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Description" required />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0.01" step="0.01" value={item.quantity}
                          onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Qty" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" step="0.01" value={item.unitPrice}
                          onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: e.target.value } : it))}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Price" />
                      </div>
                      <div className="col-span-1 flex items-center justify-center pt-1.5">
                        {items.length > 1 && (
                          <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                            <MinusCircle className="w-4 h-4 text-red-400 hover:text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">{formatCurrency(subtotal, form.currency)}</span></p>
                  </div>
                </div>
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
                  {(create.isPending || update.isPending) ? "Saving..." : editQuote ? "Save Changes" : "Create Quote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
