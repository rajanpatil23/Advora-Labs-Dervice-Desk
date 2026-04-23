import { Bell, Search, Sun, Moon, Plus, HelpCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { agents } from "@/lib/mockData";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { theme, toggleTheme } = useAppStore();
  const me = agents[0];
  return (
    <header className="h-16 shrink-0 border-b border-border bg-surface/70 backdrop-blur-xl px-4 md:px-6 flex items-center gap-3 sticky top-0 z-30">
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search tickets, users, articles…"
          className="w-full h-10 pl-10 pr-16 rounded-xl bg-surface-2 border border-transparent focus:border-ring focus:bg-surface text-sm outline-none transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">⌘K</kbd>
      </div>

      <div className="flex items-center gap-1.5">
        <Button size="sm" className="hidden sm:inline-flex bg-gradient-primary hover:opacity-90 shadow-glow text-primary-foreground gap-1.5">
          <Plus className="h-4 w-4" /> New ticket
        </Button>
        <button onClick={toggleTheme} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-surface-2 transition-colors" aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-surface-2 transition-colors" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-surface-2 transition-colors" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent text-accent pulse-dot" />
        </button>
        <div className="ml-1 flex items-center gap-2 pl-2 border-l border-border">
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground" style={{ background: me.avatarColor }}>
            {me.initials}
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-sm font-semibold">{me.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{me.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
