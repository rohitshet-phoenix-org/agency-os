"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getInitials, formatDate } from "@/lib/utils";
import { Plus, Building2, Globe, CheckCircle, Clock } from "lucide-react";

export default function ClientsPage() {
  const orgId = "demo-org";
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", orgId],
    queryFn: () => api.get(`/clients?orgId=${orgId}`).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clients</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{clients.length} active clients</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading clients...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c: any) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {getInitials(c.company)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{c.company}</h3>
                  <p className="text-xs text-muted-foreground">{c.name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {c.website && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="truncate">{c.website}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{c.industry ?? "Unknown industry"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {c.onboarding?.status === "COMPLETED" ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Onboarded</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-yellow-500" />
                      <span>Onboarding {c.onboarding?.status?.toLowerCase()}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {c._count?.projects ?? 0} projects
                </div>
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No clients yet. Add your first client!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
