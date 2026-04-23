import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Ticket, AlertOctagon, ClipboardList, Users, UserCog,
  Timer, BookOpen, BarChart3, ScrollText, Settings, Sparkles, LogOut,
  PanelLeftClose, PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 ease-out",
        collapsed ? "w-[64px]" : "w-[244px]"
      )}
    >
      <div className={cn("flex items-center h-16 border-b border-sidebar-border", collapsed ? "px-2 justify-center" : "px-4 gap-2")}>
        {!collapsed && (
          <>
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight min-w-0 flex-1">
              <div className="font-display font-bold text-sidebar-accent-foreground tracking-tight truncate">Connecttly</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 truncate">Support OS</div>
            </div>
          </>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors shrink-0",
            !collapsed && "ml-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className={cn("flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Workspace</div>
        )}
        {items.map((it) => {
          const active = it.end ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              title={collapsed ? it.label : undefined}
              className={cn(
                "group flex items-center rounded-lg text-sm font-medium transition-all relative",
                collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {active && !collapsed && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-sidebar-primary" />}
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-primary" : "")} />
              {!collapsed && (
                <>
                  <span className="flex-1">{it.label}</span>
                  {it.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sidebar-primary/15 text-sidebar-primary">
                      {it.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && it.badge && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-sidebar-primary text-[9px] font-semibold text-sidebar-primary-foreground flex items-center justify-center">
                  {it.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="m-3 p-3 rounded-xl bg-gradient-primary/10 border border-sidebar-primary/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-accent-foreground">
            <Sparkles className="h-3.5 w-3.5 text-sidebar-primary" /> Pro Tips
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/70">Press <kbd className="px-1 rounded bg-sidebar-accent text-[10px]">⌘K</kbd> to open the command bar.</p>
        </div>
      )}

      <div className={cn("pb-3", collapsed ? "px-2" : "px-3")}>
        <button
          onClick={() => { toast.success("Signed out"); nav("/"); }}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors",
            collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2 px-3 py-2"
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
