import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { Sparkles, Home, Plus, Inbox, BookOpen, ShoppingBag, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgSync } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { PortalChatWidget } from "@/components/portal/PortalChatWidget";

/**
 * Requester-facing portal shell.
 * Light, brand-forward, mobile-first. Different vocabulary from the agent app
 * ("request" not "ticket", "help" not "service desk").
 */
export function PortalLayout() {
  useOrgSync();
  const { user, currentMembership, signOut, switchOrg, memberships } = useAuth();
  const nav = useNavigate();

  const orgName = currentMembership?.org_name ?? "Help Center";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    nav("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/portal" className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-display font-bold truncate">{orgName}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground -mt-0.5">Help Center</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <PortalNavItem to="/portal" end icon={Home} label="Home" />
            <PortalNavItem to="/portal/catalog" icon={ShoppingBag} label="Catalog" />
            <PortalNavItem to="/portal/requests" icon={Inbox} label="My Requests" />
            <PortalNavItem to="/portal/kb" icon={BookOpen} label="Knowledge" />
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/portal/new"
              className="hidden sm:inline-flex h-9 px-3.5 rounded-full bg-foreground text-background text-xs font-semibold items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" /> New request
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-9 px-2 rounded-full hover:bg-surface-2 transition-colors">
                  <span
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{ background: user?.avatar_color }}
                  >
                    {user?.initials}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-semibold">{user?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                {memberships.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Switch workspace
                    </DropdownMenuLabel>
                    {memberships.map((m) => (
                      <DropdownMenuItem
                        key={m.org_id}
                        onClick={() => switchOrg(m.org_id)}
                        className={cn(m.org_id === currentMembership?.org_id && "bg-surface-2 font-medium")}
                      >
                        {m.org_name}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
          <PortalNavItem to="/portal" end icon={Home} label="Home" compact />
          <PortalNavItem to="/portal/catalog" icon={ShoppingBag} label="Catalog" compact />
          <PortalNavItem to="/portal/requests" icon={Inbox} label="Requests" compact />
          <PortalNavItem to="/portal/kb" icon={BookOpen} label="Knowledge" compact />
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold text-foreground">Advora</span>
      </footer>

      <PortalChatWidget />
    </div>
  );
}

function PortalNavItem({
  to, label, icon: Icon, end, compact,
}: { to: string; label: string; icon: typeof Home; end?: boolean; compact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-1.5 rounded-full transition-colors text-sm font-medium whitespace-nowrap",
          compact ? "h-8 px-3 text-xs" : "h-9 px-3.5",
          isActive
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        )
      }
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </NavLink>
  );
}
