"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Building2, User, Bell, Shield, Key, Save } from "lucide-react";

type Tab = "profile" | "organization" | "notifications" | "security" | "api";

export default function SettingsPage() {
  const user = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name ?? "Agency Admin",
    email: user?.email ?? "",
    timezone: "America/New_York",
  });

  const [org, setOrg] = useState({
    name: user?.orgName ?? "Phoenix Digital Agency",
    website: "https://phoenixdigital.com",
    timezone: "America/New_York",
  });

  const [notifPrefs, setNotifPrefs] = useState({
    taskAssigned: true,
    taskDue: true,
    reportReady: true,
    approvalNeeded: true,
    paymentDue: true,
    mention: true,
  });

  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      setPwError("Passwords do not match");
      return;
    }
    if (passwords.newPass.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwError("");
    setSaved(true);
    setPasswords({ current: "", newPass: "", confirm: "" });
    setTimeout(() => setSaved(false), 2500);
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "api", label: "API Keys", icon: Key },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                tab === id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 bg-card border border-border rounded-xl p-6">
          {saved && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Save className="w-4 h-4" /> Changes saved successfully!
            </div>
          )}

          {/* Profile Tab */}
          {tab === "profile" && (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Profile Settings</h3>
                <p className="text-sm text-muted-foreground">Update your personal information</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                  {profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.role ?? "ADMIN"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Full Name</label>
                  <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
                  <input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Timezone</label>
                <select value={profile.timezone} onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {["America/New_York", "America/Los_Angeles", "America/Chicago", "Europe/London", "Europe/Paris", "Asia/Tokyo", "UTC"].map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Save className="w-4 h-4" /> Save Profile
              </button>
            </form>
          )}

          {/* Organization Tab */}
          {tab === "organization" && (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Organization Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your agency&apos;s details</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Organization Name</label>
                <input value={org.name} onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Website</label>
                <input value={org.website} onChange={(e) => setOrg((o) => ({ ...o, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://youragency.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Default Timezone</label>
                <select value={org.timezone} onChange={(e) => setOrg((o) => ({ ...o, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {["America/New_York", "America/Los_Angeles", "America/Chicago", "Europe/London", "Europe/Paris", "Asia/Tokyo", "UTC"].map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Save className="w-4 h-4" /> Save Organization
              </button>
            </form>
          )}

          {/* Notifications Tab */}
          {tab === "notifications" && (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">Choose what you want to be notified about</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: "taskAssigned", label: "Task assigned to me", desc: "When a task is assigned to you" },
                  { key: "taskDue", label: "Task due reminders", desc: "24h before a task is due" },
                  { key: "reportReady", label: "Report generated", desc: "When a performance report is ready" },
                  { key: "approvalNeeded", label: "Approval requests", desc: "When a client item needs approval" },
                  { key: "paymentDue", label: "Payment reminders", desc: "When an invoice payment is due" },
                  { key: "mention", label: "Mentions", desc: "When someone mentions you in a comment" },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={notifPrefs[key as keyof typeof notifPrefs]}
                        onChange={(e) => setNotifPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Save className="w-4 h-4" /> Save Preferences
              </button>
            </form>
          )}

          {/* Security Tab */}
          {tab === "security" && (
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Security</h3>
                <p className="text-sm text-muted-foreground">Change your password and manage security settings</p>
              </div>
              {pwError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{pwError}</div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Current Password</label>
                <input type="password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">New Password</label>
                <input type="password" value={passwords.newPass} onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Confirm New Password</label>
                <input type="password" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••" />
              </div>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Shield className="w-4 h-4" /> Update Password
              </button>
            </form>
          )}

          {/* API Keys Tab */}
          {tab === "api" && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-1">API Keys & Webhooks</h3>
                <p className="text-sm text-muted-foreground">Manage your API integrations and webhook endpoints</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm font-medium text-foreground mb-1">API Base URL</p>
                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                  http://localhost:4000/api/v1
                </code>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm font-medium text-foreground mb-1">Authentication</p>
                <p className="text-xs text-muted-foreground">All requests require a Bearer token in the Authorization header. Get your token via POST /auth/login.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Webhook Endpoints</p>
                <p className="text-xs text-muted-foreground mb-3">Configure webhooks in the <a href="/settings/webhooks" className="text-primary hover:underline">Webhooks section</a> to receive real-time event notifications.</p>
                <div className="space-y-1.5">
                  {["lead.created", "lead.won", "task.completed", "invoice.paid", "report.generated", "approval.reviewed"].map((event) => (
                    <div key={event} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <code className="font-mono">{event}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
