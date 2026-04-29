// Compact macro picker for the ticket composer.
import { useEffect, useMemo, useState } from "react";
import { Zap, Search, Lock, MessageSquare, Tag, Keyboard } from "lucide-react";
import { readMacros, runMacro, type Macro } from "@/lib/api/macros";
import { useAppStore } from "@/lib/store";
import type { Ticket, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Props {
  ticket: Ticket;
  me: User | null | undefined;
  requesterName?: string;
}

export function MacroPicker({ ticket, me, requesterName }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);
  const userId = me?.id ?? "anon";
  const { addMessage, setStatus, setPriority, setAssignee } = useAppStore();

  const macros = useMemo(() => readMacros(userId), [userId, version]);

  // refresh when dropdown opens
  useEffect(() => { if (open) setVersion((v) => v + 1); }, [open]);

  const filtered = useMemo(() => {
    if (!query) return macros;
    const q = query.toLowerCase();
    return macros.filter((m) =>
      (m.name + " " + (m.description ?? "") + " " + (m.reply ?? "")).toLowerCase().includes(q),
    );
  }, [macros, query]);

  const apply = (m: Macro) => {
    const result = runMacro(m, {
      ticket,
      vars: {
        requester: requesterName?.split(" ")[0],
        agent: me?.name?.split(" ")[0],
        ticketNumber: ticket.number,
        title: ticket.title,
      },
      meId: me?.id,
      addMessage,
      setStatus,
      setPriority,
      setAssignee,
    });
    setOpen(false);
    if (result.changed.length === 0) {
      toast.message(`Macro "${m.name}" — nothing to change`);
    } else {
      toast.success(`Macro "${m.name}" applied`, { description: result.changed.join(" · ") });
    }
  };

  // Composer-scoped shortcuts: Alt+<key>
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      // Only when composer (textarea) is focused
      if (tag !== "TEXTAREA") return;
      const key = e.key.toLowerCase();
      const m = macros.find((x) => x.shortcut?.toLowerCase() === key);
      if (m) {
        e.preventDefault();
        apply(m);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macros, ticket.id, ticket.assigneeId, ticket.status, ticket.priority]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="text-[11px] text-primary hover:underline flex items-center gap-1 px-2 py-1"
          title="Apply macro"
        >
          <Zap className="h-3 w-3" /> Macros
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search macros…"
              className="w-full h-8 pl-7 pr-2 rounded-md bg-surface border border-border text-[12px] outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="text-center text-[11px] text-muted-foreground py-6">
              No macros. Create one in <span className="text-primary">Settings → Macros</span>.
            </li>
          ) : (
            filtered.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => apply(m)}
                  className="w-full text-left px-2.5 py-2 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
                      m.isInternal ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary",
                    )}>
                      {m.isInternal ? <Lock className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium truncate">{m.name}</div>
                      {m.description && (
                        <div className="text-[10px] text-muted-foreground truncate">{m.description}</div>
                      )}
                    </div>
                    {m.shortcut && (
                      <kbd className="ml-2 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono text-muted-foreground">
                        <Keyboard className="h-2.5 w-2.5" /> Alt+{m.shortcut}
                      </kbd>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1 ml-8">
                    {m.status && <Mini>→ {m.status}</Mini>}
                    {m.priority && <Mini>{m.priority}</Mini>}
                    {m.assignee?.kind === "current_user" && <Mini>→ me</Mini>}
                    {(m.addTags ?? []).slice(0, 3).map((t) => <Mini key={t}><Tag className="h-2 w-2 mr-0.5 inline" />{t}</Mini>)}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Mini({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted-foreground">
      {children}
    </span>
  );
}
