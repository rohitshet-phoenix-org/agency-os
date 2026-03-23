"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getOrgId } from "@/lib/auth";
import { Plus, X, Trash2, FolderOpen, FileText, Download } from "lucide-react";

const FILE_TYPES = ["PDF","Word","Excel","PowerPoint","Image","Video","Other"];

const emptyForm = {
  name: "", fileType: "", url: "", sizeBytes: "",
  leadId: "", contactId: "", dealId: "", accountId: "",
};

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_ICONS: Record<string, string> = {
  PDF: "📄", Word: "📝", Excel: "📊", PowerPoint: "📑", Image: "🖼️", Video: "🎥", Other: "📁",
};

export default function DocumentsPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ["crm-documents", orgId],
    queryFn: () => api.get(`/crm-documents?orgId=${orgId}&limit=100`).then(r => r.data),
  });

  const { data: leadsData }    = useQuery({ queryKey: ["leads", orgId],    queryFn: () => api.get(`/leads?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: contactsData } = useQuery({ queryKey: ["contacts", orgId], queryFn: () => api.get(`/contacts?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: dealsData }    = useQuery({ queryKey: ["deals", orgId],    queryFn: () => api.get(`/deals?orgId=${orgId}&limit=100`).then(r => r.data) });
  const { data: accountsData } = useQuery({ queryKey: ["accounts", orgId], queryFn: () => api.get(`/accounts?orgId=${orgId}&limit=100`).then(r => r.data) });

  const documents = data?.documents ?? [];
  const leads = leadsData?.leads ?? leadsData ?? [];
  const contacts = contactsData?.contacts ?? [];
  const deals = dealsData?.deals ?? [];
  const accounts = accountsData?.accounts ?? [];

  const create = useMutation({
    mutationFn: (d: any) => api.post("/crm-documents", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-documents"] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/crm-documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-documents"] }),
  });

  function closeModal() { setShowModal(false); setForm({ ...emptyForm }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { name: form.name, url: form.url };
    if (form.fileType) payload.fileType = form.fileType;
    if (form.sizeBytes) payload.sizeBytes = Number(form.sizeBytes);
    if (form.leadId) payload.leadId = form.leadId;
    if (form.contactId) payload.contactId = form.contactId;
    if (form.dealId) payload.dealId = form.dealId;
    if (form.accountId) payload.accountId = form.accountId;
    create.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading documents...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Documents</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{documents.length} files</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc: any) => (
          <div key={doc.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="text-2xl">{FILE_ICONS[doc.fileType ?? "Other"] ?? "📁"}</div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="p-1 hover:bg-muted rounded">
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
                <button onClick={() => remove.mutate(doc.id)} className="p-1 hover:bg-red-50 rounded">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <p className="font-medium text-foreground text-sm truncate">{doc.name}</p>
            <div className="flex items-center gap-2 mt-2">
              {doc.fileType && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{doc.fileType}</span>}
              {doc.sizeBytes && <span className="text-xs text-muted-foreground">{formatBytes(doc.sizeBytes)}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{new Date(doc.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
            <p>No documents yet. Add your first document!</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">Add Document</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Document Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Proposal Q1 2025" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">URL / Link *</label>
                <input required type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://drive.google.com/..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">File Type</label>
                  <select value={form.fileType} onChange={e => setForm(f => ({ ...f, fileType: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— Select —</option>
                    {FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">File Size (bytes)</label>
                  <input type="number" min="0" value={form.sizeBytes} onChange={e => setForm(f => ({ ...f, sizeBytes: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="102400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Link to Lead</label>
                  <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— None —</option>
                    {leads.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Link to Contact</label>
                  <select value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— None —</option>
                    {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Link to Deal</label>
                  <select value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— None —</option>
                    {deals.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Link to Account</label>
                  <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— None —</option>
                    {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={create.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {create.isPending ? "Adding..." : "Add Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
