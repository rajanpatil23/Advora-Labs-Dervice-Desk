import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Ticket, AlertOctagon, Inbox, Menu, BookOpen, Bookmark,
  BarChart3, UserCog, Users, Settings, Bell, LogOut, Sparkles, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

type Item = { to: string; label: string; icon: typeof Ticket; roles?: AppRole[] };

// Up to 5 items in bottom bar
const BOTTOM_ITEMS: Item[] = [
  { to: "/app/mobile",    label: "Agent",    icon: LayoutDashboard },
  { to: "/app/tickets",   label: "Tickets",  icon: Ticket },
  { to: "/app/my-queue",  label: "Queue",    icon: Inbox, roles: ["agent", "resolver"] },
  { to: "/app/incidents", label: "Incidents",icon: AlertOctagon },
  { to: "/app/views",     label: "Views",    icon: Bookmark },
];

const MORE_ITEMS: Item[] = [
  { to: "/app/kb",            label: "Knowledge Base", icon: BookOpen },
  { to: "/app/reports",       label: "Reports",        icon: BarChart3, roles: ["owner", "admin", "manager"] },
  { to: "/app/agents",        label: "Agents",         icon: UserCog,   roles: ["owner", "admin", "manager"] },
  { to: "/app/users",         label: "Users",          icon: Users,     roles: ["owner", "admin", "manager"] },
  { to: "/app/notifications", label: "Notifications",  icon: Bell },
  { to: "/app/settings",      label: "Settings",       icon: Settings,  roles: ["owner", "admin"] },
];

export function MobileNav() {
  const loc = useLocation();
  const nav = useNavigate();
  const { currentRole, signOut, profile } = useAuth();
  const { tickets, incidents } = useAppStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleBottom = BOTTOM_ITEMS.filter((it) => !it.roles || (currentRole && it.roles.includes(currentRole))).slice(0, 4);
  const visibleMore = MORE_ITEMS.filter((it) => !it.roles || (currentRole && it.roles.includes(currentRole)));

  const counts = {
    "/app/tickets": tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length,
    "/app/incidents": incidents.filter((i) => i.status !== "resolved").length,
  } as Record<string, number>;

  const isActive = (to: string) => loc.pathname === to || loc.pathname.startsWith(to + "/");

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    nav("/login");
  };

  return (
    <>
      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-surface/95 backdrop-blur-xl border-t border-border flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {visibleBottom.map((it) => {
          const active = isActive(it.to);
          const badge = counts[it.to];
          return (
            <NavLink key={it.to} to={it.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium relative transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <it.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary))]")} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-primary text-[9px] font-semibold text-primary-foreground flex items-center justify-center tabular-nums">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span>{it.label}</span>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary" />}
            </NavLink>
          );
        })}

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium text-muted-foreground">
              <Menu className="h-5 w-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[360px] p-0 flex flex-col">
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <SheetTitle className="text-base truncate">{profile?.full_name || profile?.email}</SheetTitle>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{currentRole || "—"}</div>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {visibleMore.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive: a }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    a ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                  )}
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </NavLink>
              ))}
            </div>
            <div className="p-3 border-t space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => { setDrawerOpen(false); nav("/app/tickets?new=1"); }}>
                <Plus className="h-4 w-4 mr-2" /> New ticket
              </Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
