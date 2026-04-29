import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Search, Plus, Package } from "lucide-react";
import * as Icons from "lucide-react";
import { useOrgCatalog } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function PortalCatalog() {
  const catalog = useOrgCatalog();
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set(catalog.map((c) => c.catalog));
    return ["all", ...Array.from(set)];
  }, [catalog]);

  const items = useMemo(() => {
    let list = catalog;
    if (activeCat !== "all") list = list.filter((c) => c.catalog === activeCat);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(needle) || c.description.toLowerCase().includes(needle));
    }
    return list;
  }, [catalog, activeCat, q]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <ShoppingBag className="h-3.5 w-3.5" /> Service Catalog
        </div>
        <h1 className="font-display font-bold text-3xl mt-1">What do you need?</h1>
        <p className="text-sm text-muted-foreground mt-1">Pre-built request templates with estimated delivery times.</p>
      </header>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] h-10 px-3 rounded-full bg-surface border border-border focus-within:border-ring">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the catalog…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
              activeCat === c
                ? "bg-foreground text-background border-foreground"
                : "bg-surface border-border text-muted-foreground hover:border-ring"
            )}
          >
            {c === "all" ? "All categories" : c}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground">
          No catalog items match.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const Icon = ((Icons as unknown) as Record<string, typeof Package>)[item.icon] ?? Package;
            return (
              <Link
                key={item.id}
                to={`/portal/new?catalog=${item.id}`}
                className="group rounded-2xl border border-border bg-surface p-5 hover:border-ring hover:-translate-y-0.5 transition-all flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <div className="h-11 w-11 rounded-xl bg-gradient-primary/15 text-primary flex items-center justify-center group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.catalog}</div>
                </div>
                <div className="mt-3 font-display font-semibold text-sm">{item.title}</div>
                <p className="text-xs text-muted-foreground mt-1 flex-1 line-clamp-2">{item.description}</p>
                <div className="mt-4 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Est. <span className="text-foreground font-medium">{item.estimate}</span></span>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <Plus className="h-3 w-3" /> Request
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
