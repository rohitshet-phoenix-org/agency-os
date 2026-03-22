"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Bell, CheckCheck, Info, AlertTriangle, AlertCircle, FileText, CheckSquare, DollarSign, Clock } from "lucide-react";

const TYPE_ICONS: Record<string, React.ElementType> = {
  TASK_ASSIGNED: CheckSquare,
  TASK_DUE: Clock,
  REPORT_READY: FileText,
  APPROVAL_NEEDED: AlertTriangle,
  PAYMENT_DUE: DollarSign,
  MENTION: Bell,
  SYSTEM: Info,
};

const TYPE_COLORS: Record<string, string> = {
  TASK_ASSIGNED: "bg-blue-100 text-blue-600",
  TASK_DUE: "bg-orange-100 text-orange-600",
  REPORT_READY: "bg-green-100 text-green-600",
  APPROVAL_NEEDED: "bg-yellow-100 text-yellow-600",
  PAYMENT_DUE: "bg-red-100 text-red-600",
  MENTION: "bg-purple-100 text-purple-600",
  SYSTEM: "bg-gray-100 text-gray-600",
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = notifs.filter((n: any) => !n.isRead).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          {unread > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading notifications...</div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n: any) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            const colorClass = TYPE_COLORS[n.type] ?? "bg-gray-100 text-gray-600";
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/30 ${
                  n.isRead ? "bg-card border-border opacity-70" : "bg-card border-primary/20 shadow-sm"
                }`}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(n.createdAt)}</span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  {!n.isRead && (
                    <span className="inline-block mt-1.5 text-xs text-primary font-medium">Click to mark read</span>
                  )}
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
