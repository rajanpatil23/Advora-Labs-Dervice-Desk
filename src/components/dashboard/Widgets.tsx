import { useMemo } from "react";
import { useAppStore, useOrgAgents, findUser } from "@/lib/store";
import { PriorityChip, SlaChip, StatusChip } from "@/components/common/Chips";
import { timeAgo } from "@/lib/format";
import {
  Ticket as TicketIcon,
  AlertOctagon,
  CheckCircle2,
  Activity,
  Timer,
  Smile,
  ListChecks,
  Flame,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { useNavigate } from "react-router-dom";
import type { WidgetId } from "@/lib/api/dashboard";

const TT = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "hsl(var(--destructive))",
  high: "hsl(var(--accent))",
  medium: "hsl(var(--warning))",
  low: "hsl(var(--info))",
};

export function WidgetBody({ id }: { id: WidgetId }) {
  switch (id) {
    case "metric_total":
      return <MetricTotal />;
    case "metric_open":
      return <MetricOpen />;
    case "metric_overdue":
      return <MetricOverdue />;
    case "metric_resolved_today":
      return <MetricResolvedToday />;
    case "metric_at_risk":
      return <MetricAtRisk />;
    case "metric_csat":
      return <MetricCsat />;
    case "trend_area":
      return <TrendArea />;
    case "sla_radial":
      return <SlaRadial />;
    case "category_bar":
      return <CategoryBar />;
    case "priority_pie":
      return <PriorityPie />;
    case "agent_workload":
      return <AgentWorkload />;
    case "high_priority_list":
      return <HighPriorityList />;
    case "recent_activity":
      return <RecentActivity />;
    case "my_queue_summary":
      return <MyQueueSummary />;
    case "incident_pulse":
      return <IncidentPulse />;
    default:
      return null;
  }
}

/* ---------- Metrics ---------- */

