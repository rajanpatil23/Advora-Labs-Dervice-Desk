import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useAppStore, useOrgAgents } from "@/lib/store";
import {
  Ticket, AlertOctagon, BookOpen, Users, LayoutDashboard, Inbox, Settings,
  Plus, Bookmark, Bell, Palette, Zap, BarChart3, Search, ArrowRight, Smile, Layers, Keyboard,
} from "lucide-react";
import { matchKey } from "@/lib/shortcuts";

type Action = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  perform: () => void;
  keywords?: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { tickets, incidents, articles } = useAppStore();
  const agents = useOrgAgents();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchKey(e, "mod+k")) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (path: string) => { setOpen(false); nav(path); };

  const navActions: Action[] = useMemo(() => ([
    { id: "n-dash", label: "Go to Dashboard",      group: "Navigate", icon: LayoutDashboard, perform: () => go("/app/dashboard") },
    { id: "n-queue", label: "Go to My Queue",      group: "Navigate", icon: Inbox,           perform: () => go("/app/my-queue") },
    { id: "n-tix", label: "Go to Tickets",         group: "Navigate", icon: Ticket,          perform: () => go("/app/tickets") },
    { id: "n-inc", label: "Go to Incidents",       group: "Navigate", icon: AlertOctagon,    perform: () => go("/app/incidents") },
    { id: "n-kb", label: "Go to Knowledge Base",   group: "Navigate", icon: BookOpen,        perform: () => go("/app/kb") },
    { id: "n-views", label: "Go to Saved Views",   group: "Navigate", icon: Bookmark,        perform: () => go("/app/views") },
    { id: "n-bulk", label: "Go to Bulk Actions",   group: "Navigate", icon: Layers,          perform: () => go("/app/bulk") },
    { id: "n-rep", label: "Go to Reports",         group: "Navigate", icon: BarChart3,       perform: () => go("/app/reports") },
    { id: "n-csat", label: "Go to CSAT",           group: "Navigate", icon: Smile,           perform: () => go("/app/csat") },
    { id: "n-auto", label: "Go to Automations",    group: "Navigate", icon: Zap,             perform: () => go("/app/automations") },
    { id: "n-users", label: "Go to Users",         group: "Navigate", icon: Users,           perform: () => go("/app/users") },
    { id: "n-set", label: "Go to Settings",        group: "Navigate", icon: Settings,        perform: () => go("/app/settings") },
    { id: "n-not", label: "Go to Notifications",   group: "Navigate", icon: Bell,            perform: () => go("/app/notifications") },
    { id: "n-brand", label: "Go to Branding",      group: "Navigate", icon: Palette,         perform: () => go("/app/branding") },
  ]), []); // eslint-disable-line

  const quickActions: Action[] = useMemo(() => ([
    { id: "q-newticket", label: "Create new ticket",  group: "Actions", icon: Plus,    perform: () => go("/app/tickets?new=1"), hint: "C" },
    { id: "q-newinc",    label: "Create new incident",group: "Actions", icon: Plus,    perform: () => go("/app/incidents?new=1") },
    { id: "q-newview",   label: "Create saved view",  group: "Actions", icon: Plus,    perform: () => go("/app/views") },
    { id: "q-shortcuts", label: "Show keyboard shortcuts", group: "Actions", icon: Keyboard, perform: () => {
      setOpen(false);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    } },
  ]), []); // eslint-disable-line

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search tickets, people, articles…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          {quickActions.map((a) => (
            <CommandItem key={a.id} onSelect={a.perform} value={`${a.label} ${a.keywords ?? ""}`}>
              <a.icon className="h-4 w-4 mr-2 text-primary" />
              <span className="flex-1">{a.label}</span>
              {a.hint && <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted">{a.hint}</kbd>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tickets">
          {tickets.slice(0, 8).map((t) => (
            <CommandItem
              key={t.id}
              value={`ticket ${t.number ?? ""} ${t.title} ${t.category ?? ""}`}
              onSelect={() => go(`/app/tickets?id=${t.id}`)}
            >
              <Ticket className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="font-mono text-[11px] text-muted-foreground mr-2">{t.number ?? t.id.slice(0, 6)}</span>
              <span className="flex-1 truncate">{t.title}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Incidents">
          {incidents.slice(0, 5).map((i) => (
            <CommandItem
              key={i.id}
              value={`incident ${i.title} ${i.service ?? ""}`}
              onSelect={() => go(`/app/incidents?id=${i.id}`)}
            >
              <AlertOctagon className="h-4 w-4 mr-2 text-amber-500" />
              <span className="flex-1 truncate">{i.title}</span>
              <span className="text-[11px] text-muted-foreground">{i.service}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Knowledge base">
          {articles.slice(0, 6).map((a) => (
            <CommandItem
              key={a.id}
              value={`article ${a.title} ${a.category ?? ""}`}
              onSelect={() => go(`/app/kb?id=${a.id}`)}
            >
              <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="flex-1 truncate">{a.title}</span>
              <span className="text-[11px] text-muted-foreground">{a.category}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="People">
          {agents.slice(0, 6).map((u: any) => (
            <CommandItem
              key={u.id}
              value={`user ${u.name ?? ""} ${u.email ?? ""}`}
              onSelect={() => go(`/app/users?id=${u.id}`)}
            >
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="flex-1 truncate">{u.name ?? u.email}</span>
              <span className="text-[11px] text-muted-foreground">{u.email}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {navActions.map((a) => (
            <CommandItem key={a.id} value={a.label} onSelect={a.perform}>
              <a.icon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{a.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div className="border-t px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><Search className="h-3 w-3" /> Fuzzy search across your workspace</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded border bg-muted">↵</kbd> open ·
          <kbd className="px-1.5 py-0.5 rounded border bg-muted ml-1">esc</kbd> close
        </span>
      </div>
    </CommandDialog>
  );
}
