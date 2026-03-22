"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, Users, Briefcase, CheckSquare, Building2 } from "lucide-react";
import { Suspense } from "react";

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  const { data: leads = [] } = useQuery({
    queryKey: ["search-leads", q],
    queryFn: () => api.get(`/leads?search=${encodeURIComponent(q)}`).then((r) => r.data?.leads ?? r.data ?? []),
    enabled: q.length > 1,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["search-clients", q],
    queryFn: () => api.get(`/clients?search=${encodeURIComponent(q)}`).then((r) => r.data ?? []),
    enabled: q.length > 1,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["search-projects", q],
    queryFn: () => api.get(`/projects?search=${encodeURIComponent(q)}`).then((r) => r.data ?? []),
    enabled: q.length > 1,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["search-tasks", q],
    queryFn: () => api.get(`/tasks?search=${encodeURIComponent(q)}`).then((r) => r.data ?? []),
    enabled: q.length > 1,
  });

  const total = leads.length + clients.length + projects.length + tasks.length;

  if (!q) return (
    <div className="text-center py-16 text-muted-foreground">
      <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>Enter a search query to find clients, tasks, leads, and projects</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{total} results for &quot;{q}&quot;</p>

      {clients.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Clients ({clients.length})
          </h3>
          <div className="space-y-2">
            {clients.map((c: any) => (
              <a key={c.id} href="/clients" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{c.company?.[0]}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.company}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {leads.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Leads ({leads.length})
          </h3>
          <div className="space-y-2">
            {leads.map((l: any) => (
              <a key={l.id} href="/crm" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold flex items-center justify-center">{l.name?.[0]}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.company} · {l.status}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Projects ({projects.length})
          </h3>
          <div className="space-y-2">
            {projects.map((p: any) => (
              <a key={p.id} href="/projects" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-sm font-bold flex items-center justify-center"><Briefcase className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.status}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {tasks.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Tasks ({tasks.length})
          </h3>
          <div className="space-y-2">
            {tasks.map((t: any) => (
              <a key={t.id} href="/tasks" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold flex items-center justify-center"><CheckSquare className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.status} · {t.priority}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {total === 0 && q.length > 1 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No results found for &quot;{q}&quot;</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-2xl font-bold text-foreground">Search {q && `— "${q}"`}</h2>
      <Suspense fallback={<div className="text-muted-foreground">Searching...</div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
