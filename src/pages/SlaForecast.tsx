import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  predictAll, summarize, levelStyles, type BreachPrediction,
} from "@/lib/api/slaForecast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Clock, Flame, Shield, TrendingUp, Activity,
  Search, RefreshCw, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SlaForecast() {
  const tickets = useAppStore(s => s.tickets);
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // refresh every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const predictions = useMemo(() => predictAll(tickets, now), [tickets, now]);
  const summary = useMemo(() => summarize(predictions, now), [predictions, now]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return predictions.filter(p => {
      if (levelFilter !== "all" && p.level !== levelFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.number.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [predictions, search, levelFilter, typeFilter]);

  const maxBucket = Math.max(1, ...summary.buckets.map(b => b.predicted));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" /> SLA breach forecast
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Predicted SLA risk across {tickets.length} tickets · updated {now.toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setNow(new Date())}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Risk level cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <RiskCard label="Breached" value={summary.breached} icon={Flame} tone="destructive" />
        <RiskCard label="Imminent" value={summary.imminent} icon={AlertTriangle} tone="orange" />
        <RiskCard label="At risk" value={summary.atRisk} icon={Clock} tone="amber" />
        <RiskCard label="Watch" value={summary.watch} icon={Activity} tone="blue" />
        <RiskCard label="Safe" value={summary.safe} icon={Shield} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Forecast buckets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Predicted breaches over the next 24h</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.buckets.map(b => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium">{b.label}</span>
                  <span className="text-muted-foreground">
                    {b.predicted} predicted{b.imminent > 0 && ` · ${b.imminent} imminent`}
                  </span>
                </div>
                <Progress value={(b.predicted / maxBucket) * 100} className="h-2" />
              </div>
            ))}
            {summary.buckets.every(b => b.predicted === 0) && (
              <p className="text-center text-sm text-muted-foreground py-6">
                No predicted breaches in the next 24 hours. 🎉
              </p>
            )}
          </CardContent>
        </Card>

        {/* Distributions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-medium mb-2">By priority</div>
              {Object.entries(summary.byPriority).length === 0 ? (
                <p className="text-muted-foreground">No at-risk tickets</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(summary.byPriority)
                    .sort((a, b) => b[1] - a[1])
                    .map(([p, n]) => (
                      <div key={p} className="flex items-center justify-between">
                        <span className="capitalize">{p}</span>
                        <Badge variant="secondary">{n}</Badge>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium mb-2">By assignee</div>
              {Object.entries(summary.byAssignee).length === 0 ? (
                <p className="text-muted-foreground">—</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-auto">
                  {Object.entries(summary.byAssignee)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([a, n]) => (
                      <div key={a} className="flex items-center justify-between">
                        <span className="truncate text-xs">{a}</span>
                        <Badge variant="secondary">{n}</Badge>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-base">At-risk queue</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 w-48"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="breached">Breached</SelectItem>
                <SelectItem value="imminent">Imminent</SelectItem>
                <SelectItem value="at_risk">At risk</SelectItem>
                <SelectItem value="watch">Watch</SelectItem>
                <SelectItem value="safe">Safe</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Both clocks</SelectItem>
                <SelectItem value="response">Response</SelectItem>
                <SelectItem value="resolution">Resolution</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No tickets match these filters.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.slice(0, 200).map(p => (
                <PredictionRow
                  key={`${p.ticketId}-${p.type}`}
                  prediction={p}
                  onOpen={() => navigate(`/app/tickets?id=${p.ticketId}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RiskCard({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "destructive" | "orange" | "amber" | "blue" | "emerald";
}) {
  const toneCls: Record<string, string> = {
    destructive: "text-destructive bg-destructive/10",
    orange: "text-orange-600 bg-orange-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    blue: "text-blue-600 bg-blue-500/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${toneCls[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PredictionRow({
  prediction, onOpen,
}: { prediction: BreachPrediction; onOpen: () => void }) {
  const style = levelStyles[prediction.level];
  const m = prediction.minutesRemaining;
  const remainStr = m < 0
    ? `${Math.abs(Math.round(m))}m overdue`
    : m < 60 ? `${Math.round(m)}m left`
    : m < 1440 ? `${Math.round(m / 60)}h left`
    : `${Math.round(m / 1440)}d left`;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left p-4 hover:bg-accent/50 transition-colors flex items-center gap-4"
    >
      <Badge variant="outline" className={style.cls}>{style.label}</Badge>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{prediction.number}</span>
          <Badge variant="outline" className="text-[10px] capitalize">{prediction.priority}</Badge>
          <Badge variant="secondary" className="text-[10px] capitalize">{prediction.type}</Badge>
        </div>
        <div className="font-medium truncate">{prediction.title}</div>
        {prediction.reasons.length > 0 && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {prediction.reasons.join(" · ")}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold tabular-nums">{prediction.riskScore}</div>
        <div className="text-xs text-muted-foreground">{remainStr}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
