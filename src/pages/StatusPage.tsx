import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Plus, Rss, Settings as SettingsIcon, Trash2, Wrench, Mail, Webhook, Phone, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { statusApi, STATUS_COLORS, STATUS_LABELS, IMPACT_COLORS, type ComponentStatus, type IncidentImpact, type IncidentStatus, type SubscriberChannel } from "@/lib/api/statusPage";

function StatusDot({ status, size = "h-2.5 w-2.5" }: { status: ComponentStatus; size?: string }) {
  return <span className={cn("inline-block rounded-full", size, STATUS_COLORS[status])} />;
}

function UptimeBar({ id, days }: { id: string; days: number }) {
  const data = useMemo(() => statusApi.uptimeFor(id, days), [id, days]);
  return (
    <div className="flex gap-[2px] h-7 items-end">
      {data.map((d) => (
        <div
          key={d.day}
          title={`Day ${d.day + 1}: ${d.pct.toFixed(2)}%`}
          className={cn(
            "flex-1 rounded-sm",
            d.hadIncident ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ height: `${Math.max(20, (d.pct - 95) * 14)}%` }}
        />
      ))}
    </div>
  );
}

export default function StatusPage() {
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((r) => r + 1);

  const overall = statusApi.overallStatus();
  const components = statusApi.listComponents();
  const incidents = statusApi.listIncidents();
  const active = statusApi.activeIncidents();
  const maintenance = statusApi.listMaintenance();
  const subscribers = statusApi.listSubscribers();
  const settings = statusApi.getSettings();

  void refresh;

  const grouped = useMemo(() => {
    const map: Record<string, typeof components> = {};
    components.forEach((c) => {
      const g = c.group ?? "General";
      map[g] = map[g] ?? [];
      map[g].push(c);
    });
    return map;
  }, [components]);

  // Dialog state
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [updateForId, setUpdateForId] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Public status page</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage component health, incidents, maintenance windows, and subscribers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(statusApi.rssFeed()); toast.success("RSS feed copied"); }}>
            <Rss className="h-4 w-4 mr-1.5" /> Copy RSS
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://${settings.pageUrl}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" /> View public page
            </a>
          </Button>
        </div>
      </header>

      {/* Overall banner */}
      <Card className={cn("border-2", overall.status === "operational" ? "border-emerald-500/40" : "border-amber-500/40")}>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {overall.status === "operational" ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-7 w-7 text-amber-500" />
            )}
            <div>
              <div className="text-xl font-semibold">{overall.label}</div>
              <div className="text-xs text-muted-foreground">Last updated {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div><span className="font-semibold">{components.length}</span> <span className="text-muted-foreground">components</span></div>
            <div><span className="font-semibold">{active.length}</span> <span className="text-muted-foreground">active incidents</span></div>
            <div><span className="font-semibold">{subscribers.length}</span> <span className="text-muted-foreground">subscribers</span></div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <Card key={group}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/40 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusDot status={c.status} />
                        <span className="font-medium truncate">{c.name}</span>
                        <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[c.status]}</Badge>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5 ml-4.5">{c.description}</p>}
                    </div>
                    {c.showUptime && (
                      <div className="w-48 hidden md:block">
                        <UptimeBar id={c.id} days={settings.uptimeWindowDays} />
                        <div className="text-[10px] text-muted-foreground mt-1 text-right">{settings.uptimeWindowDays}-day uptime</div>
                      </div>
                    )}
                    <Select value={c.status} onValueChange={(v) => { statusApi.updateComponentStatus(c.id, v as ComponentStatus); toast.success(`${c.name} → ${STATUS_LABELS[v as ComponentStatus]}`); bump(); }}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as ComponentStatus[]).map((s) => (
                          <SelectItem key={s} value={s}><div className="flex items-center gap-2"><StatusDot status={s} />{STATUS_LABELS[s]}</div></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* INCIDENTS */}
        <TabsContent value="incidents" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Incident history</h2>
              <p className="text-xs text-muted-foreground">{active.length} active · {incidents.length - active.length} resolved</p>
            </div>
            <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New incident</Button></DialogTrigger>
              <NewIncidentDialog onCreated={() => { setIncidentOpen(false); bump(); }} components={components} />
            </Dialog>
          </div>

          {incidents.map((inc) => (
            <Card key={inc.id} className={cn(inc.status !== "resolved" && "border-amber-500/40")}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{inc.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge className={IMPACT_COLORS[inc.impact]}>{inc.impact}</Badge>
                      <Badge variant="outline" className="capitalize">{inc.status}</Badge>
                      <span className="text-xs text-muted-foreground">Started {new Date(inc.startedAt).toLocaleString()}</span>
                      {inc.resolvedAt && <span className="text-xs text-muted-foreground">· Resolved {new Date(inc.resolvedAt).toLocaleString()}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {inc.componentIds.map((cid) => {
                        const c = components.find((x) => x.id === cid);
                        return c ? <Badge key={cid} variant="secondary" className="text-[10px]">{c.name}</Badge> : null;
                      })}
                    </div>
                  </div>
                  {inc.status !== "resolved" && (
                    <Dialog open={updateForId === inc.id} onOpenChange={(o) => setUpdateForId(o ? inc.id : null)}>
                      <DialogTrigger asChild><Button size="sm" variant="outline">Post update</Button></DialogTrigger>
                      <PostUpdateDialog incidentId={inc.id} currentStatus={inc.status} onPosted={() => { setUpdateForId(null); bump(); }} />
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 border-l-2 border-border pl-4 ml-1">
                  {[...inc.updates].reverse().map((u) => (
                    <div key={u.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">{u.status}</span>
                        <span className="text-xs text-muted-foreground">{new Date(u.at).toLocaleString()} · {u.authorName}</span>
                      </div>
                      <p className="text-sm mt-1">{u.body}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* MAINTENANCE */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Maintenance windows</h2>
              <p className="text-xs text-muted-foreground">Schedule planned downtime and notify subscribers.</p>
            </div>
            <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
              <DialogTrigger asChild><Button size="sm"><Wrench className="h-4 w-4 mr-1.5" />Schedule</Button></DialogTrigger>
              <ScheduleMaintDialog onCreated={() => { setMaintOpen(false); bump(); }} components={components} />
            </Dialog>
          </div>

          {maintenance.length === 0 && <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No maintenance windows scheduled.</CardContent></Card>}
          {maintenance.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-sky-500" />
                    <span className="font-semibold">{m.title}</span>
                    <Badge variant="outline" className="capitalize">{m.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">{m.description}</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(m.scheduledStart).toLocaleString()} → {new Date(m.scheduledEnd).toLocaleString()}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.componentIds.map((cid) => {
                      const c = components.find((x) => x.id === cid);
                      return c ? <Badge key={cid} variant="secondary" className="text-[10px]">{c.name}</Badge> : null;
                    })}
                  </div>
                </div>
                {m.status === "scheduled" && (
                  <Button variant="ghost" size="sm" onClick={() => { statusApi.cancelMaintenance(m.id); toast.success("Maintenance cancelled"); bump(); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* SUBSCRIBERS */}
        <TabsContent value="subscribers" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Subscribers</h2>
              <p className="text-xs text-muted-foreground">{subscribers.length} total · notified on incidents and maintenance.</p>
            </div>
            <Dialog open={subOpen} onOpenChange={setSubOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add subscriber</Button></DialogTrigger>
              <AddSubscriberDialog components={components} onAdded={() => { setSubOpen(false); bump(); }} />
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0 divide-y">
              {subscribers.map((s) => {
                const Icon = s.channel === "email" ? Mail : s.channel === "webhook" ? Webhook : s.channel === "sms" ? Phone : Rss;
                return (
                  <div key={s.id} className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center"><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{s.target}</span>
                        {!s.confirmed && <Badge variant="outline" className="text-[10px]">Pending confirmation</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {s.channel} · {s.componentIds.length === 0 ? "All components" : `${s.componentIds.length} component(s)`} · joined {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {!s.confirmed && (
                      <Button size="sm" variant="ghost" onClick={() => { statusApi.confirmSubscriber(s.id); toast.success("Confirmed"); bump(); }}>Confirm</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { statusApi.unsubscribe(s.id); toast.success("Unsubscribed"); bump(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {subscribers.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No subscribers yet.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" />Page settings</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Page title</Label><Input defaultValue={settings.pageTitle} onBlur={(e) => { statusApi.updateSettings({ pageTitle: e.target.value }); bump(); }} /></div>
                <div>
                  <Label>Public URL</Label>
                  <div className="flex gap-2">
                    <Input defaultValue={settings.pageUrl} onBlur={(e) => { statusApi.updateSettings({ pageUrl: e.target.value }); bump(); }} />
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(settings.pageUrl); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div><Label>Support email</Label><Input defaultValue={settings.supportEmail} onBlur={(e) => { statusApi.updateSettings({ supportEmail: e.target.value }); bump(); }} /></div>
                <div>
                  <Label>Branding color</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="color" defaultValue={settings.brandingColor} className="w-16 h-10 p-1" onBlur={(e) => { statusApi.updateSettings({ brandingColor: e.target.value }); bump(); }} />
                    <Input defaultValue={settings.brandingColor} onBlur={(e) => { statusApi.updateSettings({ brandingColor: e.target.value }); bump(); }} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div><Label className="text-sm">Show uptime history</Label><p className="text-xs text-muted-foreground">Display per-component uptime graphs publicly.</p></div>
                  <Switch defaultChecked={settings.showUptimeHistory} onCheckedChange={(v) => { statusApi.updateSettings({ showUptimeHistory: v }); bump(); }} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label className="text-sm">Allow public subscriptions</Label><p className="text-xs text-muted-foreground">Let visitors subscribe via email or RSS.</p></div>
                  <Switch defaultChecked={settings.allowSubscriptions} onCheckedChange={(v) => { statusApi.updateSettings({ allowSubscriptions: v }); bump(); }} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Uptime window</Label>
                  <Select defaultValue={String(settings.uptimeWindowDays)} onValueChange={(v) => { statusApi.updateSettings({ uptimeWindowDays: Number(v) as 7 | 30 | 90 }); bump(); }}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold mb-1.5"><Activity className="h-4 w-4" />Notification triggers</div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Subscribers receive notifications when an incident is created, updated, or resolved.</li>
                  <li>Maintenance windows trigger a heads-up email 24h before start and again at start/end.</li>
                  <li>Webhook subscribers receive a signed POST with the full incident payload.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------------- Dialogs ----------------------------- */

function NewIncidentDialog({ onCreated, components }: { onCreated: () => void; components: ReturnType<typeof statusApi.listComponents> }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [impact, setImpact] = useState<IncidentImpact>("minor");
  const [selected, setSelected] = useState<string[]>([]);

  const submit = () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and initial update are required.");
    statusApi.createIncident({ title, body, impact, componentIds: selected, authorName: "On-call Engineer" });
    toast.success("Incident published. Subscribers notified.");
    onCreated();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>New incident</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Increased API error rates" /></div>
        <div>
          <Label>Impact</Label>
          <Select value={impact} onValueChange={(v) => setImpact(v as IncidentImpact)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Affected components</Label>
          <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1.5 mt-1">
            {components.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selected.includes(c.id)} onCheckedChange={(v) => setSelected((s) => v ? [...s, c.id] : s.filter((x) => x !== c.id))} />
                <StatusDot status={c.status} /> {c.name}
              </label>
            ))}
          </div>
        </div>
        <div><Label>Initial update</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What's happening? What are you doing about it?" /></div>
      </div>
      <DialogFooter><Button onClick={submit}>Publish incident</Button></DialogFooter>
    </DialogContent>
  );
}

function PostUpdateDialog({ incidentId, currentStatus, onPosted }: { incidentId: string; currentStatus: IncidentStatus; onPosted: () => void }) {
  const [status, setStatus] = useState<IncidentStatus>(currentStatus);
  const [body, setBody] = useState("");
  const submit = () => {
    if (!body.trim()) return toast.error("Update message is required.");
    statusApi.postUpdate(incidentId, { status, body, authorName: "On-call Engineer" });
    toast.success(status === "resolved" ? "Incident resolved" : "Update posted");
    onPosted();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Post incident update</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>New status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as IncidentStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="identified">Identified</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} /></div>
      </div>
      <DialogFooter><Button onClick={submit}>Post update</Button></DialogFooter>
    </DialogContent>
  );
}

function ScheduleMaintDialog({ onCreated, components }: { onCreated: () => void; components: ReturnType<typeof statusApi.listComponents> }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const submit = () => {
    if (!title || !start || !end) return toast.error("Title, start, and end are required.");
    statusApi.scheduleMaintenance({ title, description: desc, scheduledStart: new Date(start).toISOString(), scheduledEnd: new Date(end).toISOString(), componentIds: selected });
    toast.success("Maintenance scheduled. Subscribers notified.");
    onCreated();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Schedule maintenance</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>Description</Label><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Start</Label><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>End</Label><Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        <div>
          <Label>Affected components</Label>
          <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1.5 mt-1">
            {components.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selected.includes(c.id)} onCheckedChange={(v) => setSelected((s) => v ? [...s, c.id] : s.filter((x) => x !== c.id))} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter><Button onClick={submit}>Schedule</Button></DialogFooter>
    </DialogContent>
  );
}

function AddSubscriberDialog({ components, onAdded }: { components: ReturnType<typeof statusApi.listComponents>; onAdded: () => void }) {
  const [channel, setChannel] = useState<SubscriberChannel>("email");
  const [target, setTarget] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const submit = () => {
    if (!target.trim()) return toast.error("Target is required.");
    statusApi.subscribe({ channel, target, componentIds: selected });
    toast.success(channel === "email" ? "Confirmation email sent" : "Subscriber added");
    onAdded();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add subscriber</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Channel</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as SubscriberChannel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="webhook">Webhook URL</SelectItem>
              <SelectItem value="rss">RSS feed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>{channel === "webhook" ? "Webhook URL" : channel === "sms" ? "Phone number" : "Email address"}</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} /></div>
        <div>
          <Label>Components (leave empty for all)</Label>
          <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1.5 mt-1">
            {components.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selected.includes(c.id)} onCheckedChange={(v) => setSelected((s) => v ? [...s, c.id] : s.filter((x) => x !== c.id))} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter><Button onClick={submit}>Subscribe</Button></DialogFooter>
    </DialogContent>
  );
}
