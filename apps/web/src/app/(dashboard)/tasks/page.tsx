"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { STATUS_COLORS, formatDate } from "@/lib/utils";
import { Plus, CheckSquare, Clock, User, Flag, X, ChevronDown } from "lucide-react";

const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  estimatedHrs?: number;
  project?: { name: string };
  assignee?: { name: string };
}

interface NewTaskForm {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  estimatedHrs: string;
  projectId: string;
}

export default function TasksPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"board" | "list">("list");
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState<NewTaskForm>({
    title: "", description: "", status: "TODO", priority: "MEDIUM",
    dueDate: "", estimatedHrs: "", projectId: "",
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => api.get("/projects").then((r) => r.data),
  });

  const createTask = useMutation({
    mutationFn: (data: any) => api.post("/tasks", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setShowModal(false); resetForm(); },
  });

  function resetForm() {
    setForm({ title: "", description: "", status: "TODO", priority: "MEDIUM", dueDate: "", estimatedHrs: "", projectId: "" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createTask.mutate({
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      estimatedHrs: form.estimatedHrs ? Number(form.estimatedHrs) : undefined,
      projectId: form.projectId || undefined,
    });
  }

  const filtered = filterStatus ? tasks.filter((t: Task) => t.status === filterStatus) : tasks;

  const byStatus = STATUSES.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter((t: Task) => t.status === s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Tasks</h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            <button onClick={() => setView("list")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>List</button>
            <button onClick={() => setView("board")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === "board" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Board</button>
          </div>
          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
      ) : view === "list" ? (
        /* List View */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t: Task) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{t.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.project?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Flag className={`w-3.5 h-3.5 ${PRIORITY_COLORS[t.priority] ?? "text-gray-400"}`} />
                      <span className="text-xs text-muted-foreground">{t.priority}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.dueDate ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(t.dueDate)}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {t.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                          {t.assignee.name[0]}
                        </div>
                        <span className="text-xs text-muted-foreground">{t.assignee.name}</span>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No tasks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Board View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <div key={status} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{status.replace("_", " ")}</span>
                <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{byStatus[status].length}</span>
              </div>
              <div className="space-y-2">
                {byStatus[status].map((t) => (
                  <div key={t.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-foreground leading-snug">{t.title}</p>
                      <Flag className={`w-3.5 h-3.5 shrink-0 ml-1 ${PRIORITY_COLORS[t.priority] ?? "text-gray-400"}`} />
                    </div>
                    {t.project && <p className="text-xs text-muted-foreground mb-2">{t.project.name}</p>}
                    {t.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />{formatDate(t.dueDate)}
                      </div>
                    )}
                  </div>
                ))}
                {byStatus[status].length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">New Task</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title *</label>
                <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Task title" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  rows={3} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Est. Hours</label>
                  <input type="number" min="0" step="0.5" value={form.estimatedHrs} onChange={(e) => setForm((f) => ({ ...f, estimatedHrs: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="0" />
                </div>
              </div>
              {projects.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Project</label>
                  <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">No project</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createTask.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </button>
              </div>
              {createTask.isError && (
                <p className="text-xs text-red-500">Failed to create task. Please try again.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
