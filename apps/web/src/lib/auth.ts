"use client";

import { useEffect, useState } from "react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  orgId: string;
  orgName: string;
  role: string;
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function useAuth(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("agency-os-token");
    if (!token) return;
    const payload = parseJwt(token);
    if (!payload) return;

    // The login response stores extra data alongside the token
    const stored = localStorage.getItem("agency-os-user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        return;
      } catch {}
    }
    // Fallback: just use what's in the JWT
    setUser({
      id: payload.sub,
      name: "Agency Admin",
      email: payload.email ?? "",
      orgId: payload.orgId ?? "",
      orgName: "Agency",
      role: "ADMIN",
    });
  }, []);

  return user;
}

export function getOrgId(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem("agency-os-user");
  if (stored) {
    try {
      return JSON.parse(stored).orgId ?? "";
    } catch {}
  }
  const token = localStorage.getItem("agency-os-token");
  if (!token) return "";
  const p = parseJwt(token);
  return p?.orgId ?? "";
}

export function logout() {
  localStorage.removeItem("agency-os-token");
  localStorage.removeItem("agency-os-user");
  window.location.href = "/login";
}