function MetricCard({ icon: Icon, label, value, delta, tone }: any) {
  const tones: Record<string, string> = {
    primary: "from-primary/15 to-primary/0",
    info: "from-info/15 to-info/0",
    destructive: "from-destructive/15 to-destructive/0",
    success: "from-success/15 to-success/0",
    warning: "from-warning/15 to-warning/0",
    accent: "from-accent/15 to-accent/0",
  };
  return (
    <div className="relative overflow-hidden h-full">
      <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${tones[tone]} opacity-60 blur-2xl pointer-events-none`} />
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-${tone}/10 text-${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        {delta && <span className="text-[11px] font-semibold text-muted-foreground">{delta}</span>}
      </div>
      <div className="mt-3 text-3xl font-display font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MetricTotal() {
  const tickets = useAppStore((s) => s.tickets);
  return <MetricCard icon={TicketIcon} label="Total tickets" value={tickets.length} delta="+12%" tone="primary" />;
}
function MetricOpen() {
  const tickets = useAppStore((s) => s.tickets);
  const open = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  return <MetricCard icon={Activity} label="Open" value={open} delta="+3" tone="info" />;
}
function MetricOverdue() {
  const tickets = useAppStore((s) => s.tickets);
  const overdue = tickets.filter((t) => t.slaState === "breached").length;
  return <MetricCard icon={AlertOctagon} label="Overdue" value={overdue} delta="-2" tone="destructive" />;
}
function MetricResolvedToday() {
  const tickets = useAppStore((s) => s.tickets);
  const v = tickets.filter((t) => t.resolvedAt && Date.now() - new Date(t.resolvedAt).getTime() < 86400000).length;
  return <MetricCard icon={CheckCircle2} label="Resolved today" value={v} delta="+8" tone="success" />;
}
function MetricAtRisk() {
  const tickets = useAppStore((s) => s.tickets);
  const v = tickets.filter((t) => t.slaState === "at_risk").length;
  return <MetricCard icon={Timer} label="SLA at risk" value={v} delta="+1" tone="warning" />;
}
function MetricCsat() {
  return <MetricCard icon={Smile} label="CSAT (30d)" value="4.6" delta="+0.2" tone="accent" />;
}

/* ---------- Charts ---------- */

function TrendArea() {
  const trend = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        day: `D${i + 1}`,
        created: 8 + Math.round(Math.sin(i / 2) * 5 + Math.random() * 6),
        resolved: 7 + Math.round(Math.cos(i / 2) * 4 + Math.random() * 6),
      })),
    [],
  );
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <AreaChart data={trend} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="dwg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dwg2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TT} />
          <Area type="monotone" dataKey="created" stroke="hsl(var(--primary))" fill="url(#dwg1)" strokeWidth={2} />
          <Area type="monotone" dataKey="resolved" stroke="hsl(var(--success))" fill="url(#dwg2)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SlaRadial() {
  const tickets = useAppStore((s) => s.tickets);
  const data = [
    { name: "Met", value: tickets.filter((t) => t.slaState === "met" || t.slaState === "on_track").length, fill: "hsl(var(--success))" },
    { name: "At risk", value: tickets.filter((t) => t.slaState === "at_risk").length, fill: "hsl(var(--warning))" },
    { name: "Breached", value: tickets.filter((t) => t.slaState === "breached").length, fill: "hsl(var(--destructive))" },
  ];
  return (
    <>
      <div className="h-44">
        <ResponsiveContainer>
          <RadialBarChart innerRadius="40%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--surface-2))" }} />
            <Tooltip contentStyle={TT} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
        {data.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.fill as string }} /> {s.name}{" "}
            <span className="ml-auto font-mono">{s.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CategoryBar() {
  const tickets = useAppStore((s) => s.tickets);
  const data = ["Network", "Hardware", "Access", "Software", "Email", "Security", "Cloud"].map((c) => ({
    name: c,
    count: tickets.filter((t) => t.category === c).length,
  }));
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -20, right: 0, top: 10 }}>
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TT} cursor={{ fill: "hsl(var(--surface-2))" }} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PriorityPie() {
  const tickets = useAppStore((s) => s.tickets);
  const data = (["critical", "high", "medium", "low"] as const).map((p) => ({
    name: p,
    value: tickets.filter((t) => t.priority === p).length,
  }));
  return (
    <>
      <div className="h-44">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={4}>
              {data.map((d) => (
                <Cell key={d.name} fill={PRIORITY_COLORS[d.name]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TT} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        {data.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5 capitalize">
            <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLORS[p.name] }} /> {p.name}{" "}
            <span className="ml-auto font-mono">{p.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function AgentWorkload() {
  const agents = useOrgAgents();
  const data = agents.slice(0, 6).map((a) => ({ name: a.name.split(" ")[0], load: a.workload }));
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={70} />
          <Tooltip contentStyle={TT} cursor={{ fill: "hsl(var(--surface-2))" }} />
          <Bar dataKey="load" radius={[0, 8, 8, 0]} fill="hsl(var(--accent))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Lists ---------- */

function HighPriorityList() {
  const { tickets, setSelectedTicket } = useAppStore();
  const nav = useNavigate();
  const items = tickets.filter((t) => t.priority === "critical" || t.priority === "high").slice(0, 6);
  return (
    <div className="space-y-1">
      {items.map((t) => {
        const r = findUser(t.requesterId);
        return (
          <button
            key={t.id}
            onClick={() => {
              setSelectedTicket(t.id);
              nav("/app/tickets");
            }}
            className="w-full text-left flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <PriorityChip priority={t.priority} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{t.title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="font-mono">{t.number}</span> · <span>{r?.name}</span> · <span>{timeAgo(t.updatedAt)}</span>
              </div>
            </div>
            <StatusChip status={t.status} />
            <SlaChip state={t.slaState} />
          </button>
        );
      })}
    </div>
  );
}

function RecentActivity() {
  const tickets = useAppStore((s) => s.tickets);
  return (
    <div className="space-y-3 relative pl-4">
      <div className="absolute left-1 top-2 bottom-2 w-px bg-border" />
      {tickets
        .slice(0, 6)
        .flatMap((t) => t.activity.slice(0, 1))
        .slice(0, 6)
        .map((e, i) => (
          <div key={i} className="relative">
            <span className="absolute -left-3 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
            <div className="text-xs">{e.text}</div>
            <div className="text-[10px] text-muted-foreground">
              {e.by} · {timeAgo(e.at)}
            </div>
          </div>
        ))}
    </div>
  );
}

function MyQueueSummary() {
  const { tickets, currentUserId, setSelectedTicket } = useAppStore();
  const nav = useNavigate();
  const mine = tickets.filter((t) => t.assigneeId === currentUserId).slice(0, 5);
  if (!mine.length)
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-sm text-muted-foreground">
        <ListChecks className="h-8 w-8 mb-2 opacity-50" />
        Your queue is clear.
      </div>
    );
  return (
    <div className="space-y-1">
      {mine.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            setSelectedTicket(t.id);
            nav("/app/tickets");
          }}
          className="w-full text-left flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <PriorityChip priority={t.priority} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{t.title}</div>
            <div className="text-[11px] text-muted-foreground font-mono">{t.number}</div>
          </div>
          <StatusChip status={t.status} />
        </button>
      ))}
    </div>
  );
}

function IncidentPulse() {
  const incidents = useAppStore((s) => s.incidents);
  const active = incidents.filter((i: any) => i.status !== "resolved").slice(0, 5);
  if (!active.length)
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-sm text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mb-2 text-success/70" />
        All systems operational.
      </div>
    );
  return (
    <div className="space-y-2">
      {active.map((i: any) => (
        <div key={i.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2/50">
          <Flame className="h-4 w-4 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{i.title}</div>
            <div className="text-[11px] text-muted-foreground capitalize">
              {i.severity} · {i.status?.replace("_", " ")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
