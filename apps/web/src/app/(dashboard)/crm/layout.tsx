"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, Building2, TrendingUp, Target, CalendarClock,
  FileText, PackageOpen, ShieldAlert, FolderOpen, LayoutDashboard,
} from "lucide-react";

const CRM_NAV = [
  { href: "/crm",            label: "Overview",   icon: LayoutDashboard },
  { href: "/crm/leads",      label: "Leads",      icon: Target },
  { href: "/crm/contacts",   label: "Contacts",   icon: Users },
  { href: "/crm/accounts",   label: "Accounts",   icon: Building2 },
  { href: "/crm/deals",      label: "Deals",      icon: TrendingUp },
  { href: "/crm/activities", label: "Activities", icon: CalendarClock },
  { href: "/crm/quotes",     label: "Quotes",     icon: FileText },
  { href: "/crm/products",   label: "Products",   icon: PackageOpen },
  { href: "/crm/cases",      label: "Cases",      icon: ShieldAlert },
  { href: "/crm/documents",  label: "Documents",  icon: FolderOpen },
];

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-0">
      {/* CRM Sub-navigation */}
      <div className="bg-card border border-border rounded-xl mb-5 overflow-x-auto">
        <div className="flex items-center px-2 min-w-max">
          {CRM_NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/crm" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
