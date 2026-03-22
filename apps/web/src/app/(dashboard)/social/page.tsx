"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, STATUS_COLORS } from "@/lib/utils";
import { Plus, Calendar, List, Instagram, Twitter, Linkedin, Facebook } from "lucide-react";

const PLATFORM_ICONS: Record<string, any> = {
  INSTAGRAM: Instagram,
  TWITTER_X: Twitter,
  LINKEDIN: Linkedin,
  FACEBOOK: Facebook,
};

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "text-pink-500",
  TWITTER_X: "text-sky-500",
  LINKEDIN: "text-blue-700",
  FACEBOOK: "text-blue-500",
  TIKTOK: "text-slate-800",
};

export default function SocialPage() {
  const [view, setView] = useState<"calendar" | "list">("list");
  const orgId = "demo-org";

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["social-posts", orgId],
    queryFn: () => api.get(`/social/posts?orgId=${orgId}`).then((r) => r.data),
  });

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
          <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Create Post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
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
            <h3 className="font-semibold text-foreground">Upcoming Posts</h3>
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
                      {post.mediaUrls?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{post.mediaUrls.length} media file(s)</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[post.status]}`}>
                        {post.status.replace("_", " ")}
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
    </div>
  );
}
