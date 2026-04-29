import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarRange, Plus, Trash2, ChevronLeft, ChevronRight, GripVertical, ArrowUp, ArrowDown,
  UserCheck, UserX, Replace, Clock, Globe2, Radio,
} from "lucide-react";
import { rotationApi, fmtDate, shortDay, type Rotation, type ScheduleOverride } from "@/lib/api/rotations";
import { cn } from "@/lib/utils";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Scheduling() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin" || role === "manager";

  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [newParticipant, setNewParticipant] = useState("");
  const [override, setOverride] = useState<{ original: string; cover: string; starts: string; ends: string; reason: string } | null>(null);

  const refresh = () => {
    const all = rotationApi.list();
    setRotations(all);
    if (!activeId && all[0]) setActiveId(all[0].id);
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const active = useMemo(() => rotations.find((r) => r.id === activeId) ?? null, [rotations, activeId]);

  // Live "who's on now" for every rotation
  const onCallNow = useMemo(() => {
    return rotations.map((r) => ({ rotation: r, agent: rotationApi.whoIsOn(r.id, now) }));
  }, [rotations, now]);

  // 14-day schedule view, anchored on Monday of the (current+offset) week
  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const schedule = useMemo(() => {
    if (!active) return [];
    return rotationApi.schedule(active.id, startOfWeek, 14);
  }, [active, startOfWeek, rotations]);

  const overrides = useMemo(() => active ? rotationApi.overridesForRotation(active.id) : [], [active, rotations]);

  if (!allowed) return <Navigate to="/app" replace />;

  const handleCreate = () => {
    const r = rotationApi.create("New rotation");
    setActiveId(r.id);
    refresh();
    toast.success("Rotation created");
  };

  const patch = (p: Partial<Rotation>) => {
    if (!active) return;
    rotationApi.update(active.id, p);
    refresh();
  };

  const moveParticipant = (name: string, dir: -1 | 1) => {
    if (!active) return;
    const idx = active.participants.indexOf(name);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= active.participants.length) return;
    const next = [...active.participants];
    [next[idx], next[target]] = [next[target], next[idx]];
    rotationApi.reorderParticipants(active.id, next);
    refresh();
  };

  const handleAddParticipant = () => {
    if (!active || !newParticipant.trim()) return;
    rotationApi.addParticipant(active.id, newParticipant);
    setNewParticipant("");
    refresh();
  };

  const startOverride = () => {
    if (!active || active.participants.length === 0) return;
    const startsAt = new Date(); startsAt.setHours(0, 0, 0, 0);
    const endsAt = new Date(startsAt); endsAt.setDate(endsAt.getDate() + 1);
    setOverride({
      original: active.participants[0],
      cover: active.participants[1] ?? active.participants[0],
      starts: startsAt.toISOString().slice(0, 16),
      ends: endsAt.toISOString().slice(0, 16),
      reason: "",
    });
  };

  const saveOverride = () => {
    if (!active || !override) return;
    rotationApi.addOverride({
      rotationId: active.id,
      originalAgent: override.original,
      coverAgent: override.cover,
      startsAt: new Date(override.starts).toISOString(),
      endsAt: new Date(override.ends).toISOString(),
      reason: override.reason,
    });
    setOverride(null);
    refresh();
    toast.success("Override added");
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" /> Scheduling & on-call
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage rotations, shift blocks, and last-minute coverage swaps.
          </p>
        </div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> New rotation</Button>
      </header>

      {/* Live "who's on now" */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" /> On call right now
            <Badge variant="outline" className="ml-2 text-[10px] h-4">{now.toLocaleString([], { hour: "2-digit", minute: "2-digit", weekday: "short" })}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onCallNow.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rotations configured.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {onCallNow.map(({ rotation, agent }) => (
                <button
                  key={rotation.id}
                  onClick={() => setActiveId(rotation.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors hover:bg-muted/40",
                    activeId === rotation.id && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: rotation.color }} />
                    <span className="font-medium text-sm flex-1 truncate">{rotation.name}</span>
                    {!rotation.enabled && <Badge variant="outline" className="text-[9px]">paused</Badge>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {agent ? (
                      <>
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{agent.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{agent}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Globe2 className="h-2.5 w-2.5" /> {rotation.timezone}</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <UserX className="h-3.5 w-3.5" /> Off shift
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        {/* Rotation list */}
        <Card className="col-span-12 lg:col-span-3">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Rotations ({rotations.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {rotations.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-2.5 transition-colors",
                  activeId === r.id ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="font-medium text-sm flex-1 truncate">{r.name}</span>
                  {r.enabled
                    ? <Badge variant="default" className="h-4 text-[10px]">On</Badge>
                    : <Badge variant="outline" className="h-4 text-[10px]">Off</Badge>}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{r.participants.length} people</span>
                  <span>·</span>
                  <span>{r.rotationDays}d shifts</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Editor & schedule */}
        <Card className="col-span-12 lg:col-span-9">
          {!active ? (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Select a rotation</CardContent>
          ) : (
            <>
              <CardHeader className="pb-3 flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex-1 min-w-0">
                  <Input
                    value={active.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    className="h-8 font-semibold text-base border-0 px-0 focus-visible:ring-0 shadow-none bg-transparent"
                  />
                  <Textarea
                    value={active.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    rows={1}
                    placeholder="What's this rotation for?"
                    className="mt-1 text-xs border-0 px-0 focus-visible:ring-0 shadow-none bg-transparent resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={active.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
                  <Button size="sm" variant="ghost" onClick={() => { rotationApi.remove(active.id); setActiveId(null); refresh(); toast.success("Rotation deleted"); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="schedule">
                  <TabsList className="grid grid-cols-4 h-9">
                    <TabsTrigger value="schedule" className="text-xs">Schedule</TabsTrigger>
                    <TabsTrigger value="people" className="text-xs">People</TabsTrigger>
                    <TabsTrigger value="shifts" className="text-xs">Shifts</TabsTrigger>
                    <TabsTrigger value="overrides" className="text-xs">Overrides ({overrides.length})</TabsTrigger>
                  </TabsList>

                  {/* Schedule view */}
                  <TabsContent value="schedule" className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Week of <span className="font-medium text-foreground">{fmtDate(startOfWeek)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)} className="text-xs">Today</Button>
                        <Button size="sm" variant="ghost" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {schedule.slice(0, 14).map((day, i) => {
                        const isToday = day.date.toDateString() === new Date().toDateString();
                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded-lg border p-2 min-h-[88px] flex flex-col gap-1.5",
                              isToday && "border-primary bg-primary/5",
                              !day.agent && "bg-muted/30",
                            )}
                          >
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{shortDay(day.date)}</div>
                            <div className="text-sm font-bold">{day.date.getDate()}</div>
                            {day.agent ? (
                              <div className="mt-auto flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: active.color }} />
                                <span className="text-[10px] truncate font-medium">{day.agent}</span>
                                {day.isOverride && <Replace className="h-2.5 w-2.5 text-amber-500" />}
                              </div>
                            ) : (
                              <div className="mt-auto text-[10px] text-muted-foreground">Off</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t">
                      <div>
                        <Label className="text-xs">Shift length (days)</Label>
                        <Input type="number" min={1} max={30} value={active.rotationDays} onChange={(e) => patch({ rotationDays: Math.max(1, Number(e.target.value)) })} className="mt-1 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Timezone</Label>
                        <Input value={active.timezone} onChange={(e) => patch({ timezone: e.target.value })} className="mt-1 h-9 text-sm font-mono" />
                      </div>
                    </div>
                  </TabsContent>

                  {/* People */}
                  <TabsContent value="people" className="mt-4 space-y-2">
                    {active.participants.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No participants yet - add some below.</p>
                    )}
                    {active.participants.map((p, i) => (
                      <div key={p} className="flex items-center gap-2 rounded-lg border p-2">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{p.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                        <span className="text-sm font-medium flex-1 truncate">{p}</span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === 0} onClick={() => moveParticipant(p, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={i === active.participants.length - 1} onClick={() => moveParticipant(p, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { rotationApi.removeParticipant(active.id, p); refresh(); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Input
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddParticipant()}
                        placeholder="Add participant by name"
                        className="h-9 text-sm"
                      />
                      <Button onClick={handleAddParticipant} disabled={!newParticipant.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Shift blocks */}
                  <TabsContent value="shifts" className="mt-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Restrict on-call to specific weekly time blocks. Leave empty for 24/7 coverage.
                    </p>
                    <div className="space-y-1.5">
                      {DAYS.map((d, wd) => {
                        const block = active.blocks.find((b) => b.weekday === wd);
                        return (
                          <div key={wd} className="flex items-center gap-2 rounded-lg border p-2">
                            <Switch
                              checked={!!block}
                              onCheckedChange={(on) => {
                                const next = on
                                  ? [...active.blocks, { weekday: wd, start: "09:00", end: "18:00" }]
                                  : active.blocks.filter((b) => b.weekday !== wd);
                                patch({ blocks: next });
                              }}
                            />
                            <span className="text-sm font-medium w-12">{d}</span>
                            {block ? (
                              <>
                                <Input type="time" value={block.start} onChange={(e) => patch({ blocks: active.blocks.map((b) => b.weekday === wd ? { ...b, start: e.target.value } : b) })} className="h-8 text-xs flex-1" />
                                <span className="text-muted-foreground">→</span>
                                <Input type="time" value={block.end} onChange={(e) => patch({ blocks: active.blocks.map((b) => b.weekday === wd ? { ...b, end: e.target.value } : b) })} className="h-8 text-xs flex-1" />
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground flex-1">No coverage</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Overrides */}
                  <TabsContent value="overrides" className="mt-4 space-y-3">
                    {!override && (
                      <Button size="sm" variant="outline" onClick={startOverride} disabled={active.participants.length < 2}>
                        <Replace className="h-3.5 w-3.5 mr-1.5" /> Add coverage swap
                      </Button>
                    )}

                    {override && (
                      <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Original on-call</Label>
                            <Select value={override.original} onValueChange={(v) => setOverride({ ...override, original: v })}>
                              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{active.participants.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Covered by</Label>
                            <Select value={override.cover} onValueChange={(v) => setOverride({ ...override, cover: v })}>
                              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{active.participants.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Starts</Label>
                            <Input type="datetime-local" value={override.starts} onChange={(e) => setOverride({ ...override, starts: e.target.value })} className="mt-1 h-9 text-xs" />
                          </div>
                          <div>
                            <Label className="text-xs">Ends</Label>
                            <Input type="datetime-local" value={override.ends} onChange={(e) => setOverride({ ...override, ends: e.target.value })} className="mt-1 h-9 text-xs" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Reason (optional)</Label>
                          <Input value={override.reason} onChange={(e) => setOverride({ ...override, reason: e.target.value })} placeholder="Vacation, sick leave…" className="mt-1 h-9 text-xs" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setOverride(null)}>Cancel</Button>
                          <Button size="sm" onClick={saveOverride}>Save swap</Button>
                        </div>
                      </div>
                    )}

                    <ScrollArea className="max-h-[320px]">
                      <div className="space-y-1.5">
                        {overrides.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No active overrides.</p>
                        ) : (
                          overrides.map((o) => (
                            <div key={o.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-xs">
                              <Replace className="h-3.5 w-3.5 text-amber-500" />
                              <div className="flex-1 min-w-0">
                                <div>
                                  <span className="line-through text-muted-foreground">{o.originalAgent}</span>
                                  {" → "}
                                  <span className="font-medium">{o.coverAgent}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(o.startsAt).toLocaleString()} → {new Date(o.endsAt).toLocaleString()}
                                  {o.reason && ` · ${o.reason}`}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { rotationApi.removeOverride(o.id); refresh(); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
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
