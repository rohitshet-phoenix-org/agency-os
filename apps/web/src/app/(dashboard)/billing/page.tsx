"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, STATUS_COLORS } from "@/lib/utils";
import { Plus, TrendingUp, DollarSign, AlertCircle, CheckCircle, X } from "lucide-react";

export default function BillingPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [form, setForm] = useState({
    clientId: "", dueDate: "", currency: "USD", notes: "",
    lineItems: [{ description: "", quantity: "1", unitPrice: "" }],
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get("/billing/invoices").then((r) => r.data),
  });

  const { data: dashboard } = useQuery({
    queryKey: ["billing-dashboard"],
    queryFn: () => api.get("/billing/dashboard").then((r) => r.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => api.get("/clients").then((r) => r.data),
  });

  const createInvoice = useMutation({
    mutationFn: (data: any) => api.post("/billing/invoices", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["billing-dashboard"] }); setShowModal(false); resetForm(); },
  });

  const markPaid = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => api.post(`/billing/invoices/${id}/payments`, { amount, method: "bank_transfer" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["billing-dashboard"] }); },
  });

  function resetForm() {
    setForm({ clientId: "", dueDate: "", currency: "USD", notes: "", lineItems: [{ description: "", quantity: "1", unitPrice: "" }] });
  }

  function addLineItem() {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, { description: "", quantity: "1", unitPrice: "" }] }));
  }

  function updateLineItem(i: number, field: string, value: string) {
    setForm((f) => {
      const items = [...f.lineItems];
      items[i] = { ...items[i], [field]: value };
      return { ...f, lineItems: items };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lineItems = form.lineItems.map((li) => ({
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      total: Number(li.quantity) * Number(li.unitPrice),
    }));
    const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
    createInvoice.mutate({
      clientId: form.clientId,
      dueDate: form.dueDate,
      currency: form.currency,
      notes: form.notes || undefined,
      subtotal,
      tax: 0,
      total: subtotal,
      lineItems,
    });
  }

  const stats = dashboard ?? { mrr: 0, paidThisMonth: 0, outstandingAmount: 0, overdueInvoices: [] };
  const filtered = filterStatus === "ALL" ? invoices : invoices.filter((i: any) => i.status === filterStatus);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Billing & Finance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Invoices, payments, and revenue tracking</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Finance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Monthly Recurring Revenue", value: formatCurrency(stats.mrr), sub: "+8.2% vs last month", icon: TrendingUp, color: "text-emerald-500", subColor: "text-emerald-600" },
          { label: "Paid This Month", value: formatCurrency(stats.paidThisMonth), sub: `${invoices.filter((i: any) => i.status === "PAID").length} invoices`, icon: CheckCircle, color: "text-green-500", subColor: "text-muted-foreground" },
          { label: "Outstanding", value: formatCurrency(stats.outstandingAmount), sub: `${invoices.filter((i: any) => i.status === "SENT").length} sent`, icon: DollarSign, color: "text-yellow-500", subColor: "text-muted-foreground" },
          { label: "Overdue", value: stats.overdueInvoices?.length ?? 0, sub: "Requires follow-up", icon: AlertCircle, color: "text-red-500", subColor: "text-red-500", valueClass: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold mt-2 ${(s as any).valueClass ?? "text-foreground"}`}>{s.value}</p>
            <p className={`text-xs mt-1 ${s.subColor}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">All Invoices</h3>
          <div className="flex gap-1">
            {["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Invoice #</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Client</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Due Date</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No invoices{filterStatus !== "ALL" ? ` with status ${filterStatus}` : " yet"}</td></tr>
            ) : (
              filtered.map((inv: any) => (
                <tr key={inv.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                  <td className="px-5 py-3 font-mono text-sm text-foreground">{inv.number}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{inv.client?.name}</p>
                    <p className="text-xs text-muted-foreground">{inv.client?.company}</p>
                  </td>
                  <td className="px-5 py-3 font-semibold text-foreground">{formatCurrency(inv.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {inv.status === "SENT" && (
                        <button onClick={() => markPaid.mutate({ id: inv.id, amount: inv.total })}
                          className="text-xs text-emerald-600 hover:underline">Mark Paid</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">New Invoice</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Client *</label>
                  <select required value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select client...</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.company}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Due Date *</label>
                  <input required type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Line Items</label>
                <div className="space-y-2">
                  {form.lineItems.map((li, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2">
                      <input value={li.description} onChange={(e) => updateLineItem(i, "description", e.target.value)}
                        className="col-span-3 px-2 py-1.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Description" required />
                      <input type="number" value={li.quantity} onChange={(e) => updateLineItem(i, "quantity", e.target.value)} min="1"
                        className="px-2 py-1.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Qty" required />
                      <input type="number" value={li.unitPrice} onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)} min="0"
                        className="px-2 py-1.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Price" required />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addLineItem}
                  className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add line item
                </button>
                <div className="mt-2 text-right text-sm font-medium text-foreground">
                  Total: {formatCurrency(form.lineItems.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={2} placeholder="Optional payment notes..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createInvoice.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {createInvoice.isPending ? "Creating..." : "Create Invoice"}
                </button>
              </div>
              {createInvoice.isError && <p className="text-xs text-red-500">Failed to create invoice.</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
