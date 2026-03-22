"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Briefcase, CheckSquare, BarChart2,
  Calendar, Mail, Search, TrendingUp, DollarSign, Bell,
  Settings, ChevronRight, Building2, Target,
} from "lucide-react";

const NAV = [
  { label: "Dashboard",    href: "/dashboard",   icon: LayoutDashboard },
  { label: "CRM",          href: "/crm",         icon: Target },
  { label: "Clients",      href: "/clients",     icon: Building2 },
  { label: "Projects",     href: "/projects",    icon: Briefcase },
  { label: "Tasks",        href: "/tasks",       icon: CheckSquare },
  { label: "Analytics",    href: "/analytics",   icon: BarChart2 },
  { label: "Social",       href: "/social",      icon: Calendar },
  { label: "Email",        href: "/email",       icon: Mail },
  { label: "SEO",          href: "/seo",         icon: Search },
  { label: "Ads",          href: "/ads",         icon: TrendingUp },
  { label: "Billing",      href: "/billing",     icon: DollarSign },
  { label: "Team",         href: "/team",        icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 h-screen bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="font-semibold text-white">AgencyOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[hsl(var(--sidebar-accent))] text-white"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white opacity-70 hover:opacity-100"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[hsl(var(--sidebar-border))] space-y-0.5">
        <Link href="/notifications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm opacity-70 hover:opacity-100 hover:bg-[hsl(var(--sidebar-accent))] transition-colors">
          <Bell className="w-4 h-4" />
          Notifications
        </Link>
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm opacity-70 hover:opacity-100 hover:bg-[hsl(var(--sidebar-accent))] transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
