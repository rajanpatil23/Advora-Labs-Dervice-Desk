import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Ticket, AlertOctagon, ClipboardList, Users, UserCog,
  Timer, BookOpen, BarChart3, ScrollText, Settings, Sparkles, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app", label: "Tickets", icon: Ticket, badge: "24", end: true },
  { to: "/app/incidents", label: "Incidents", icon: AlertOctagon, badge: "3" },
  { to: "/app/requests", label: "Service Requests", icon: ClipboardList },
  { to: "/app/users", label: "Users", icon: Users },
  { to: "/app/agents", label: "Agents", icon: UserCog },
  { to: "/app/sla", label: "SLA", icon: Timer },
  { to: "/app/kb", label: "Knowledge Base", icon: BookOpen },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/logs", label: "Activity Logs", icon: ScrollText },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const loc = useLocation();
  return (
    <aside className="hidden md:flex w-[244px] shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="font-display font-bold text-sidebar-accent-foreground tracking-tight">Connecttly</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Support OS</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Workspace</div>
        {items.map((it) => {
          const active = it.end ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all relative",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-sidebar-primary" />}
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-primary" : "")} />
              <span className="flex-1">{it.label}</span>
              {it.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sidebar-primary/15 text-sidebar-primary">
                  {it.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="m-3 p-3 rounded-xl bg-gradient-primary/10 border border-sidebar-primary/20">
        <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-accent-foreground">
          <Sparkles className="h-3.5 w-3.5 text-sidebar-primary" /> Pro Tips
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/70">Press <kbd className="px-1 rounded bg-sidebar-accent text-[10px]">⌘K</kbd> to open the command bar.</p>
      </div>

      <div className="px-3 pb-3">
        <NavLink to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </NavLink>
      </div>
    </aside>
  );
}
