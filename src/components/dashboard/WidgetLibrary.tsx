import { useState } from "react";
import { X, Plus, Search } from "lucide-react";
import { WIDGET_CATALOG, type WidgetId, type WidgetMeta } from "@/lib/api/dashboard";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (id: WidgetId) => void;
  existing: WidgetId[];
};

export function WidgetLibrary({ open, onClose, onAdd, existing }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  if (!open) return null;

  const cats = ["all", ...Array.from(new Set(WIDGET_CATALOG.map((w) => w.category)))];
  const filtered = WIDGET_CATALOG.filter((w) => {
    if (cat !== "all" && w.category !== cat) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return w.title.toLowerCase().includes(s) || w.description.toLowerCase().includes(s);
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-surface border-l border-border shadow-2xl flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="font-display font-semibold">Widget library</div>
            <div className="text-xs text-muted-foreground">Click to add to your dashboard</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-surface-2 grid place-items-center" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-4 space-y-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search widgets…"
              className="w-full pl-9 pr-3 h-9 rounded-lg bg-surface-2 border border-border text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border hover:bg-surface-2/70"
                }`}
              >
                {c[0].toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map((w) => (
            <WidgetRow key={w.id} meta={w} added={existing.includes(w.id)} onAdd={() => onAdd(w.id)} />
          ))}
          {!filtered.length && (
            <div className="text-center text-sm text-muted-foreground py-10">No widgets match your search.</div>
          )}
        </div>
      </aside>
    </div>
  );
}

function WidgetRow({ meta, added, onAdd }: { meta: WidgetMeta; added: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-2/40 hover:bg-surface-2 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{meta.title}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{meta.category}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
      </div>
      <button
        onClick={onAdd}
        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
          added ? "bg-surface-2 text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        <Plus className="h-3.5 w-3.5" /> {added ? "Add again" : "Add"}
      </button>
    </div>
  );
}
