"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getOrgId } from "@/lib/auth";
import { Plus, X, CalendarClock, Phone, Pencil, Trash2, Clock } from "lucide-react";

const MEETING_STATUSES = ["SCHEDULED","COMPLETED","CANCELLED","NO_SHOW"];
const CALL_DIRECTIONS = ["OUTBOUND","INBOUND"];
const CALL_OUTCOMES = ["CONNECTED","NO_ANSWER","VOICEMAIL","BUSY","WRONG_NUMBER"];

const emptyMeetingForm = {
  title: "", description: "", location: "", startAt: "", endAt: "", status: "SCHEDULED",
  leadId: "", dealId: "",
};

const emptyCallForm = {
  contactId: "", leadId: "", dealId: "", direction: "OUTBOUND",
  duration: "", outcome: "CONNECTED", notes: "", calledAt: "",
};

export default function ActivitiesPage() {
  const qc = useQueryClient();
  const orgId = getOrgId();

  const [tab, setTab] = useState<"meetings" | "calls">("meetings");
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<any>(null);
  const [meetingForm, setMeetingForm] = useState({ ...emptyMeetingForm });
  const [callForm, setCallForm] = useState({ ...emptyCallForm });

  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ["meetings", orgId],
    queryFn: () => api.get(`/meetings?orgId=${orgId}&limit=100`).then(r => r.data),
  });

  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ["calls", orgId],
    queryFn: () => api.get(`/calls?orgId=${orgId}&limit=100`).then(r => r.data),
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts", orgId],
    queryFn: () => api.get(`/contacts?orgId=${orgId}&limit=100`).then(r => r.data),
  });

  const meetings = meetingsData?.meetings ?? [];
  const calls = callsData?.calls ?? [];
  const contacts = contactsData?.contacts ?? [];

  const createMeeting = useMutation({
    mutationFn: (d: any) => api.post("/meetings", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); setShowMeetingModal(false); setMeetingForm({ ...emptyMeetingForm }); },
  });

  const updateMeeting = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/meetings/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); setShowMeetingModal(false); setEditMeeting(null); },
  });

  const deleteMeeting = useMutation({
    mutationFn: (id: string) => api.delete(`/meetings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const createCall = useMutation({
    mutationFn: (d: any) => api.post("/calls", { ...d, orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calls"] }); setShowCallModal(false); setCallForm({ ...emptyCallForm }); },
  });

  const deleteCall = useMutation({
    mutationFn: (id: string) => api.delete(`/calls/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calls"] }),
  });

  function openEditMeeting(m: any) {
    setEditMeeting(m);
    setMeetingForm({ title: m.title, description: m.description ?? "", location: m.location ?? "",
      startAt: m.startAt ? m.startAt.slice(0, 16) : "", endAt: m.endAt ? m.endAt.slice(0, 16) : "",
      status: m.status, leadId: m.leadId ?? "", dealId: m.dealId ?? "" });
    setShowMeetingModal(true);
  }

  function handleMeetingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { title: meetingForm.title, status: meetingForm.status, startAt: meetingForm.startAt };
    if (meetingForm.description) payload.description = meetingForm.description;
    if (meetingForm.location) payload.location = meetingForm.location;
    if (meetingForm.endAt) payload.endAt = meetingForm.endAt;
    if (meetingForm.leadId) payload.leadId = meetingForm.leadId;
    if (meetingForm.dealId) payload.dealId = meetingForm.dealId;
    if (editMeeting) updateMeeting.mutate({ id: editMeeting.id, ...payload });
    else createMeeting.mutate(payload);
  }

  function handleCallSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { direction: callForm.direction, outcome: callForm.outcome };
    if (callForm.contactId) payload.contactId = callForm.contactId;
    if (callForm.leadId) payload.leadId = callForm.leadId;
    if (callForm.dealId) payload.dealId = callForm.dealId;
    if (callForm.duration) payload.duration = Number(callForm.duration);
    if (callForm.notes) payload.notes = callForm.notes;
    if (callForm.calledAt) payload.calledAt = callForm.calledAt;
    createCall.mutate(payload);
  }

  const STATUS_COLOR: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-gray-100 text-gray-700",
  };

  const OUTCOME_COLOR: Record<string, string> = {
    CONNECTED: "bg-green-100 text-green-700",
    NO_ANSWER: "bg-yellow-100 text-yellow-700",
    VOICEMAIL: "bg-blue-100 text-blue-700",
    BUSY: "bg-orange-100 text-orange-700",
    WRONG_NUMBER: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Activities</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{meetings.length} meetings · {calls.length} calls</p>
        </div>
        <button
          onClick={() => tab === "meetings" ? setShowMeetingModal(true) : setShowCallModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> {tab === "meetings" ? "Schedule Meeting" : "Log Call"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 w-fit">
        {(["meetings","calls"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>{t}</button>
        ))}
      </div>

      {/* Meetings List */}
      {tab === "meetings" && (
        <div className="space-y-3">
          {meetingsLoading && <div className="text-center py-8 text-muted-foreground">Loading meetings...</div>}
          {!meetingsLoading && meetings.map((m: any) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{m.title}</p>
                    {m.description && <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.startAt).toLocaleString()}
                      </span>
                      {m.location && <span className="text-xs text-muted-foreground">📍 {m.location}</span>}
                      {m.contacts?.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          👥 {m.contacts.map((mc: any) => `${mc.contact.firstName} ${mc.contact.lastName}`).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[m.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {m.status}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditMeeting(m)} className="p-1 hover:bg-muted rounded">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteMeeting.mutate(m.id)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!meetingsLoading && meetings.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No meetings scheduled yet.</div>
          )}
        </div>
      )}

      {/* Calls List */}
      {tab === "calls" && (
        <div className="space-y-3">
          {callsLoading && <div className="text-center py-8 text-muted-foreground">Loading calls...</div>}
          {!callsLoading && calls.map((c: any) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {c.direction} Call
                      {c.contact && ` — ${c.contact.firstName} ${c.contact.lastName}`}
                    </p>
                    {c.notes && <p className="text-sm text-muted-foreground mt-0.5">{c.notes}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.calledAt).toLocaleString()}
                      </span>
                      {c.duration && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {c.duration} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OUTCOME_COLOR[c.outcome] ?? "bg-gray-100 text-gray-700"}`}>
                    {c.outcome.replace(/_/g, " ")}
                  </span>
                  <button onClick={() => deleteCall.mutate(c.id)}
                    className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!callsLoading && calls.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No calls logged yet.</div>
          )}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">{editMeeting ? "Edit Meeting" : "Schedule Meeting"}</h3>
              <button onClick={() => { setShowMeetingModal(false); setEditMeeting(null); setMeetingForm({ ...emptyMeetingForm }); }}
                className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleMeetingSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title *</label>
                <input required value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Product Demo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Start Date & Time *</label>
                  <input required type="datetime-local" value={meetingForm.startAt} onChange={e => setMeetingForm(f => ({ ...f, startAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">End Date & Time</label>
                  <input type="datetime-local" value={meetingForm.endAt} onChange={e => setMeetingForm(f => ({ ...f, endAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Location</label>
                  <input value={meetingForm.location} onChange={e => setMeetingForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Zoom / Office" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
                  <select value={meetingForm.status} onChange={e => setMeetingForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {MEETING_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea value={meetingForm.description} onChange={e => setMeetingForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowMeetingModal(false); setEditMeeting(null); }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createMeeting.isPending || updateMeeting.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {(createMeeting.isPending || updateMeeting.isPending) ? "Saving..." : editMeeting ? "Save Changes" : "Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-semibold text-foreground">Log Call</h3>
              <button onClick={() => { setShowCallModal(false); setCallForm({ ...emptyCallForm }); }}
                className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleCallSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Direction</label>
                  <select value={callForm.direction} onChange={e => setCallForm(f => ({ ...f, direction: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {CALL_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Outcome</label>
                  <select value={callForm.outcome} onChange={e => setCallForm(f => ({ ...f, outcome: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {CALL_OUTCOMES.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Contact</label>
                  <select value={callForm.contactId} onChange={e => setCallForm(f => ({ ...f, contactId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— No Contact —</option>
                    {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Duration (min)</label>
                  <input type="number" min="0" value={callForm.duration} onChange={e => setCallForm(f => ({ ...f, duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="15" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Date & Time</label>
                <input type="datetime-local" value={callForm.calledAt} onChange={e => setCallForm(f => ({ ...f, calledAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Notes</label>
                <textarea value={callForm.notes} onChange={e => setCallForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCallModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createCall.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {createCall.isPending ? "Logging..." : "Log Call"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
