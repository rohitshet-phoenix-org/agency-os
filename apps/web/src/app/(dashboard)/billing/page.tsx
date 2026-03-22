"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, STATUS_COLORS } from "@/lib/utils";
import { Plus, TrendingUp, DollarSign, AlertCircle, CheckCircle } from "lucide-react";

export default function BillingPage() {
  const orgId = "demo-org";

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => api.get(`/billing/invoices?orgId=${orgId}`).then((r) => r.data),
  });

  const { data: dashboard } = useQuery({
    queryKey: ["billing-dashboard", orgId],
    queryFn: () => api.get(`/billing/dashboard?orgId=${orgId}`).then((r) => r.data),
  });

  const stats = dashboard ?? { mrr: 0, paidThisMonth: 0, outstandingAmount: 0, overdueInvoices: [] };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Billing & Finance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Invoices, payments, and revenue tracking</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Finance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{formatCurrency(stats.mrr)}</p>
          <p className="text-xs text-emerald-600 mt-1">+8.2% vs last month</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Paid This Month</p>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{formatCurrency(stats.paidThisMonth)}</p>
          <p className="text-xs text-muted-foreground mt-1">{invoices.filter((i: any) => i.status === "PAID").length} invoices</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <DollarSign className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{formatCurrency(stats.outstandingAmount)}</p>
          <p className="text-xs text-muted-foreground mt-1">{invoices.filter((i: any) => i.status === "SENT").length} sent</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-red-600">{stats.overdueInvoices.length}</p>
          <p className="text-xs text-red-500 mt-1">Requires follow-up</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">All Invoices</h3>
          <div className="flex gap-2">
            {["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"].map((s) => (
              <button key={s} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
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
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No invoices yet</td></tr>
            ) : (
              invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                  <td className="px-5 py-3 font-mono text-sm text-foreground">{inv.number}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{inv.client?.name}</p>
                    <p className="text-xs text-muted-foreground">{inv.client?.company}</p>
                  </td>
                  <td className="px-5 py-3 font-semibold text-foreground">{formatCurrency(inv.total, inv.currency)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button className="text-xs text-primary hover:underline">View</button>
                      {inv.status === "DRAFT" && <button className="text-xs text-muted-foreground hover:text-foreground">Send</button>}
                      {inv.status === "SENT" && <button className="text-xs text-emerald-600 hover:underline">Mark Paid</button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
