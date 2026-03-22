"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { Plus, X, Mail, Shield, UserCheck, ChevronDown } from "lucide-react";

const ROLES = ["ADMIN", "ACCOUNT_MANAGER", "STRATEGIST", "SPECIALIST", "DESIGNER", "ANALYST"];
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-red-100 text-red-700",
  ACCOUNT_MANAGER: "bg-blue-100 text-blue-700",
  STRATEGIST: "bg-indigo-100 text-indigo-700",
  SPECIALIST: "bg-green-100 text-green-700",
  DESIGNER: "bg-pink-100 text-pink-700",
  ANALYST: "bg-orange-100 text-orange-700",
  CLIENT: "bg-gray-100 text-gray-700",
};

export default function TeamPage() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "SPECIALIST" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const inviteMember = useMutation({
    mutationFn: (data: any) => api.post("/auth/register", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team"] }); setShowInvite(false); setForm({ name: "", email: "", password: "", role: "SPECIALIST" }); },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team"] }); setEditId(null); },
  });

  const removeMember = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    inviteMember.mutate({ ...form, orgId: undefined });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Team</h2>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: members.length, icon: UserCheck },
          { label: "Admins", value: members.filter((m: any) => m.role === "ADMIN" || m.role === "SUPER_ADMIN").length, icon: Shield },
          { label: "Active", value: members.filter((m: any) => m.user?.isActive !== false).length, icon: UserCheck },
          { label: "Roles", value: [...new Set(members.map((m: any) => m.role))].length, icon: Shield },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Members table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading team...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m: any) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {getInitials(m.user?.name ?? m.name ?? "?")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{m.user?.name ?? m.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {m.user?.email ?? m.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editId === m.id ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="appearance-none pl-2 pr-6 py-1 text-xs border border-border rounded bg-background focus:outline-none"
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                          </select>
                          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
                        <button onClick={() => updateRole.mutate({ id: m.userId ?? m.id, role: editRole })}
                          className="text-xs text-primary hover:underline">Save</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(m.id); setEditRole(m.role); }}
                        className="flex items-center gap-1 group"
                      >
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-700"}`}>
                          {m.role?.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.user?.isActive !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {m.user?.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm("Remove this team member?")) removeMember.mutate(m.userId ?? m.id); }}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No team members yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Sarah Smith" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="sarah@agency.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Temporary Password *</label>
                <input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="••••••••" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={inviteMember.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {inviteMember.isPending ? "Inviting..." : "Send Invite"}
                </button>
              </div>
              {inviteMember.isError && (
                <p className="text-xs text-red-500">Failed to invite member. Email may already exist.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
