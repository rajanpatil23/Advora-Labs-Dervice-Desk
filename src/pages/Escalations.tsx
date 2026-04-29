import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Siren, Plus, Trash2, Clock, AlertTriangle, ChevronRight, Calendar, ArrowUp, ArrowDown,
  Zap, CheckCircle2, Settings2, Activity,
} from "lucide-react";
import {
  escalationApi, evaluatePending, ACTION_META, TRIGGER_META,
  type EscalationPolicy, type EscalationActionType, type EscalationTrigger,
} from "@/lib/api/escalations";
import { cn } from "@/lib/utils";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Escalations() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin" || role === "manager";

  const { tickets } = useAppStore();
  const [list, setList] = useState<EscalationPolicy[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = () => {
    const all = escalationApi.list();
    setList(all);
    if (!activeId && all[0]) setActiveId(all[0].id);
  };
  useEffect(() => { refresh(); }, []);

  const active = useMemo(() => list.find((p) => p.id === activeId) ?? null, [list, activeId]);
  const pending = useMemo(() => evaluatePending(tickets as any), [tickets, list]);

  if (!allowed) return <Navigate to="/app" replace />;

  const handleCreate = () => {
    const p = escalationApi.create("New escalation policy");
    setActiveId(p.id);
    refresh();
    toast.success("Policy created");
  };

  const patchActive = (patch: Partial<EscalationPolicy>) => {
    if (!active) return;
    escalationApi.update(active.id, patch);
    refresh();
  };

  const handleDelete = (id: string) => {
    escalationApi.remove(id);
    if (activeId === id) setActiveId(null);
    refresh();
    toast.success("Policy deleted");
  };

  const moveStep = (stepId: string, dir: -1 | 1) => {
    if (!active) return;
    const idx = active.steps.findIndex((s) => s.id === stepId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= active.steps.length) return;
    const next = [...active.steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    patchActive({ steps: next });
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Siren className="h-6 w-6 text-primary" /> Escalation engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-step response chains for SLA risk, breaches, and unresponsive tickets.
          </p>
        </div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> New policy</Button>
      </header>

      {/* Live monitor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose-500" /> Live escalation monitor
            <Badge variant="outline" className="ml-2 text-[10px] h-4">{pending.length} pending</Badge>
          </CardTitle>
          <CardDescription>Tickets currently matching one of your enabled escalation policies.</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              All clear — no tickets currently require escalation.
            </div>
          ) : (
            <ScrollArea className="max-h-[280px]">
              <div className="space-y-1.5">
                {pending.map((p, i) => {
                  const meta = ACTION_META[p.nextStep.action];
                  return (
                    <div key={p.ticketId + p.policy.id + i} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                      <div className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                        p.ticketState === "breached" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600",
                      )}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{p.ticketSubject}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {p.ticketId} · {p.policy.name} · priority {p.priority}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] h-5", meta.tone)}>
                        Next: {meta.label}
                      </Badge>
                      <div className={cn(
                        "text-xs font-mono tabular-nums w-16 text-right",
                        p.etaMinutes < 0 ? "text-destructive" : "text-muted-foreground",
                      )}>
                        {p.etaMinutes < 0 ? `-${Math.abs(p.etaMinutes)}m` : `${p.etaMinutes}m`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        {/* Policy list */}
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Policies ({list.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-2.5 transition-colors",
                  activeId === p.id ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm flex-1 truncate">{p.name}</div>
                  {p.enabled
                    ? <Badge variant="default" className="h-4 text-[10px]">On</Badge>
                    : <Badge variant="outline" className="h-4 text-[10px]">Off</Badge>}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="h-4 text-[10px]">{TRIGGER_META[p.trigger].label}</Badge>
                  {p.priority && <Badge variant="outline" className="h-4 text-[10px]">{p.priority}</Badge>}
                  <span>· {p.steps.length} step{p.steps.length === 1 ? "" : "s"}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="col-span-12 lg:col-span-8">
          {!active ? (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Select a policy to edit.
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-3 flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex-1 min-w-0">
                  <Input
                    value={active.name}
                    onChange={(e) => patchActive({ name: e.target.value })}
                    className="h-8 font-semibold text-base border-0 px-0 focus-visible:ring-0 shadow-none bg-transparent"
                  />
                  <Textarea
                    value={active.description}
                    onChange={(e) => patchActive({ description: e.target.value })}
                    rows={1}
                    placeholder="What does this policy do?"
                    className="mt-1 text-xs border-0 px-0 focus-visible:ring-0 shadow-none bg-transparent resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={active.enabled} onCheckedChange={(v) => patchActive({ enabled: v })} />
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(active.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="steps">
                  <TabsList className="grid grid-cols-3 h-9">
                    <TabsTrigger value="steps" className="text-xs">Escalation chain</TabsTrigger>
                    <TabsTrigger value="trigger" className="text-xs">Trigger</TabsTrigger>
                    <TabsTrigger value="hours" className="text-xs">Business hours</TabsTrigger>
                  </TabsList>

                  <TabsContent value="steps" className="space-y-3 mt-4">
                    {active.steps.map((step, i) => {
                      const meta = ACTION_META[step.action];
                      return (
                        <div key={step.id} className="rounded-lg border p-3 space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </div>
                            <Badge variant="outline" className={cn("text-[10px]", meta.tone)}>{meta.label}</Badge>
                            <div className="ml-auto flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === 0} onClick={() => moveStep(step.id, -1)}>
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === active.steps.length - 1} onClick={() => moveStep(step.id, 1)}>
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { escalationApi.removeStep(active.id, step.id); refresh(); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <Label className="text-[10px] text-muted-foreground">Wait (min)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={step.afterMinutes}
                                onChange={(e) => { escalationApi.updateStep(active.id, step.id, { afterMinutes: Number(e.target.value) }); refresh(); }}
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div className="col-span-8">
                              <Label className="text-[10px] text-muted-foreground">Action</Label>
                              <Select value={step.action} onValueChange={(v) => { escalationApi.updateStep(active.id, step.id, { action: v as EscalationActionType }); refresh(); }}>
                                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(ACTION_META).map(([k, v]) => (
                                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-12">
                              <Label className="text-[10px] text-muted-foreground">Target</Label>
                              <Input
                                value={step.target ?? ""}
                                onChange={(e) => { escalationApi.updateStep(active.id, step.id, { target: e.target.value }); refresh(); }}
                                placeholder="group, channel, or user"
                                className="mt-1 h-8 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => { escalationApi.addStep(active.id, { afterMinutes: 15, action: "notify_assignee" }); refresh(); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add step
                    </Button>
                  </TabsContent>

                  <TabsContent value="trigger" className="space-y-3 mt-4">
                    <div>
                      <Label className="text-xs">Fires when</Label>
                      <Select value={active.trigger} onValueChange={(v) => patchActive({ trigger: v as EscalationTrigger })}>
                        <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRIGGER_META).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              <div>
                                <div className="text-sm">{v.label}</div>
                                <div className="text-[10px] text-muted-foreground">{v.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Apply to priority</Label>
                      <Select
                        value={active.priority ?? "any"}
                        onValueChange={(v) => patchActive({ priority: v === "any" ? null : (v as any) })}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any priority</SelectItem>
                          <SelectItem value="urgent">Urgent only</SelectItem>
                          <SelectItem value="high">High only</SelectItem>
                          <SelectItem value="medium">Medium only</SelectItem>
                          <SelectItem value="low">Low only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="hours" className="space-y-3 mt-4">
                    <div>
                      <Label className="text-xs flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Business days</Label>
                      <div className="flex gap-1 mt-1.5">
                        {DAYS.map((d, i) => {
                          const on = active.businessHours.days.includes(i);
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                const next = on
                                  ? active.businessHours.days.filter((x) => x !== i)
                                  : [...active.businessHours.days, i].sort();
                                patchActive({ businessHours: { ...active.businessHours, days: next } });
                              }}
                              className={cn(
                                "h-9 flex-1 rounded-md border text-xs font-medium transition-colors",
                                on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
                              )}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Start</Label>
                        <Input type="time" value={active.businessHours.start} onChange={(e) => patchActive({ businessHours: { ...active.businessHours, start: e.target.value } })} className="mt-1 h-9" />
                      </div>
                      <div>
                        <Label className="text-xs">End</Label>
                        <Input type="time" value={active.businessHours.end} onChange={(e) => patchActive({ businessHours: { ...active.businessHours, end: e.target.value } })} className="mt-1 h-9" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Timezone</Label>
                      <Input value={active.businessHours.timezone} onChange={(e) => patchActive({ businessHours: { ...active.businessHours, timezone: e.target.value } })} className="mt-1 h-9 font-mono text-xs" placeholder="UTC" />
                    </div>
                    <div>
                      <Label className="text-xs">Holidays (comma-separated YYYY-MM-DD)</Label>
                      <Textarea
                        value={active.businessHours.holidays.join(", ")}
                        onChange={(e) => patchActive({ businessHours: { ...active.businessHours, holidays: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
                        rows={2}
                        className="mt-1 text-xs font-mono"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
