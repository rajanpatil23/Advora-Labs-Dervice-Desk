import { Bell, Search, Sun, Moon, Plus, HelpCircle, LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { agents } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { NewTicketDialog } from "@/components/dialogs/NewTicketDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function Topbar() {
  const { theme, toggleTheme, tickets } = useAppStore();
  const me = agents[0];
  const nav = useNavigate();
  const [search, setSearch] = useState("");

  // Cmd+K focuses search
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
    nav("/app/tickets");
    toast.message("Searching tickets…", { description: `Query: "${search}"` });
  };

  const notifs = tickets.filter(t => t.slaState === "at_risk" || t.slaState === "breached").slice(0, 5);

  return (
    <header className="h-16 shrink-0 border-b border-border bg-surface/70 backdrop-blur-xl px-4 md:px-6 flex items-center gap-3 sticky top-0 z-30">
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
          onClick={() => toast.message("Help center", { description: "Press ⌘K for the command bar, j/k to navigate tickets." })}
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
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground" style={{ background: me.avatarColor }}>
                {me.initials}
              </div>
              <div className="hidden md:block leading-tight text-left">
                <div className="text-sm font-semibold">{me.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{me.role}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{me.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav("/app/agents")}><UserIcon className="h-4 w-4 mr-2" /> Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav("/app/settings")}><SettingsIcon className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { toast.success("Signed out"); nav("/"); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
