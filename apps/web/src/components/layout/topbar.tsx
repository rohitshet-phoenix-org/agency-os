"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function Topbar({ title }: { title?: string }) {
  const user = { name: "Agency Admin", email: "admin@agency.com" };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-6 gap-4 shrink-0">
      {title && <h1 className="font-semibold text-foreground text-base">{title}</h1>}

      {/* Search */}
      <div className="flex-1 max-w-md ml-auto mr-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search clients, tasks, campaigns..."
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 ml-auto">
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
            {getInitials(user.name)}
          </div>
          <span className="text-sm font-medium text-foreground">{user.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
