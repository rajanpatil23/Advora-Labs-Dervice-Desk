import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Search, Copy, Check } from "lucide-react";
import { SHORTCUTS, GROUP_ORDER, isMac, matchKey, displayKey, shortcutToString, type Shortcut, type ShortcutGroup } from "@/lib/shortcuts";
import { toast } from "sonner";

function Key({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md border border-border bg-surface-2 text-[10px] font-semibold text-foreground/85 shadow-sm font-mono">
      {displayKey(k)}
    </kbd>
  );
}

// Module-level event so any component can request the dialog.
const OPEN_EVENT = "lovable:open-shortcuts";
export function openShortcutsHelp() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<ShortcutGroup | "All">("All");
  const [copied, setCopied] = useState(false);
  const nav = useNavigate();

  // Global open trigger
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Existing shortcut handlers (?, mod+/, G then X)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;

      if (!inField && e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (open && e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (matchKey(e, "mod+/")) {
        const search = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="earch" i]',
        );
        if (search) {
          e.preventDefault();
          search.focus();
        }
        return;
      }
      if (!inField && e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const onSecond = (ev: KeyboardEvent) => {
          window.removeEventListener("keydown", onSecond, true);
          const map: Record<string, string> = {
            d: "/app/dashboard",
            t: "/app/tickets",
            i: "/app/incidents",
            r: "/app/requests",
            q: "/app/my-queue",
            v: "/app/views",
            k: "/app/kb",
            a: "/app/automations",
            s: "/app/settings",
          };
          const route = map[ev.key.toLowerCase()];
          if (route) {
            ev.preventDefault();
            nav(route);
          }
        };
        window.addEventListener("keydown", onSecond, { capture: true, once: true });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, nav]);

  const filtered = useMemo<Shortcut[]>(() => {
    const q = query.trim().toLowerCase();
    return SHORTCUTS.filter((s) => {
      if (s.hidden) return false;
      if (activeGroup !== "All" && s.group !== activeGroup) return false;
      if (!q) return true;
      const hay = `${s.description} ${s.group} ${s.context ?? ""} ${s.keys.map(displayKey).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, activeGroup]);

  const grouped = useMemo(() => {
    const acc: Record<string, Shortcut[]> = {};
    filtered.forEach((s) => {
      (acc[s.group] ??= []).push(s);
    });
    return GROUP_ORDER.filter((g) => acc[g]?.length).map((g) => [g, acc[g]] as const);
  }, [filtered]);

  const allGroups = useMemo(() => {
    const set = new Set<ShortcutGroup>();
    SHORTCUTS.forEach((s) => set.add(s.group));
    return GROUP_ORDER.filter((g) => set.has(g));
  }, []);

  function copyAll() {
    const text = filtered.map(shortcutToString).join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        toast.success(`Copied ${filtered.length} shortcuts`);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Could not copy to clipboard"));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="h-9 w-9 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-glow">
              <Keyboard className="h-4 w-4" />
            </span>
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-[10px] font-mono">?</kbd> anywhere to toggle this dialog.
          </DialogDescription>
        </DialogHeader>

        {/* Search + filter */}
        <div className="px-6 py-3 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shortcuts (e.g. assign, search, ⌘K)…"
              className="w-full pl-9 pr-3 h-10 rounded-xl bg-surface-2 border border-border text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...allGroups] as const).map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  activeGroup === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface-2 border-border hover:bg-surface-2/70"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="px-6 py-4 max-h-[55vh] overflow-y-auto">
          {grouped.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              No shortcuts match "{query}".
            </div>
          )}
          <div className="space-y-6">
            {grouped.map(([group, items]) => (
              <section key={group}>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <span>{group}</span>
                  <span className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[10px]">{items.length}</span>
                </div>
                <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden bg-surface-2/30">
                  {items.map((s, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{s.description}</div>
                        {s.context && (
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            {s.context}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, j) => (
                          <span key={j} className="flex items-center gap-1">
                            {j > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {/G/i.test(s.keys[0]) || s.keys[0] === "⌘" || s.keys[0] === "⇧" ? (s.keys[0] === "G" ? "then" : "+") : "+"}
                              </span>
                            )}
                            <Key k={k} />
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between gap-3 bg-surface-2/30">
          <div className="text-[11px] text-muted-foreground">
            Detected platform: {isMac() ? "macOS" : "Windows / Linux"}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {filtered.length} / {SHORTCUTS.filter((s) => !s.hidden).length}
            </Badge>
            <button
              onClick={copyAll}
              className="text-xs px-3 h-8 rounded-lg bg-surface border border-border hover:bg-surface-2 inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy list"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
