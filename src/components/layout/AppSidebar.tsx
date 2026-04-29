import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Ticket, AlertOctagon, ClipboardList, Users, UserCog,
  Timer, BookOpen, BarChart3, ScrollText, Settings, Sparkles, LogOut,
  PanelLeftClose, PanelLeft, Inbox, UsersRound, CheckSquare, CreditCard, ShieldCheck, Plug, Zap, Smile, ListChecks, Palette, Bell, Bookmark, Layers, Database, Activity, Wand2, Webhook, Code2, KeyRound, FileCheck2, Globe2, Workflow as WorkflowIcon, Siren, CalendarRange, MessageSquareQuote, GitMerge, TrendingUp, Heart, Route as RouteIcon, BookOpenCheck, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n-app";
import advoraLogoDark from "@/assets/advora-logo-dark.png";
import advoraLogoLight from "@/assets/advora-logo-light.png";

interface NavItem {
  to: string;
  label: string;
  i18nKey?: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles?: AppRole[];
  badgeKey?: "openTickets" | "activeIncidents";
}

interface NavSection {
  label: string;
  i18nKey?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    i18nKey: "nav.workspace",
    items: [
      { to: "/app/dashboard",  label: "Dashboard",        i18nKey: "nav.dashboard",     icon: LayoutDashboard, roles: ["owner", "admin"] },
      { to: "/app/team",       label: "Team Dashboard",   i18nKey: "nav.team",          icon: UsersRound,      roles: ["manager"] },
      { to: "/app/my-queue",   label: "My Queue",         i18nKey: "nav.myQueue",       icon: Inbox,           roles: ["agent", "resolver"] },
      { to: "/app/inbox",      label: "Unified inbox",    icon: Inbox,                                         roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/ai",         label: "AI assistant",     icon: Sparkles,                                      roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/chat",       label: "Live chat",        icon: MessageCircle,                                 roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/sentiment",  label: "Customer mood",    icon: Heart,                                         roles: ["owner", "admin", "manager", "agent", "resolver"] },
    ],
  },
  {
    label: "Work",
    items: [
      { to: "/app/tickets",    label: "Tickets",          i18nKey: "nav.tickets",       icon: Ticket,          badgeKey: "openTickets",     roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/incidents",  label: "Incidents",        i18nKey: "nav.incidents",     icon: AlertOctagon,    badgeKey: "activeIncidents", roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/requests",   label: "Service Requests", i18nKey: "nav.requests",      icon: ClipboardList,   roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/approvals",  label: "Approvals",        i18nKey: "nav.approvals",     icon: CheckSquare,     roles: ["owner", "admin", "manager"] },
      { to: "/app/views",      label: "Saved Views",      i18nKey: "nav.savedViews",    icon: Bookmark,        roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/activity",   label: "Activity Feed",    i18nKey: "nav.activity",      icon: Activity,        roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/bulk",       label: "Bulk Actions",     icon: Layers,                                       roles: ["owner", "admin", "manager"] },
      { to: "/app/data",       label: "Import / Export",  i18nKey: "nav.data",          icon: Database,        roles: ["owner", "admin"] },
      { to: "/app/macros",     label: "Macros",           i18nKey: "nav.macros",        icon: Wand2,           roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/canned",     label: "Canned responses", icon: MessageSquareQuote,                            roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/links",      label: "Links & merges",   icon: GitMerge,                                      roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/kb",         label: "Knowledge Base",   i18nKey: "nav.knowledge",     icon: BookOpen },
      { to: "/app/kb-search",  label: "AI KB search",     icon: BookOpenCheck,                                 roles: ["owner", "admin", "manager", "agent", "resolver"] },
    ],
  },
  {
    label: "Insights",
    i18nKey: "nav.insights",
    items: [
      { to: "/app/reports",        label: "Reports",         i18nKey: "nav.reports",       icon: BarChart3,       roles: ["owner", "admin", "manager"] },
      { to: "/app/report-builder", label: "Report builder",  i18nKey: "nav.reportBuilder", icon: BarChart3,       roles: ["owner", "admin", "manager"] },
      { to: "/app/csat",           label: "CSAT",            i18nKey: "nav.csat",          icon: Smile,           roles: ["owner", "admin", "manager"] },
      { to: "/app/sla-forecast",   label: "SLA forecast",    icon: TrendingUp,                                    roles: ["owner", "admin", "manager"] },
    ],
  },
  {
    label: "Manage",
    i18nKey: "nav.manage",
    items: [
      { to: "/app/users",      label: "Users",            i18nKey: "nav.users",         icon: Users,           roles: ["owner", "admin", "manager"] },
      { to: "/app/customers",  label: "Customer 360",     icon: UsersRound,                                    roles: ["owner", "admin", "manager", "agent", "resolver"] },
      { to: "/app/agents",     label: "Agents",           i18nKey: "nav.agents",        icon: UserCog,         roles: ["owner", "admin", "manager"] },
      { to: "/app/scheduling", label: "Scheduling",       icon: CalendarRange,                                 roles: ["owner", "admin", "manager"] },
      { to: "/app/sla",        label: "SLA Policies",     i18nKey: "nav.sla",           icon: Timer,           roles: ["owner", "admin"] },
      { to: "/app/escalations", label: "Escalations",     icon: Siren,                                         roles: ["owner", "admin", "manager"] },
      { to: "/app/automations", label: "Automations",     i18nKey: "nav.automations",   icon: Zap,             roles: ["owner", "admin", "manager"] },
      { to: "/app/routing",    label: "Smart routing",    icon: RouteIcon,                                     roles: ["owner", "admin", "manager"] },
      { to: "/app/workflows",  label: "Workflow builder", icon: WorkflowIcon,                                  roles: ["owner", "admin", "manager"] },
      { to: "/app/logs",       label: "Audit Log",        i18nKey: "nav.logs",          icon: ScrollText,      roles: ["owner", "admin"] },
    ],
  },
  {
    label: "Organization",
    i18nKey: "nav.system",
    items: [
      { to: "/app/settings",   label: "Settings",         i18nKey: "nav.settings",      icon: Settings,        roles: ["owner", "admin"] },
      { to: "/app/notifications", label: "Notifications", i18nKey: "nav.notifications", icon: Bell },
      { to: "/app/fields",     label: "Custom Fields",    i18nKey: "nav.fields",        icon: ListChecks,      roles: ["owner", "admin"] },
      { to: "/app/branding",   label: "Branding",         i18nKey: "nav.branding",      icon: Palette,         roles: ["owner", "admin"] },
      { to: "/app/billing",    label: "Billing & Plan",   i18nKey: "nav.billing",       icon: CreditCard,      roles: ["owner"] },
      { to: "/app/security",   label: "Security",         i18nKey: "nav.security",      icon: ShieldCheck,     roles: ["owner", "admin"] },
      { to: "/app/integrations", label: "Integrations",   i18nKey: "nav.integrations",  icon: Plug,            roles: ["owner", "admin"] },
      { to: "/app/webhooks",   label: "Webhooks",         i18nKey: "nav.webhooks",      icon: Webhook,         roles: ["owner", "admin"] },
      { to: "/app/developer",  label: "Developer",        i18nKey: "nav.developer",     icon: Code2,           roles: ["owner", "admin"] },
      { to: "/app/sso",        label: "SSO setup",        i18nKey: "nav.sso",           icon: KeyRound,        roles: ["owner", "admin"] },
      { to: "/app/compliance", label: "Compliance",       i18nKey: "nav.compliance",    icon: FileCheck2,      roles: ["owner", "admin"] },
      { to: "/app/status",     label: "Status page",      i18nKey: "nav.status",        icon: Globe2,          roles: ["owner", "admin", "manager"] },
    ],
  },
];

export function AppSidebar() {
  const loc = useLocation();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const { tickets, incidents } = useAppStore();
  const { currentRole, signOut } = useAuth();
  const t = useT();

  const counts = {
    openTickets: tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length,
    activeIncidents: incidents.filter((i) => i.status !== "resolved").length,
  };

  const visibleSections = SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((it) => !it.roles || (currentRole && it.roles.includes(currentRole))) }))
    .filter((s) => s.items.length > 0);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    nav("/login");
  };

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
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-accent shrink-0 overflow-hidden">
              <img src={advoraLogo} alt="Advora" className="h-7 w-7 object-contain" />
            </div>
            <div className="leading-tight min-w-0 flex-1">
              <div className="font-display font-bold text-sidebar-accent-foreground tracking-tight truncate">Advora</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 truncate">Service Desk</div>
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

      <nav className={cn("flex-1 py-4 overflow-y-auto overflow-x-hidden", collapsed ? "px-2 space-y-1" : "px-3 space-y-4")}>
        {visibleSections.map((section, idx) => (
          <div key={section.label} className={collapsed && idx > 0 ? "pt-1 mt-1 border-t border-sidebar-border/40" : ""}>
            {!collapsed && (
              <div className="px-2 pb-1.5 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">{section.i18nKey ? t(section.i18nKey) : section.label}</div>
            )}
            <div className="space-y-0.5">
              {section.items.map((it) => {
                const active = it.end ? loc.pathname === it.to : loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                const Icon = it.icon;
                const badge = it.badgeKey ? counts[it.badgeKey] : undefined;
                const showBadge = badge !== undefined && badge > 0;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    title={collapsed ? (it.i18nKey ? t(it.i18nKey) : it.label) : undefined}
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
                        <span className="flex-1">{it.i18nKey ? t(it.i18nKey) : it.label}</span>
                        {showBadge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sidebar-primary/15 text-sidebar-primary tabular-nums">
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && showBadge && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-sidebar-primary text-[9px] font-semibold text-sidebar-primary-foreground flex items-center justify-center tabular-nums">
                        {badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
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
          onClick={handleSignOut}
          title={collapsed ? t("common.signOut") : undefined}
          className={cn(
            "w-full flex items-center rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors",
            collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2 px-3 py-2"
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span>{t("common.signOut")}</span>}
        </button>
      </div>
    </aside>
  );
}
