"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getOrgId } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { Plus, X, Mail, Phone, Pencil, Trash2, Building2 } from "lucide-react";

const SOURCES = ["REFERRAL","COLD_OUTREACH","INBOUND_SEO","INBOUND_ADS","LINKEDIN","EVENT","OTHER"];

const emptyForm = {
  firstName: "", lastName: "", email: "", phone: "", title: "",
  department: "", accountId: "", source: "OTHER", notes: "",
};

export default function ContactsPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", orgId, search],
    queryFn: () => api.get(`/contacts?orgId=${orgId}&limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`).then(r => r.data),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts", orgId],
    queryFn: () => api.get(`/accounts?orgId=${orgId}&limit=100`).then(r => r.data),
  });

  const contacts = data?.contacts ?? [];
  const accounts = accountsData?.accounts ?? [];

  const create = useMutation({
    mutationFn: (d: any) => api.post("/contacts", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); closeModal(); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/contacts/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  function openNew() { setEditContact(null); setForm({ ...emptyForm }); setShowModal(true); }
  function openEdit(c: any) {
    setEditContact(c);
    setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone ?? "",
      title: c.title ?? "", department: c.department ?? "", accountId: c.accountId ?? "", source: c.source, notes: c.notes ?? "" });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditContact(null); setForm({ ...emptyForm }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { ...form };
    if (!payload.accountId) delete payload.accountId;
    if (!payload.phone) delete payload.phone;
    if (!payload.title) delete payload.title;
    if (!payload.department) delete payload.department;
    if (!payload.notes) delete payload.notes;
    if (editContact) update.mutate({ id: editContact.id, ...payload });
    else create.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading contacts...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contacts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{contacts.length} people</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Search contacts..." />

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact Info</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact: any) => (
              <tr key={contact.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {getInitials(`${contact.firstName} ${contact.lastName}`)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{contact.firstName} {contact.lastName}</p>
                      <p className="text-xs text-muted-foreground">{contact.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{contact.title ?? "—"}</td>
                <td className="px-4 py-3">
                  {contact.account ? (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">{contact.account.name}</span>
                    </div>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a href={`mailto:${contact.email}`} className="p-1 hover:bg-muted rounded">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="p-1 hover:bg-muted rounded">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{contact.source?.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(contact)} className="p-1.5 hover:bg-muted rounded-lg">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => remove.mutate(contact.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No contacts yet. Add your first contact!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">{editContact ? "Edit Contact" : "Add New Contact"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">First Name *</label>
                  <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="John" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Last Name *</label>
                  <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Smith" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="john@company.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="+1 555 000 0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Marketing Manager" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Department</label>
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Marketing" />
                </div>
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
                  <label className="text-sm font-medium text-foreground block mb-1.5">Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
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
                  {(create.isPending || update.isPending) ? "Saving..." : editContact ? "Save Changes" : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
