import { useMemo, useState } from "react";
import { useOrgLogs } from "@/lib/store";
import { timeAgo, formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Download, Search, Filter, Calendar, X, Activity, AlertOctagon, User, Timer, Settings as SettingsIcon } from "lucide-react";
import { toCsv, downloadFile } from "@/lib/csv";
import { toast } from "sonner";

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  ticket:   { label: "Ticket",   icon: Activity,      color: "bg-primary/15 text-primary border-primary/30" },
  incident: { label: "Incident", icon: AlertOctagon,  color: "bg-destructive/15 text-destructive border-destructive/30" },
  user:     { label: "User",     icon: User,          color: "bg-info/15 text-info border-info/30" },
  sla:      { label: "SLA",      icon: Timer,         color: "bg-warning/15 text-warning border-warning/30" },
  system:   { label: "System",   icon: SettingsIcon,  color: "bg-muted text-muted-foreground border-border" },
};

const RANGES = [
  { value: "all", label: "All time" },
  { value: "1h",  label: "Last hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const RANGE_MS: Record<string, number> = { "1h": 3.6e6, "24h": 8.64e7, "7d": 6.048e8, "30d": 2.592e9 };

export default function Logs() {
  const logs = useOrgLogs();
  const [type, setType] = useState<string>("all");
  const [range, setRange] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const actors = useMemo(() => Array.from(new Set(logs.map((l) => l.actor))).sort(), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);

  const filtered = useMemo(() => {
    const cutoff = RANGE_MS[range] ? Date.now() - RANGE_MS[range] : 0;
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (type !== "all" && l.type !== type) return false;
      if (actorFilter && l.actor !== actorFilter) return false;
      if (actionFilter && l.action !== actionFilter) return false;
      if (cutoff && new Date(l.at).getTime() < cutoff) return false;
      if (q) {
        const blob = `${l.actor} ${l.action} ${l.target} ${l.type}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [logs, type, range, search, actorFilter, actionFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: logs.length };
    Object.keys(TYPE_META).forEach((k) => { c[k] = logs.filter((l) => l.type === k).length; });
    return c;
  }, [logs]);

  // Group by day for timeline
  const grouped = useMemo(() => {
    const out: Record<string, typeof filtered> = {};
    filtered.forEach((l) => {
      const d = new Date(l.at);
      const key = d.toISOString().slice(0, 10);
      (out[key] ??= []).push(l);
    });
    return Object.entries(out).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const clearFilters = () => {
    setType("all"); setRange("all"); setSearch("");
    setActorFilter(""); setActionFilter("");
  };
  const hasFilters = type !== "all" || range !== "all" || search || actorFilter || actionFilter;

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const rows = filtered.map((l) => ({
      timestamp: l.at, type: l.type, actor: l.actor, action: l.action, target: l.target,
    }));
    downloadFile(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), "text/csv;charset=utf-8");
    toast.success(`Exported ${filtered.length} entries`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
              <ScrollText className="h-3 w-3" /> Audit
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Activity log</h1>
            <p className="text-sm text-muted-foreground mt-1">{filtered.length} of {logs.length} entries</p>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
          </div>
        </header>

        {/* Type pills with counts */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setType("all")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${type === "all" ? "bg-primary text-primary-foreground" : "bg-surface-2 hover:bg-muted"}`}>
            All <Badge variant="secondary" className="h-4 text-[10px] tabular-nums">{counts.all}</Badge>
          </button>
          {Object.entries(TYPE_META).map(([k, m]) => {
            const Icon = m.icon;
            return (
              <button key={k} onClick={() => setType(k)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${type === k ? "bg-primary text-primary-foreground" : "bg-surface-2 hover:bg-muted"}`}>
                <Icon className="h-3 w-3" /> {m.label} <Badge variant="secondary" className="h-4 text-[10px] tabular-nums">{counts[k] ?? 0}</Badge>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actor, action, or target…" className="pl-8 h-9" />
            </div>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[160px] h-9">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actorFilter || "all"} onValueChange={(v) => setActorFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9">
                <User className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Any actor" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">Any actor</SelectItem>
                {actors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter || "all"} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Any action" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">Any action</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No log entries match these filters.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {grouped.map(([day, items]) => (
                  <div key={day}>
                    <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm px-5 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                      {new Date(day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      <span className="ml-2 text-muted-foreground/60">· {items.length} event{items.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="divide-y divide-border/60">
                      {items.map((l) => {
                        const meta = TYPE_META[l.type] ?? TYPE_META.system;
                        const Icon = meta.icon;
                        return (
                          <div key={l.id} className="grid grid-cols-[140px_110px_1fr] items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-xs font-mono text-foreground">{new Date(l.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                              <span className="text-[10px] text-muted-foreground">{timeAgo(l.at)}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded border w-fit ${meta.color}`}>
                              <Icon className="h-2.5 w-2.5" /> {meta.label}
                            </span>
                            <div className="text-sm flex flex-wrap items-center gap-x-1.5 min-w-0">
                              <span className="font-semibold">{l.actor}</span>
                              <span className="text-muted-foreground">{l.action}</span>
                              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground/80 truncate max-w-full">{l.target}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
