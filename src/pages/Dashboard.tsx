import { useAppStore, agents } from "@/lib/store";
import { Avatar, PriorityChip, SlaChip, StatusChip } from "@/components/common/Chips";
import { timeAgo } from "@/lib/format";
import { findUser } from "@/lib/store";
import { ArrowUpRight, Ticket as TicketIcon, AlertOctagon, CheckCircle2, Timer, TrendingUp, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar } from "recharts";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { tickets, setSelectedTicket } = useAppStore();
  const nav = useNavigate();
  const open = tickets.filter(t => t.status !== "resolved" && t.status !== "closed").length;
  const overdue = tickets.filter(t => t.slaState === "breached").length;
  const atRisk = tickets.filter(t => t.slaState === "at_risk").length;
  const resolvedToday = tickets.filter(t => t.resolvedAt && (Date.now() - new Date(t.resolvedAt).getTime() < 86400000)).length;
  const highPriority = tickets.filter(t => t.priority === "critical" || t.priority === "high").slice(0, 5);

  const trend = Array.from({ length: 14 }, (_, i) => ({
    day: `D${i+1}`,
    created: 8 + Math.round(Math.sin(i/2)*5 + Math.random()*6),
    resolved: 7 + Math.round(Math.cos(i/2)*4 + Math.random()*6),
  }));
  const byPriority = (["critical","high","medium","low"] as const).map(p => ({ name: p, value: tickets.filter(t => t.priority === p).length }));
  const byCategory = ["Network","Hardware","Access","Software","Email","Security","Cloud"].map(c => ({ name: c, count: tickets.filter(t => t.category === c).length }));
  const slaCompliance = [
    { name: "Met", value: tickets.filter(t => t.slaState === "met" || t.slaState === "on_track").length, fill: "hsl(var(--success))" },
    { name: "At risk", value: atRisk, fill: "hsl(var(--warning))" },
    { name: "Breached", value: overdue, fill: "hsl(var(--destructive))" },
  ];
  const workload = agents.slice(0, 6).map(a => ({ name: a.name.split(" ")[0], load: a.workload }));

  const priorityColors: Record<string, string> = {
    critical: "hsl(var(--destructive))",
    high: "hsl(var(--accent))",
    medium: "hsl(var(--warning))",
    low: "hsl(var(--info))",
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6 lg:p-8">
          <div className="absolute inset-0 bg-gradient-mesh opacity-60 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Support overview</div>
              <h1 className="mt-1 text-3xl lg:text-4xl font-display font-bold tracking-tight">
                Good morning, <span className="gradient-text">{agents[0].name.split(" ")[0]}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg">Your team has {open} open tickets and {atRisk + overdue} need attention. Let's clear the queue.</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl bg-surface border border-border text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-2">
                Last 30 days <TrendingUp className="h-4 w-4" />
              </button>
              <button onClick={() => nav("/app/tickets")} className="px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold hover:shadow-glow transition-shadow flex items-center gap-2">
                Open agent workspace <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric icon={TicketIcon} label="Total tickets" value={tickets.length} delta="+12%" tone="primary" />
          <Metric icon={Activity} label="Open" value={open} delta="+3" tone="info" />
          <Metric icon={AlertOctagon} label="Overdue" value={overdue} delta="-2" tone="destructive" />
          <Metric icon={CheckCircle2} label="Resolved today" value={resolvedToday} delta="+8" tone="success" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Trend */}
          <Card className="xl:col-span-2" title="Ticket trend" subtitle="Created vs resolved · last 14 days" right={<Legend items={[["Created","hsl(var(--primary))"],["Resolved","hsl(var(--success))"]]} />}>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="created" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" stroke="hsl(var(--success))" fill="url(#g2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* SLA radial */}
          <Card title="SLA compliance" subtitle="Last 30 days">
            <div className="h-64 flex items-center">
              <ResponsiveContainer>
                <RadialBarChart innerRadius="40%" outerRadius="100%" data={slaCompliance} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--surface-2))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              {slaCompliance.map(s => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} /> {s.name} <span className="ml-auto font-mono">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card title="Tickets by category">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={byCategory} margin={{ left: -20, right: 0, top: 10 }}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--surface-2))" }} />
                  <Bar dataKey="count" radius={[8,8,0,0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="By priority">
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byPriority} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {byPriority.map((d) => <Cell key={d.name} fill={priorityColors[d.name]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              {byPriority.map(p => (
                <div key={p.name} className="flex items-center gap-1.5 capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ background: priorityColors[p.name] }} /> {p.name} <span className="ml-auto font-mono">{p.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Agent workload">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={workload} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--surface-2))" }} />
                  <Bar dataKey="load" radius={[0,8,8,0]} fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2" title="High priority tickets" subtitle="Needs your attention">
            <div className="space-y-1">
              {highPriority.map(t => {
                const r = findUser(t.requesterId);
                return (
                  <button key={t.id} onClick={() => { setSelectedTicket(t.id); nav("/app/tickets"); }}
                    className="w-full text-left flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-surface-2 transition-colors">
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
          </Card>

          <Card title="Recent activity">
            <div className="space-y-3 relative pl-4">
              <div className="absolute left-1 top-2 bottom-2 w-px bg-border" />
              {tickets.slice(0,6).flatMap(t => t.activity.slice(0,1)).slice(0,6).map((e, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-3 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
                  <div className="text-xs">{e.text}</div>
                  <div className="text-[10px] text-muted-foreground">{e.by} · {timeAgo(e.at)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, delta, tone }: any) {
  const tones: Record<string, string> = {
    primary: "from-primary/15 to-primary/0 text-primary",
    info: "from-info/15 to-info/0 text-info",
    destructive: "from-destructive/15 to-destructive/0 text-destructive",
    success: "from-success/15 to-success/0 text-success",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
      <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${tones[tone]} opacity-60 blur-2xl pointer-events-none`} />
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-${tone}/10 text-${tone}`}>
          <Icon className={`h-4.5 w-4.5 text-${tone}`} />
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">{delta}</span>
      </div>
      <div className="mt-3 text-3xl font-display font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Card({ title, subtitle, right, children, className = "" }: any) {
  return (
    <div className={`panel p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="font-display font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {items.map(([l, c]) => (
        <span key={l} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} /> {l}</span>
      ))}
    </div>
  );
}
