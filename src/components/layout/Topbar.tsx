import { Bell, Search, Sun, Moon, Plus, HelpCircle, LogOut, User as UserIcon, Settings as SettingsIcon, Building2, Check, ChevronsUpDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { NewTicketDialog } from "@/components/dialogs/NewTicketDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function Topbar() {
  const { theme, toggleTheme, tickets } = useAppStore();
  const { profile, memberships, currentOrgId, currentRole, switchOrg, signOut } = useAuth();
  const nav = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    nav(`/app/tickets?q=${encodeURIComponent(search.trim())}`);
  };

  const notifs = tickets.filter(t => t.slaState === "at_risk" || t.slaState === "breached").slice(0, 5);
  const currentOrg = memberships.find(m => m.org_id === currentOrgId);
  const initials = (profile?.full_name || profile?.email || "?")
    .split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    nav("/login");
  };

  return (
    <header className="h-16 shrink-0 border-b border-border bg-surface/70 backdrop-blur-xl px-4 md:px-6 flex items-center gap-3 sticky top-0 z-30">
      {/* Org switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hidden md:flex items-center gap-2 h-10 px-3 rounded-xl bg-surface-2 hover:bg-surface border border-border text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium max-w-[140px] truncate">{currentOrg?.org_name || "No workspace"}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {memberships.map(m => (
            <DropdownMenuItem key={m.org_id} onClick={async () => {
              try { await switchOrg(m.org_id); toast.success(`Switched to ${m.org_name}`); }
              catch (e) { toast.error((e as Error).message); }
            }}>
              <div className="flex items-center justify-between w-full gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{m.org_name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                    {m.role} · {m.org_industry}
                  </div>
                </div>
                {m.org_id === currentOrgId && <Check className="h-4 w-4 text-primary shrink-0" />}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => nav("/signup")}>
            <Plus className="h-4 w-4 mr-2" /> Create new workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <form onSubmit={onSearch} className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          id="global-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tickets, users, articles…"
          className="w-full h-10 pl-10 pr-16 rounded-xl bg-surface-2 border border-transparent focus:border-ring focus:bg-surface text-sm outline-none transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">⌘K</kbd>
      </form>

      <div className="flex items-center gap-1.5">
        <NewTicketDialog
          trigger={
            <Button size="sm" className="hidden sm:inline-flex bg-gradient-primary hover:opacity-90 shadow-glow text-primary-foreground gap-1.5">
              <Plus className="h-4 w-4" /> New ticket
            </Button>
          }
        />
        <button onClick={toggleTheme} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-surface-2 transition-colors" aria-label="Toggle theme" title="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={() => toast.message("Help center", { description: "Press ⌘K for the command bar." })}
          className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-surface-2 transition-colors" aria-label="Help" title="Help">
          <HelpCircle className="h-4 w-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-surface-2 transition-colors" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {notifs.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent pulse-dot" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.length === 0 && (
              <div className="px-3 py-6 text-xs text-muted-foreground text-center">You're all caught up 🎉</div>
            )}
            {notifs.map(t => (
              <DropdownMenuItem key={t.id} onClick={() => { useAppStore.getState().setSelectedTicket(t.id); nav("/app/tickets"); }}>
                <div className="flex flex-col gap-0.5">
                  <div className="text-xs font-mono text-muted-foreground">{t.number} · {t.slaState.replace("_"," ")}</div>
                  <div className="text-sm line-clamp-1">{t.title}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 pl-2 border-l border-border hover:opacity-90">
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground bg-gradient-primary">
                {initials}
              </div>
              <div className="hidden md:block leading-tight text-left">
                <div className="text-sm font-semibold">{profile?.full_name || profile?.email}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{currentRole || "—"}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{profile?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              toast.message(profile?.full_name || profile?.email || "Profile", {
                description: `${currentRole?.toUpperCase()} · ${currentOrg?.org_name ?? ""}`,
              });
            }}><UserIcon className="h-4 w-4 mr-2" /> Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav("/app/settings")}><SettingsIcon className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
