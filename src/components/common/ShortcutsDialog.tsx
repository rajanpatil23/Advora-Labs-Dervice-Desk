import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";
import { SHORTCUTS, isMac, matchKey } from "@/lib/shortcuts";

function Key({ k }: { k: string }) {
  const label = k === "⌘" && !isMac() ? "Ctrl" : k;
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border bg-muted text-[10px] font-semibold text-foreground/80 shadow-sm">
      {label}
    </kbd>
  );
}

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;

      // ? to open
      if (!inField && e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // Escape closes
      if (open && e.key === "Escape") { setOpen(false); return; }

      // mod+/ focuses search input if available
      if (matchKey(e, "mod+/")) {
        const search = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="earch" i]');
        if (search) { e.preventDefault(); search.focus(); }
        return;
      }

      // Two-key navigation: G then ...
      if (!inField && e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const onSecond = (ev: KeyboardEvent) => {
          window.removeEventListener("keydown", onSecond, true);
          const map: Record<string, string> = {
            d: "/app/dashboard", t: "/app/tickets", i: "/app/incidents",
            q: "/app/my-queue", v: "/app/views",
          };
          const route = map[ev.key.toLowerCase()];
          if (route) { ev.preventDefault(); nav(route); }
        };
        window.addEventListener("keydown", onSecond, { capture: true, once: true });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, nav]);

  const groups = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
    (acc[s.group] ??= []).push(s); return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>Press <kbd className="px-1 rounded bg-muted text-[10px]">?</kbd> anytime to open this dialog.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2 max-h-[60vh] overflow-y-auto">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{group}</div>
              <div className="space-y-1.5">
                {items.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground/80">{s.description}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, j) => <Key key={j} k={k} />)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Detected platform: {isMac() ? "macOS" : "Windows / Linux"}</span>
          <Badge variant="secondary">{SHORTCUTS.length} shortcuts</Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
