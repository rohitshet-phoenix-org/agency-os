"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { getOrgId } from "@/lib/auth";
import { Plus, X, Pencil, Trash2, PackageOpen } from "lucide-react";

const CATEGORIES = ["SEO","PPC","Social Media","Content","Design","Development","Consulting","Other"];

const emptyForm = { name: "", description: "", category: "", unitPrice: "", currency: "USD", isActive: true };

export default function ProductsPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ["products", orgId],
    queryFn: () => api.get(`/products?orgId=${orgId}`).then(r => r.data),
  });

  const products = data?.products ?? [];

  const create = useMutation({
    mutationFn: (d: any) => api.post("/products", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); closeModal(); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/products/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  function openEdit(p: any) {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description ?? "", category: p.category ?? "",
      unitPrice: p.unitPrice, currency: p.currency, isActive: p.isActive });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditProduct(null); setForm({ ...emptyForm }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { name: form.name, unitPrice: Number(form.unitPrice), currency: form.currency, isActive: form.isActive };
    if (form.description) payload.description = form.description;
    if (form.category) payload.category = form.category;
    if (editProduct) update.mutate({ id: editProduct.id, ...payload });
    else create.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading products...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Products & Services</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} items in catalog</p>
        </div>
        <button onClick={() => { setEditProduct(null); setForm({ ...emptyForm }); setShowModal(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p: any) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <PackageOpen className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(p)} className="p-1 hover:bg-muted rounded">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => remove.mutate(p.id)} className="p-1 hover:bg-red-50 rounded">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground">{p.name}</h3>
            {p.category && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">{p.category}</span>}
            {p.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(p.unitPrice, p.currency)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {p.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">No products yet. Add your service catalog!</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{editProduct ? "Edit Product" : "Add Product"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="SEO Monthly Package" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Unit Price *</label>
                  <input required type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="1500" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <label htmlFor="isActive" className="text-sm text-foreground">Active (available for quotes)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={create.isPending || update.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {(create.isPending || update.isPending) ? "Saving..." : editProduct ? "Save" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
