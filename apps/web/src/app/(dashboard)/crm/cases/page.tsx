"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getOrgId } from "@/lib/auth";
import { Plus, X, Pencil, Trash2, MessageSquare } from "lucide-react";

const STATUSES = ["OPEN","IN_PROGRESS","PENDING_CUSTOMER","RESOLVED","CLOSED"];
const PRIORITIES = ["LOW","MEDIUM","HIGH","URGENT"];
const CATEGORIES = ["Technical","Billing","General","Feature Request","Bug Report","Other"];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  PENDING_CUSTOMER: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const emptyForm = { subject: "", description: "", status: "OPEN", priority: "MEDIUM", category: "", assignedToId: "" };

export default function CasesPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [showModal, setShowModal] = useState(false);
  const [editCase, setEditCase] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [newComment, setNewComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["cases", orgId, filterStatus, filterPriority],
    queryFn: () => {
      let url = `/cases?orgId=${orgId}&limit=100`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterPriority) url += `&priority=${filterPriority}`;
      return api.get(url).then(r => r.data);
    },
  });

  const { data: caseDetail } = useQuery({
    queryKey: ["cases", selectedCase?.id],
    queryFn: () => api.get(`/cases/${selectedCase.id}`).then(r => r.data),
    enabled: !!selectedCase,
  });

  const cases = data?.cases ?? [];

  const create = useMutation({
    mutationFn: (d: any) => api.post("/cases", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cases"] }); closeModal(); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/cases/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cases"] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cases/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });

  const addComment = useMutation({
    mutationFn: ({ id, body }: any) => api.post(`/cases/${id}/comments`, { body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cases", selectedCase?.id] }); setNewComment(""); },
  });

  function openEdit(c: any) {
    setEditCase(c);
    setForm({ subject: c.subject, description: c.description ?? "", status: c.status,
      priority: c.priority, category: c.category ?? "", assignedToId: c.assignedToId ?? "" });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditCase(null); setForm({ ...emptyForm }); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { subject: form.subject, status: form.status, priority: form.priority };
    if (form.description) payload.description = form.description;
    if (form.category) payload.category = form.category;
    if (editCase) update.mutate({ id: editCase.id, ...payload });
    else create.mutate(payload);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading cases...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cases</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{cases.length} cases</p>
        </div>
        <button onClick={() => { setEditCase(null); setForm({ ...emptyForm }); setShowModal(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Case
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cases List */}
        <div className="lg:col-span-2 space-y-3">
          {cases.map((c: any) => (
            <div key={c.id}
              onClick={() => setSelectedCase(c)}
              className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-all ${selectedCase?.id === c.id ? "border-primary/50 shadow-sm" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{c.subject}</p>
                  {c.category && <p className="text-xs text-muted-foreground mt-0.5">{c.category}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[c.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.priority}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">{c._count?.comments ?? 0} comments</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-3">
                  <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1 hover:bg-muted rounded">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); remove.mutate(c.id); }} className="p-1 hover:bg-red-50 rounded">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {cases.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No cases found.</div>
          )}
        </div>

        {/* Case Detail Panel */}
        <div className="bg-card border border-border rounded-xl p-5">
          {selectedCase && caseDetail ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{caseDetail.subject}</h3>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[caseDetail.status]}`}>
                    {caseDetail.status.replace(/_/g, " ")}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[caseDetail.priority]}`}>
                    {caseDetail.priority}
                  </span>
                </div>
                {caseDetail.description && (
                  <p className="text-sm text-muted-foreground mt-3">{caseDetail.description}</p>
                )}
              </div>
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Comments ({caseDetail.comments?.length ?? 0})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {caseDetail.comments?.map((comment: any) => (
                    <div key={comment.id} className="bg-muted/30 rounded-lg p-3">
                      <p className="text-sm text-foreground">{comment.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {(!caseDetail.comments || caseDetail.comments.length === 0) && (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <input value={newComment} onChange={e => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Add a comment..." onKeyDown={e => { if (e.key === "Enter" && newComment.trim()) { addComment.mutate({ id: selectedCase.id, body: newComment }); } }} />
                  <button
                    onClick={() => newComment.trim() && addComment.mutate({ id: selectedCase.id, body: newComment })}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
                    Post
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">Select a case to view details</div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{editCase ? "Edit Case" : "New Case"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Subject *</label>
                <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Issue description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">— Select —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={create.isPending || update.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {(create.isPending || update.isPending) ? "Saving..." : editCase ? "Save Changes" : "Create Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
