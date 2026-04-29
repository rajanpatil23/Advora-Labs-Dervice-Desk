import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Smile, Frown, Meh, Star, Users, MessageSquare, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { csatApi, csatPercent, type SurveyResponse } from "@/lib/api/csat";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";

type RangeKey = "7" | "30" | "90" | "180";

function bucketByDay(responses: SurveyResponse[], days: number) {
  const buckets: Record<string, { date: string; count: number; total: number; positive: number }> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, count: 0, total: 0, positive: 0 };
  }
  responses.forEach((r) => {
    const key = r.submittedAt.slice(0, 10);
    if (!buckets[key]) return;
    buckets[key].count += 1;
    buckets[key].total += r.score;
    if (r.score >= 4) buckets[key].positive += 1;
  });
  return Object.values(buckets).map((b) => ({
    date: b.date,
    label: new Date(b.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    avg: b.count > 0 ? +(b.total / b.count).toFixed(2) : null,
    csat: b.count > 0 ? +((b.positive / b.count) * 100).toFixed(1) : null,
    count: b.count,
  }));
}

function buildHeatmap(responses: SurveyResponse[], weeks = 12) {
  // 12 rows (weeks ago, oldest at top), 7 cols (Mon..Sun)
  const grid: { week: number; day: number; count: number; avg: number | null; date: string }[] = [];
  const now = new Date();
  // Find Monday of this week
  const startOfThisWeek = new Date(now);
  const dow = (startOfThisWeek.getDay() + 6) % 7; // 0=Mon
  startOfThisWeek.setDate(startOfThisWeek.getDate() - dow);
  startOfThisWeek.setHours(0, 0, 0, 0);

  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startOfThisWeek);
      cellDate.setDate(cellDate.getDate() - w * 7 + d);
      const key = cellDate.toISOString().slice(0, 10);
      const matches = responses.filter((r) => r.submittedAt.slice(0, 10) === key);
      const avg = matches.length ? matches.reduce((s, r) => s + r.score, 0) / matches.length : null;
      grid.push({
        week: weeks - 1 - w, // 0 = oldest
        day: d,
        count: matches.length,
        avg,
        date: key,
      });
    }
  }
  return grid;
}

function heatmapColor(avg: number | null, count: number) {
  if (avg == null || count === 0) return "bg-muted/40 border-border/40";
  if (avg >= 4.5) return "bg-emerald-500 text-white border-emerald-600";
  if (avg >= 4) return "bg-emerald-400/80 text-white border-emerald-500";
  if (avg >= 3) return "bg-amber-400/80 text-amber-950 border-amber-500";
  if (avg >= 2) return "bg-orange-500/80 text-white border-orange-600";
  return "bg-rose-500 text-white border-rose-600";
}

