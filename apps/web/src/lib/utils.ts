import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export const STATUS_COLORS: Record<string, string> = {
  // Lead
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  QUALIFIED: "bg-purple-100 text-purple-800",
  PROPOSAL_SENT: "bg-orange-100 text-orange-800",
  NEGOTIATING: "bg-pink-100 text-pink-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
  // Tasks
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-yellow-100 text-yellow-800",
  DONE: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  BACKLOG: "bg-gray-100 text-gray-600",
  // Invoice
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  // Social posts
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  // Deal stages
  PROSPECTING: "bg-slate-100 text-slate-700",
  QUALIFICATION: "bg-blue-100 text-blue-700",
  NEEDS_ANALYSIS: "bg-indigo-100 text-indigo-700",
  VALUE_PROPOSITION: "bg-violet-100 text-violet-700",
  DECISION_MAKING: "bg-yellow-100 text-yellow-700",
  PROPOSAL: "bg-orange-100 text-orange-700",
  NEGOTIATION: "bg-pink-100 text-pink-700",
  // Meeting statuses
  COMPLETED: "bg-green-100 text-green-700",
  NO_SHOW: "bg-gray-100 text-gray-600",
  // Case statuses
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  PENDING_CUSTOMER: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
  // Quote statuses
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
};
