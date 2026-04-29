import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Search, Plus, ArrowRight, Filter } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
] as const;

export default function PortalRequests() {
  const { tickets } = useAppStore();
  const { user } = useAuth();
  const [filter, setFilter] = useState<typeof FILTERS[number]["id"]>("all");
  const [q, setQ] = useState("");

  const myRequests = useMemo(() => {
    let list = tickets.filter((t) => t.requesterId === user?.id);
    if (filter === "open") list = list.filter((t) => t.status !== "resolved" && t.status !== "closed");
    if (filter === "resolved") list = list.filter((t) => t.status === "resolved" || t.status === "closed");
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(needle) || t.number.toLowerCase().includes(needle));
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tickets, user, filter, q]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Inbox className="h-3.5 w-3.5" /> My Requests
          </div>
          <h1 className="font-display font-bold text-3xl mt-1">{myRequests.length} request{myRequests.length === 1 ? "" : "s"}</h1>
        </div>
        <Link
          to="/portal/new"
          className="h-10 px-4 rounded-full bg-foreground text-background text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> New request
        </Link>
      </header>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] h-10 px-3 rounded-full bg-surface border border-border focus-within:border-ring">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or number…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                filter === f.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-surface border-border text-muted-foreground hover:border-ring"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {myRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-semibold">No requests yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">When you submit a request, it'll show up here.</p>
          <Link to="/portal/new" className="inline-flex h-10 px-4 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Submit your first request
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {myRequests.map((t) => (
            <Link
              key={t.id}
              to={`/portal/requests/${t.id}`}
              className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-surface-2 transition-colors group"
            >
              <PriorityDot priority={t.priority} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{t.number}</span>
                  <span>·</span>
                  <span>{t.category}</span>
                  <span>·</span>
                  <span>Updated {timeAgo(t.updatedAt)}</span>
                </div>
                <div className="font-medium text-sm mt-0.5 truncate">{t.title}</div>
              </div>
              <StatusChip status={t.status} />
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cls = ({
    critical: "bg-destructive",
    high: "bg-amber-500",
    medium: "bg-sky-500",
    low: "bg-muted-foreground/40",
  } as Record<string, string>)[priority] ?? "bg-muted-foreground/40";
  return <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", cls)} title={priority} />;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    new: { cls: "bg-info/10 text-info", label: "Submitted" },
    open: { cls: "bg-info/10 text-info", label: "Open" },
    in_progress: { cls: "bg-primary/10 text-primary", label: "In progress" },
    on_hold: { cls: "bg-warning/10 text-warning", label: "On hold" },
    resolved: { cls: "bg-success/10 text-success", label: "Resolved" },
    closed: { cls: "bg-muted text-muted-foreground", label: "Closed" },
  };
  const m = map[status] ?? { cls: "bg-muted text-muted-foreground", label: status };
  return <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded shrink-0", m.cls)}>{m.label}</span>;
}