export default function CsatTrends() {
  const nav = useNavigate();
  const [range, setRange] = useState<RangeKey>("30");
  const { responses } = csatApi.get();

  const days = parseInt(range, 10);
  const cutoff = Date.now() - days * 86400_000;
  const inRange = useMemo(
    () => responses.filter((r) => +new Date(r.submittedAt) >= cutoff),
    [responses, cutoff],
  );
  const prevRange = useMemo(
    () => responses.filter((r) => {
      const t = +new Date(r.submittedAt);
      return t >= cutoff - days * 86400_000 && t < cutoff;
    }),
    [responses, cutoff, days],
  );

  const csat = csatPercent(inRange);
  const csatPrev = csatPercent(prevRange);
  const csatDelta = csat - csatPrev;
  const avgScore = inRange.length ? inRange.reduce((s, r) => s + r.score, 0) / inRange.length : 0;
  const avgPrev = prevRange.length ? prevRange.reduce((s, r) => s + r.score, 0) / prevRange.length : 0;
  const responseRate = Math.round(60 + Math.random() * 25); // mock — surveys sent vs submitted

  const trend = useMemo(() => bucketByDay(inRange, days), [inRange, days]);
  const heatmap = useMemo(() => buildHeatmap(responses, 12), [responses]);

  // Score distribution
  const distribution = useMemo(() => {
    const dist = [1, 2, 3, 4, 5].map((s) => ({
      score: s,
      count: inRange.filter((r) => r.score === s).length,
    }));
    return dist;
  }, [inRange]);

  // Agent leaderboard
  const agentStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; positive: number; sum: number; count: number }>();
    inRange.forEach((r) => {
      if (!r.agentId || !r.agentName) return;
      const cur = map.get(r.agentId) ?? { name: r.agentName, total: 0, positive: 0, sum: 0, count: 0 };
      cur.total += 1;
      cur.sum += r.score;
      if (r.score >= 4) cur.positive += 1;
      cur.count += 1;
      map.set(r.agentId, cur);
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        responses: v.total,
        avg: +(v.sum / v.count).toFixed(2),
        csat: +((v.positive / v.count) * 100).toFixed(1),
      }))
      .sort((a, b) => b.csat - a.csat);
  }, [inRange]);

  // Recent comments
  const recentComments = useMemo(
    () => inRange.filter((r) => r.comment?.trim()).slice(0, 12),
    [inRange],
  );

  const exportCsv = () => {
    const header = "submittedAt,ticketNumber,agent,score,comment";
    const rows = inRange.map((r) => [
      r.submittedAt,
      r.ticketNumber,
      r.agentName ?? "",
      r.score,
      `"${(r.comment ?? "").replace(/"/g, '""')}"`,
    ].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `csat-trends-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav("/app/csat")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">CSAT trends</h1>
            <p className="text-sm text-muted-foreground mt-1">Satisfaction trends, cohort analysis, and per-agent performance.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-36"><Calendar className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Smile className="h-4 w-4" />}
          label="CSAT score"
          value={`${csat.toFixed(1)}%`}
          delta={csatDelta}
          suffix="pp"
        />
        <KpiCard
          icon={<Star className="h-4 w-4" />}
          label="Avg rating"
          value={avgScore.toFixed(2)}
          delta={avgScore - avgPrev}
          suffix=""
        />
        <KpiCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Responses"
          value={String(inRange.length)}
          delta={inRange.length - prevRange.length}
          suffix=""
          showSign
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Response rate"
          value={`${responseRate}%`}
          delta={0}
          suffix=""
          neutral
        />
      </div>

      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="heatmap">Cohort heatmap</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        {/* TREND */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">CSAT % over time</CardTitle>
              <p className="text-xs text-muted-foreground">Daily satisfaction (≥4★ counted as positive)</p>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="csat-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number, k: string) => [k === "csat" ? `${v}%` : v, k === "csat" ? "CSAT" : "Responses"]}
                    />
                    <Line type="monotone" dataKey="csat" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Score distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="score" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => "★".repeat(v)} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {distribution.map((d) => (
                          <Cell key={d.score} fill={d.score >= 4 ? "hsl(var(--primary))" : d.score >= 3 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Sentiment breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-2">
                {[
                  { label: "Promoters (5★)", count: inRange.filter((r) => r.score === 5).length, color: "bg-emerald-500", icon: <Smile className="h-4 w-4 text-emerald-600" /> },
                  { label: "Satisfied (4★)", count: inRange.filter((r) => r.score === 4).length, color: "bg-emerald-400", icon: <Smile className="h-4 w-4 text-emerald-500" /> },
                  { label: "Neutral (3★)", count: inRange.filter((r) => r.score === 3).length, color: "bg-amber-400", icon: <Meh className="h-4 w-4 text-amber-500" /> },
                  { label: "Detractors (≤2★)", count: inRange.filter((r) => r.score <= 2).length, color: "bg-rose-500", icon: <Frown className="h-4 w-4 text-rose-500" /> },
                ].map((s) => {
                  const pct = inRange.length ? (s.count / inRange.length) * 100 : 0;
                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-medium">{s.icon}{s.label}</span>
                        <span className="tabular-nums text-muted-foreground">{s.count} · {pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", s.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HEATMAP */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cohort heatmap — last 12 weeks</CardTitle>
              <p className="text-xs text-muted-foreground">Average rating per day. Darker = more responses, color = score.</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex gap-1 pl-12 mb-1">
                    {dayLabels.map((d) => (
                      <div key={d} className="w-10 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{d}</div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {Array.from({ length: 12 }).map((_, w) => (
                      <div key={w} className="flex items-center gap-1">
                        <div className="w-10 text-right pr-2 text-[10px] font-medium text-muted-foreground tabular-nums">
                          {w === 11 ? "this" : `${11 - w}w`}
                        </div>
                        {Array.from({ length: 7 }).map((_, d) => {
                          const cell = heatmap.find((c) => c.week === w && c.day === d);
                          if (!cell) return null;
                          const isFuture = +new Date(cell.date) > Date.now();
                          return (
                            <div
                              key={d}
                              title={isFuture ? `${cell.date} (future)` : `${cell.date}: ${cell.count} response${cell.count === 1 ? "" : "s"}${cell.avg ? ` · avg ${cell.avg.toFixed(2)}★` : ""}`}
                              className={cn(
                                "w-10 h-10 rounded-md border flex flex-col items-center justify-center transition-all hover:scale-110 hover:shadow-md cursor-pointer",
                                isFuture ? "bg-transparent border-dashed border-border/30" : heatmapColor(cell.avg, cell.count),
                              )}
                            >
                              {!isFuture && cell.count > 0 && (
                                <>
                                  <span className="text-[11px] font-bold leading-none">{cell.avg?.toFixed(1)}</span>
                                  <span className="text-[8px] opacity-80 leading-none mt-0.5">n={cell.count}</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-3 mt-4 pl-12 text-[10px] text-muted-foreground">
                    <span>Score:</span>
                    {[
                      { c: "bg-rose-500", l: "1★" },
                      { c: "bg-orange-500/80", l: "2★" },
                      { c: "bg-amber-400/80", l: "3★" },
                      { c: "bg-emerald-400/80", l: "4★" },
                      { c: "bg-emerald-500", l: "5★" },
                    ].map((x) => (
                      <span key={x.l} className="flex items-center gap-1">
                        <span className={cn("h-3 w-3 rounded", x.c)} /> {x.l}
                      </span>
                    ))}
                    <span className="ml-3 flex items-center gap-1">
                      <span className="h-3 w-3 rounded bg-muted/40 border" /> No data
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENTS */}
        <TabsContent value="agents">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Agent leaderboard</CardTitle></CardHeader>
            <CardContent>
              {agentStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No agent responses in this period.</p>
              ) : (
                <div className="space-y-2">
                  {agentStats.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                        i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-zinc-400 text-white" : i === 2 ? "bg-orange-700 text-white" : "bg-muted text-muted-foreground",
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.responses} response{a.responses === 1 ? "" : "s"}</div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star key={idx} className={cn("h-3.5 w-3.5", idx < Math.round(a.avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                        ))}
                        <span className="text-xs font-semibold ml-1.5 tabular-nums">{a.avg.toFixed(2)}</span>
                      </div>
                      <Badge className={cn(
                        "text-xs tabular-nums",
                        a.csat >= 90 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" :
                        a.csat >= 75 ? "bg-amber-500/15 text-amber-600 border-amber-500/30" :
                        "bg-rose-500/15 text-rose-600 border-rose-500/30",
                      )}>
                        {a.csat.toFixed(1)}% CSAT
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMENTS */}
        <TabsContent value="comments">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent comments</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px] pr-2">
                <div className="space-y-3">
                  {recentComments.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No comments in this period.</p>}
                  {recentComments.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("h-3.5 w-3.5", i < r.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{r.ticketNumber}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm">{r.comment}</p>
                      {r.agentName && <p className="text-[11px] text-muted-foreground mt-1.5">→ {r.agentName}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value, delta, suffix, showSign, neutral }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: number;
  suffix: string;
  showSign?: boolean;
  neutral?: boolean;
}) {
  const positive = delta > 0;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          {icon} {label}
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="text-3xl font-bold font-display tabular-nums">{value}</div>
          {!neutral && delta !== 0 && (
            <Badge variant="outline" className={cn(
              "text-[10px] gap-0.5",
              positive ? "text-emerald-600 border-emerald-500/40" : "text-rose-600 border-rose-500/40",
            )}>
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {showSign && positive ? "+" : ""}{delta.toFixed(1)}{suffix}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
