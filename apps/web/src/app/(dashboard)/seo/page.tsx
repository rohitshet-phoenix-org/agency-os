"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, Search, Link, Shield, Plus, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const MOCK_RANKINGS = [
  { keyword: "digital marketing agency", position: 4, change: +2, volume: 8100 },
  { keyword: "seo services", position: 7, change: -1, volume: 5400 },
  { keyword: "ppc management", position: 12, change: +5, volume: 3600 },
  { keyword: "social media marketing", position: 3, change: 0, volume: 12100 },
  { keyword: "content marketing strategy", position: 18, change: +3, volume: 2400 },
];

const MOCK_RANK_HISTORY = [
  { date: "Mar 1", "digital marketing agency": 8, "social media marketing": 5 },
  { date: "Mar 8", "digital marketing agency": 7, "social media marketing": 4 },
  { date: "Mar 15", "digital marketing agency": 6, "social media marketing": 3 },
  { date: "Mar 22", "digital marketing agency": 4, "social media marketing": 3 },
];

function PositionChange({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center gap-0.5 text-emerald-600 text-xs"><TrendingUp className="w-3 h-3" />+{change}</span>;
  if (change < 0) return <span className="flex items-center gap-0.5 text-red-500 text-xs"><TrendingDown className="w-3 h-3" />{change}</span>;
  return <span className="flex items-center gap-0.5 text-muted-foreground text-xs"><Minus className="w-3 h-3" />0</span>;
}

export default function SeoPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [kwForm, setKwForm] = useState({ keyword: "", targetUrl: "", seoProjectId: "" });

  const { data: seoProjects = [] } = useQuery({
    queryKey: ["seo-projects"],
    queryFn: () => api.get("/seo/projects").then((r) => r.data?.data ?? r.data ?? []),
  });

  const addKeyword = useMutation({
    mutationFn: (data: any) => api.post(`/seo/projects/${data.seoProjectId}/keywords`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["seo-projects"] }); setShowModal(false); setKwForm({ keyword: "", targetUrl: "", seoProjectId: "" }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">SEO Tracking</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Keyword rankings, backlinks, and site health</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Keywords
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">Keywords Tracked</p>
          </div>
          <p className="text-2xl font-bold text-foreground">142</p>
          <p className="text-xs text-emerald-600 mt-1">+12 this month</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Avg. Position</p>
          </div>
          <p className="text-2xl font-bold text-foreground">8.4</p>
          <p className="text-xs text-emerald-600 mt-1">↑ 1.2 vs last month</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4 text-cyan-500" />
            <p className="text-sm text-muted-foreground">Backlinks</p>
          </div>
          <p className="text-2xl font-bold text-foreground">1,842</p>
          <p className="text-xs text-emerald-600 mt-1">+47 new this month</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-violet-500" />
            <p className="text-sm text-muted-foreground">Site Health</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">87/100</p>
          <p className="text-xs text-muted-foreground mt-1">Last audit: Mar 20</p>
        </div>
      </div>

      {/* Ranking Chart + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Ranking History</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MOCK_RANK_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis reversed tick={{ fontSize: 11 }} domain={[1, 20]} />
              <Tooltip />
              <Legend iconSize={8} />
              <Line type="monotone" dataKey="digital marketing agency" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="social media marketing" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Keyword Rankings</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Keyword</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Pos.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Change</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Volume</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RANKINGS.map((kw, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2.5 text-foreground">{kw.keyword}</td>
                    <td className="py-2.5 text-center">
                      <span className={`font-bold ${kw.position <= 3 ? "text-emerald-600" : kw.position <= 10 ? "text-blue-600" : "text-muted-foreground"}`}>
                        #{kw.position}
                      </span>
                    </td>
                    <td className="py-2.5 text-center"><PositionChange change={kw.change} /></td>
                    <td className="py-2.5 text-right text-muted-foreground">{kw.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Keyword Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Add Keywords</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addKeyword.mutate(kwForm); }} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">SEO Project *</label>
                <select required value={kwForm.seoProjectId} onChange={(e) => setKwForm((f) => ({ ...f, seoProjectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select project...</option>
                  {seoProjects.map((p: any) => <option key={p.id} value={p.id}>{p.domain}</option>)}
                </select>
                {seoProjects.length === 0 && <p className="text-xs text-muted-foreground mt-1">No SEO projects yet.</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Keyword *</label>
                <input required value={kwForm.keyword} onChange={(e) => setKwForm((f) => ({ ...f, keyword: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="digital marketing agency" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Target URL</label>
                <input value={kwForm.targetUrl} onChange={(e) => setKwForm((f) => ({ ...f, targetUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://yoursite.com/services" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={addKeyword.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {addKeyword.isPending ? "Adding..." : "Add Keyword"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
