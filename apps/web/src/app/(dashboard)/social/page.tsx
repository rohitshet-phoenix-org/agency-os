"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, STATUS_COLORS } from "@/lib/utils";
import { Plus, Calendar, List, Instagram, Twitter, Linkedin, Facebook, X } from "lucide-react";

const PLATFORM_ICONS: Record<string, any> = {
  INSTAGRAM: Instagram, TWITTER_X: Twitter, LINKEDIN: Linkedin, FACEBOOK: Facebook,
};

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "text-pink-500", TWITTER_X: "text-sky-500",
  LINKEDIN: "text-blue-700", FACEBOOK: "text-blue-500", TIKTOK: "text-slate-800",
};

export default function SocialPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"calendar" | "list">("list");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    socialAccountId: "", caption: "", status: "DRAFT", scheduledAt: "",
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["social-posts"],
    queryFn: () => api.get("/social/posts").then((r) => r.data),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => api.get("/social/accounts").then((r) => r.data?.data ?? r.data ?? []),
  });

  const createPost = useMutation({
    mutationFn: (data: any) => api.post("/social/posts", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["social-posts"] }); setShowModal(false); resetForm(); },
  });

  function resetForm() {
    setForm({ socialAccountId: "", caption: "", status: "DRAFT", scheduledAt: "" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createPost.mutate({
      socialAccountId: form.socialAccountId,
      caption: form.caption,
      status: form.scheduledAt ? "SCHEDULED" : form.status,
      scheduledAt: form.scheduledAt || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Social Media</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Schedule, publish, and track across all platforms</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </button>
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Create Post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Scheduled", count: posts.filter((p: any) => p.status === "SCHEDULED").length, color: "text-blue-600" },
          { label: "Published", count: posts.filter((p: any) => p.status === "PUBLISHED").length, color: "text-emerald-600" },
          { label: "Pending Approval", count: posts.filter((p: any) => p.status === "PENDING_APPROVAL").length, color: "text-yellow-600" },
          { label: "Failed", count: posts.filter((p: any) => p.status === "FAILED").length, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Posts List */}
      {view === "list" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Posts</h3>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No posts yet. Create your first post!</div>
            ) : (
              posts.map((post: any) => {
                const Icon = PLATFORM_ICONS[post.socialAccount?.platform] ?? Instagram;
                const color = PLATFORM_COLORS[post.socialAccount?.platform] ?? "text-gray-500";
                return (
                  <div key={post.id} className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors">
                    <Icon className={`w-5 h-5 mt-0.5 ${color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{post.socialAccount?.accountName}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{post.caption ?? "(No caption)"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[post.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {post.status?.replace("_", " ")}
                      </span>
                      {post.scheduledAt && (
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(post.scheduledAt)}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {view === "calendar" && (
        <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Calendar view — switch to List to see all posts</p>
        </div>
      )}

      {/* Create Post Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Create Post</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Social Account *</label>
                <select required value={form.socialAccountId} onChange={(e) => setForm((f) => ({ ...f, socialAccountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select account...</option>
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.accountName} ({a.platform})</option>
                  ))}
                </select>
                {accounts.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No social accounts connected yet.</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Caption</label>
                <textarea value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={4} placeholder="Write your post caption..." />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {["DRAFT", "PENDING_APPROVAL", "SCHEDULED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Schedule Date & Time</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createPost.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {createPost.isPending ? "Creating..." : "Create Post"}
                </button>
              </div>
              {createPost.isError && <p className="text-xs text-red-500">Failed to create post. Please try again.</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
