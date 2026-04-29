import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { Smile, Star, Plus, Trash2, MessageSquare, TrendingUp, Frown, Meh } from "lucide-react";
import { csatApi, csatPercent, type Survey, type SurveyResponse } from "@/lib/api/csat";

export default function Csat() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin" || role === "manager";

  const [state, setState] = useState(csatApi.get());
  const [editing, setEditing] = useState<Survey | null>(null);
  const refresh = () => setState(csatApi.get());
  useEffect(() => { refresh(); }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  const responses = state.responses;
  const csat = csatPercent(responses);
  const totalResponses = responses.length;
  const avgScore = totalResponses ? responses.reduce((s, r) => s + r.score, 0) / totalResponses : 0;
  const responseRate = 68; // placeholder — backend will compute (responses / surveys sent)

  // distribution
  const dist = useMemo(() => {
    const d: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    responses.forEach(r => { d[r.score] = (d[r.score] ?? 0) + 1; });
    return d;
  }, [responses]);

  // trend (14d)
  const trend = useMemo(() => {
    const buckets = 14;
    const today = Date.now();
    return Array.from({ length: buckets }, (_, i) => {
      const start = today - (buckets - i) * 86400_000;
      const end = start + 86400_000;
      const day = responses.filter(r => {
        const t = new Date(r.submittedAt).getTime();
        return t >= start && t < end;
      });
      return {
        label: new Date(start).toLocaleDateString("en", { month: "short", day: "numeric" }),
        csat: day.length ? Math.round(csatPercent(day)) : null,
      };
    });
  }, [responses]);

  // agent leaderboard
  const byAgent = useMemo(() => {
    const map = new Map<string, { name: string; scores: number[] }>();
    responses.forEach(r => {
      if (!r.agentName) return;
      const cur = map.get(r.agentName) ?? { name: r.agentName, scores: [] };
      cur.scores.push(r.score);
      map.set(r.agentName, cur);
    });
    return [...map.values()]
      .map(a => ({ name: a.name, count: a.scores.length, avg: a.scores.reduce((s, n) => s + n, 0) / a.scores.length }))
      .sort((a, b) => b.avg - a.avg);
  }, [responses]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Smile className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Customer Satisfaction</h1>
            <p className="text-sm text-muted-foreground">Surveys, scores, and feedback from resolved tickets.</p>
          </div>
        </div>
        <Button onClick={() => setEditing(csatApi.newSurvey())}>
          <Plus className="h-4 w-4 mr-1" /> New survey
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="CSAT score" value={`${csat.toFixed(0)}%`} sub="4★ or 5★" tone={csat >= 90 ? "good" : csat >= 75 ? "warn" : "bad"} icon={<Smile className="h-4 w-4" />} />
        <KpiCard label="Avg rating" value={avgScore.toFixed(2)} sub={`out of 5 stars`} icon={<Star className="h-4 w-4" />} />
        <KpiCard label="Responses" value={totalResponses.toLocaleString()} sub="all-time" icon={<MessageSquare className="h-4 w-4" />} />
        <KpiCard label="Response rate" value={`${responseRate}%`} sub="of surveys sent" icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="responses">Responses ({totalResponses})</TabsTrigger>
          <TabsTrigger value="surveys">Surveys ({state.surveys.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>CSAT trend (14 days)</CardTitle>
                <CardDescription>Daily satisfaction score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <AreaChart data={trend} margin={{ left: -20, top: 10 }}>
                      <defs>
                        <linearGradient id="csat-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: any) => v === null ? "—" : `${v}%`} />
                      <Area type="monotone" dataKey="csat" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#csat-grad)" connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Score distribution</CardTitle>
                <CardDescription>How customers rated their support</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[5, 4, 3, 2, 1].map(score => {
                  const count = dist[score] ?? 0;
                  const pct = totalResponses ? (count / totalResponses) * 100 : 0;
                  return (
                    <div key={score} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          {Array.from({ length: score }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          ))}
                        </span>
                        <span className="text-muted-foreground tabular-nums">{count} · {pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Agent CSAT leaderboard</CardTitle>
              <CardDescription>Average score per agent based on their resolved tickets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                      <th className="py-2 px-3">Agent</th>
                      <th className="py-2 px-3 text-right">Responses</th>
                      <th className="py-2 px-3 text-right">Avg score</th>
                      <th className="py-2 px-3">CSAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byAgent.map(a => (
                      <tr key={a.name} className="border-b border-border/50 hover:bg-muted/40">
                        <td className="py-3 px-3 font-medium">{a.name}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{a.count}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{a.avg.toFixed(2)} ★</td>
                        <td className="py-3 px-3 w-[220px]">
                          <Progress value={(a.avg / 5) * 100} className="h-2" />
                        </td>
                      </tr>
                    ))}
                    {byAgent.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No responses yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses">
          <Card>
            <CardContent className="pt-6 space-y-2">
              {responses.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No responses yet.</p>
              ) : (
                responses.map(r => <ResponseRow key={r.id} r={r} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surveys" className="space-y-3">
          {state.surveys.map(s => (
            <Card key={s.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="flex items-center gap-4 py-4">
                <Switch checked={s.enabled} onCheckedChange={() => { csatApi.toggleSurvey(s.id); refresh(); }} />
                <button onClick={() => setEditing({ ...s })} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{s.name || "Untitled survey"}</span>
                    {!s.enabled && <Badge variant="outline" className="text-xs">paused</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground truncate">{s.question}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">{TRIG_LABEL[s.trigger]}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{SCALE_LABEL[s.scale]}</Badge>
                  </div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => { csatApi.deleteSurvey(s.id); refresh(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <SurveyEditor survey={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </div>
  );
}

const TRIG_LABEL = { on_resolved: "On resolved", on_closed: "On closed", manual: "Manual" } as const;
const SCALE_LABEL = { csat_5: "5-star", csat_3: "3-emoji", nps: "NPS 0–10" } as const;

function KpiCard({ label, value, sub, icon, tone }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: "good" | "warn" | "bad" }) {
  const t = tone === "good" ? "text-green-500" : tone === "warn" ? "text-yellow-500" : tone === "bad" ? "text-destructive" : "";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs uppercase tracking-wider">{label}</span>
          {icon}
        </div>
        <div className={`mt-2 text-2xl font-bold ${t}`}>{value}</div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ResponseRow({ r }: { r: SurveyResponse }) {
  const Icon = r.score >= 4 ? Smile : r.score >= 3 ? Meh : Frown;
  const tone = r.score >= 4 ? "text-green-500" : r.score >= 3 ? "text-yellow-500" : "text-destructive";
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className={`h-5 w-5 mt-0.5 ${tone}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs text-muted-foreground">{r.ticketNumber}</span>
          {r.agentName && <span className="text-muted-foreground">· {r.agentName}</span>}
          <span className="ml-auto flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3 w-3 ${i < r.score ? "fill-yellow-500 text-yellow-500" : "text-muted"}`} />
            ))}
          </span>
        </div>
        {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{new Date(r.submittedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

function SurveyEditor({ survey, onClose, onSaved }: { survey: Survey | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Survey | null>(survey);
  useEffect(() => { setDraft(survey); }, [survey]);
  if (!draft) return null;

  const update = (p: Partial<Survey>) => setDraft({ ...draft, ...p });

  const save = () => {
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    if (!draft.question.trim()) { toast.error("Question is required"); return; }
    csatApi.saveSurvey(draft);
    toast.success("Survey saved");
    onSaved(); onClose();
  };

  return (
    <Sheet open={!!survey} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{survey?.name ? "Edit survey" : "New survey"}</SheetTitle>
          <SheetDescription>Sent automatically when the trigger condition is met.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="Post-resolution survey" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={draft.trigger} onValueChange={(v) => update({ trigger: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_resolved">When ticket is resolved</SelectItem>
                  <SelectItem value="on_closed">When ticket is closed</SelectItem>
                  <SelectItem value="manual">Manually sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scale</Label>
              <Select value={draft.scale} onValueChange={(v) => update({ scale: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csat_5">5-star CSAT</SelectItem>
                  <SelectItem value="csat_3">3-emoji 😞 😐 😀</SelectItem>
                  <SelectItem value="nps">NPS (0–10)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Question</Label>
            <Textarea value={draft.question} onChange={(e) => update({ question: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Follow-up prompt (optional)</Label>
            <Textarea value={draft.followUp ?? ""} onChange={(e) => update({ followUp: e.target.value })} rows={2} placeholder="Tell us what we could do better" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">Enabled</p>
              <p className="text-xs text-muted-foreground">Surveys are sent only while enabled.</p>
            </div>
            <Switch checked={draft.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save survey</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
