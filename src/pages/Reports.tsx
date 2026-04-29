import { useMemo, useState } from "react";
import { Download, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle, Star } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import { useAppStore, useOrgAgents } from "@/lib/store";

const PERIODS = [
  { label: "Last 7 days", days: 7, buckets: 7, fmt: "day" },
  { label: "Last 30 days", days: 30, buckets: 30, fmt: "day" },
  { label: "Last 90 days", days: 90, buckets: 12, fmt: "week" },
  { label: "Last 12 months", days: 365, buckets: 12, fmt: "month" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "hsl(0 84% 60%)",
  high: "hsl(25 95% 55%)",
  medium: "hsl(45 93% 55%)",
  low: "hsl(142 71% 45%)",
};

const STATUS_COLORS: Record<string, string> = {
  open: "hsl(217 91% 60%)",
  pending: "hsl(45 93% 55%)",
  resolved: "hsl(142 71% 45%)",
  closed: "hsl(215 16% 47%)",
};

export default function Reports() {
  const { tickets, incidents } = useAppStore();
  const agents = useOrgAgents();
  const [periodIdx, setPeriodIdx] = useState(1);
  const period = PERIODS[periodIdx];

  const cutoff = Date.now() - period.days * 86400000;
  const scoped = useMemo(() => tickets.filter(t => new Date(t.createdAt).getTime() >= cutoff), [tickets, cutoff]);
  const prevScoped = useMemo(() => tickets.filter(t => {
    const d = new Date(t.createdAt).getTime();
    return d >= cutoff - period.days * 86400000 && d < cutoff;
  }), [tickets, cutoff, period.days]);

  // ----- KPIs -----
  const kpis = useMemo(() => {
    const total = scoped.length;
    const resolved = scoped.filter(t => t.status === "resolved" || t.status === "closed").length;
    const slaBreached = scoped.filter(t => t.slaState === "breached").length;
    const slaCompliance = total ? ((total - slaBreached) / total) * 100 : 100;

    // MTTR (resolution hours) using updatedAt-createdAt for resolved
    const resolvedTickets = scoped.filter(t => t.status === "resolved" || t.status === "closed");
    const mttrHours = resolvedTickets.length
      ? resolvedTickets.reduce((s, t) => s + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0) / resolvedTickets.length / 3.6e6
      : 0;

    // CSAT: derive from agent ratings (5-star)
    const csat = agents.length
      ? (agents.reduce((s, a) => s + (a.rating ?? 0), 0) / agents.length) * 20
      : 0;

    const prevTotal = prevScoped.length || 1;
    const volumeDelta = ((total - prevScoped.length) / prevTotal) * 100;

    return { total, resolved, slaBreached, slaCompliance, mttrHours, csat, volumeDelta };
  }, [scoped, prevScoped, agents]);

  // ----- Volume trend (by bucket) -----
  const volumeTrend = useMemo(() => {
    const bucketMs = (period.days * 86400000) / period.buckets;
    return Array.from({ length: period.buckets }, (_, i) => {
      const start = cutoff + i * bucketMs;
      const end = start + bucketMs;
      const created = tickets.filter(t => {
        const d = new Date(t.createdAt).getTime();
        return d >= start && d < end;
      }).length;
      const resolved = tickets.filter(t => {
        const d = new Date(t.updatedAt).getTime();
        return d >= start && d < end && (t.status === "resolved" || t.status === "closed");
      }).length;
      const label = period.fmt === "month"
        ? new Date(start).toLocaleDateString("en", { month: "short" })
        : period.fmt === "week"
          ? `W${i + 1}`
          : new Date(start).toLocaleDateString("en", { month: "short", day: "numeric" });
      return { label, created, resolved };
    });
  }, [tickets, cutoff, period]);

  // ----- Distributions -----
  const byPriority = useMemo(() => {
    const counts: Record<string, number> = {};
    scoped.forEach(t => { counts[t.priority] = (counts[t.priority] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [scoped]);

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    scoped.forEach(t => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [scoped]);

  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    scoped.forEach(t => { counts[t.category] = (counts[t.category] ?? 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [scoped]);

  // ----- Agent leaderboard -----
  const leaderboard = useMemo(() => {
    return [...agents]
      .map(a => ({
        name: a.name.split(" ")[0],
        fullName: a.name,
        resolved: a.resolved,
        rating: a.rating,
        load: scoped.filter(t => t.assigneeId === a.id && t.status !== "resolved" && t.status !== "closed").length,
      }))
      .sort((a, b) => b.resolved - a.resolved)
      .slice(0, 8);
  }, [agents, scoped]);

  // ----- Export -----
  const exportCsv = () => {
    const rows = [
      ["Number", "Title", "Status", "Priority", "Category", "SLA", "Assignee", "Created", "Updated"],
      ...scoped.map(t => {
        const a = agents.find(x => x.id === t.assigneeId);
        return [t.number, t.title.replace(/,/g, ";"), t.status, t.priority, t.category, t.slaState, a?.name ?? "—", t.createdAt, t.updatedAt];
      }),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${period.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported", { description: `${scoped.length} tickets` });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Analytics</div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Reports & Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">Performance, SLA compliance and team productivity</p>
          </div>
          <div className="flex gap-2">
            <select
              value={periodIdx}
              onChange={e => setPeriodIdx(Number(e.target.value))}
              className="h-10 px-3 rounded-lg bg-surface border border-border text-sm"
            >
              {PERIODS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
            </select>
            <button onClick={exportCsv} className="h-10 px-4 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Tickets created"
            value={kpis.total.toLocaleString()}
            icon={<TrendingUp className="h-4 w-4" />}
            delta={kpis.volumeDelta}
          />
          <KpiCard
            label="Resolved"
            value={kpis.resolved.toLocaleString()}
            icon={<CheckCircle2 className="h-4 w-4" />}
            sub={`${kpis.total ? Math.round((kpis.resolved / kpis.total) * 100) : 0}% of total`}
          />
          <KpiCard
            label="SLA compliance"
            value={`${kpis.slaCompliance.toFixed(1)}%`}
            icon={<AlertTriangle className="h-4 w-4" />}
            sub={`${kpis.slaBreached} breached`}
            tone={kpis.slaCompliance >= 95 ? "good" : kpis.slaCompliance >= 85 ? "warn" : "bad"}
          />
          <KpiCard
            label="Avg resolution"
            value={`${kpis.mttrHours.toFixed(1)}h`}
            icon={<Clock className="h-4 w-4" />}
            sub="Mean time to resolve"
          />
          <KpiCard
            label="CSAT score"
            value={`${kpis.csat.toFixed(0)}%`}
            icon={<Star className="h-4 w-4" />}
            sub={`${agents.length} agents rated`}
            tone={kpis.csat >= 90 ? "good" : kpis.csat >= 75 ? "warn" : "bad"}
          />
        </div>

        {/* Volume + distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Created vs resolved" className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={volumeTrend} margin={{ left: -20, top: 10 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#g1)" />
                  <Area type="monotone" dataKey="resolved" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="By priority">
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {byPriority.map((entry) => (
                      <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? "hsl(var(--primary))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* Status + categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="By status">
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                    {byStatus.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Top categories" className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={byCategory} margin={{ left: -20, top: 10 }} layout="vertical">
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} cursor={{ fill: "hsl(var(--surface-2))" }} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* Agent leaderboard */}
        <Panel title="Agent leaderboard">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 px-3">Rank</th>
                  <th className="py-2 px-3">Agent</th>
                  <th className="py-2 px-3 text-right">Resolved</th>
                  <th className="py-2 px-3 text-right">Active load</th>
                  <th className="py-2 px-3 text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((a, i) => (
                  <tr key={a.fullName} className="border-b border-border/50 hover:bg-surface-2/50">
                    <td className="py-3 px-3 font-mono text-muted-foreground">#{i + 1}</td>
                    <td className="py-3 px-3 font-medium">{a.fullName}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{a.resolved}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{a.load}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {a.rating.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No agent data for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, delta, sub, tone }: {
  label: string; value: string; icon: React.ReactNode;
  delta?: number; sub?: string; tone?: "good" | "warn" | "bad";
}) {
  const toneClass = tone === "good" ? "text-green-500" : tone === "warn" ? "text-yellow-500" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`mt-2 text-2xl font-display font-bold ${toneClass}`}>{value}</div>
      {delta !== undefined && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          {delta >= 0
            ? <><TrendingUp className="h-3 w-3 text-green-500" /><span className="text-green-500">+{delta.toFixed(1)}%</span></>
            : <><TrendingDown className="h-3 w-3 text-destructive" /><span className="text-destructive">{delta.toFixed(1)}%</span></>}
          <span className="text-muted-foreground">vs prior period</span>
        </div>
      )}
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`panel p-5 ${className}`}>
      <div className="font-display font-semibold mb-4">{title}</div>
      {children}
    </div>
  );
}
