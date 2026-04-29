import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Inbox, Filter, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Agent / Resolver landing page — the personal work queue.
 * Resolvers default to ?filter=escalated.
 */
export default function MyQueue() {
  const [params, setParams] = useSearchParams();
  const { tickets } = useAppStore();
  const { user, currentRole } = useAuth();
  const filter = params.get("filter") ?? "all";

  const myTickets = useMemo(() => {
    if (!user) return [];
    let list = tickets.filter((t) => t.assigneeId === user.id && t.status !== "closed");
    if (filter === "escalated") {
      list = list.filter((t) => t.priority === "high" || t.priority === "critical" || t.slaState === "breached" || t.slaState === "at_risk");
    } else if (filter === "at_risk") {
      list = list.filter((t) => t.slaState === "at_risk" || t.slaState === "breached");
    }
    return list.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
      return order[a.priority] - order[b.priority];
    });
  }, [tickets, user, filter]);

  const stats = useMemo(() => ({
    open: myTickets.length,
    breached: myTickets.filter((t) => t.slaState === "breached").length,
    atRisk: myTickets.filter((t) => t.slaState === "at_risk").length,
  }), [myTickets]);

  const filters: { id: string; label: string }[] = [
    { id: "all", label: "All assigned" },
    { id: "at_risk", label: "SLA at risk" },
    { id: "escalated", label: currentRole === "resolver" ? "Escalated to me" : "High priority" },
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Inbox className="h-3.5 w-3.5" /> My Queue
            </div>
            <h1 className="font-display font-bold text-3xl mt-1">Hi {user?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">
              You have <span className="font-semibold text-foreground">{stats.open}</span> open ticket{stats.open === 1 ? "" : "s"}
              {stats.breached > 0 && <> · <span className="text-destructive font-semibold">{stats.breached} breached</span></>}
              {stats.atRisk > 0 && <> · <span className="text-amber-500 font-semibold">{stats.atRisk} at risk</span></>}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Open" value={stats.open} tone="default" />
          <StatCard label="At risk" value={stats.atRisk} tone="warn" icon={Clock} />
          <StatCard label="Breached" value={stats.breached} tone="danger" icon={AlertTriangle} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setParams(f.id === "all" ? {} : { filter: f.id })}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                filter === f.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-surface text-muted-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {myTickets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">All clear</p>
              <p className="text-sm text-muted-foreground mt-1">No tickets match this filter.</p>
            </div>
          ) : (
            myTickets.map((t) => (
              <Link
                key={t.id}
                to={`/app/tickets?ticket=${t.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2 transition-colors group"
              >
                <PriorityDot priority={t.priority} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{t.number}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">{t.status.replace("_", " ")}</span>
                    {t.slaState === "breached" && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">SLA breached</span>
                    )}
                    {t.slaState === "at_risk" && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">At risk</span>
                    )}
                  </div>
                  <div className="font-medium text-sm mt-0.5 truncate">{t.title}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "default" | "warn" | "danger"; icon?: typeof AlertTriangle }) {
  const toneCls = {
    default: "border-border bg-surface",
    warn: "border-amber-500/20 bg-amber-500/5",
    danger: "border-destructive/20 bg-destructive/5",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-4", toneCls)}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {Icon && <Icon className={cn("h-4 w-4", tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-destructive" : "text-muted-foreground")} />}
      </div>
      <div className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cls = {
    critical: "bg-destructive",
    high: "bg-amber-500",
    medium: "bg-sky-500",
    low: "bg-muted-foreground/40",
  }[priority] ?? "bg-muted-foreground/40";
  return <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", cls)} />;
}
