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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Webhook as WebhookIcon, Plus, Trash2, Send, RefreshCw, Copy, Eye, CheckCircle2,
  XCircle, Clock, Plug, KeyRound, RotateCcw,
} from "lucide-react";
import {
  EVENT_OPTIONS, webhooksApi,
  type Delivery, type Webhook, type WebhookEvent,
} from "@/lib/api/webhooks";

export default function Webhooks() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin";

  const [state, setState] = useState(webhooksApi.get());
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [viewing, setViewing] = useState<Delivery | null>(null);

  const refresh = () => setState(webhooksApi.get());
  useEffect(() => { refresh(); }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <WebhookIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
            <p className="text-sm text-muted-foreground">Send signed event payloads to external systems with automatic retries.</p>
          </div>
        </div>
        <Button onClick={() => setEditing(webhooksApi.newWebhook())}>
          <Plus className="h-4 w-4 mr-1" /> New webhook
        </Button>
      </header>

      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints ({state.hooks.length})</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries ({state.deliveries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-3">
          {state.hooks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Plug className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No webhook endpoints yet. Create one to start broadcasting events.</p>
              </CardContent>
            </Card>
          ) : (
            state.hooks.map((h) => (
              <WebhookRow
                key={h.id}
                hook={h}
                onEdit={() => setEditing({ ...h })}
                onChanged={refresh}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Recent deliveries</CardTitle>
                <CardDescription>Last 200 attempts across all endpoints, newest first.</CardDescription>
              </div>
              {state.deliveries.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => { webhooksApi.clearDeliveries(); refresh(); toast.success("Cleared"); }}>
                  Clear log
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {state.deliveries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No deliveries yet. Use the Test action on an endpoint to generate one.
                </p>
              ) : (
                <div className="space-y-2">
                  {state.deliveries.map((d) => (
                    <DeliveryRow
                      key={d.id}
                      delivery={d}
                      onView={() => setViewing(d)}
                      onRetry={async () => {
                        const next = await webhooksApi.retryDelivery(d.id);
                        if (next) toast[next.status === "success" ? "success" : "error"](`Retry ${next.status}`, {
                          description: `HTTP ${next.httpCode} · attempt ${next.attempt}`,
                        });
                        refresh();
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WebhookEditor hook={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      <DeliveryDetail delivery={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function WebhookRow({ hook, onEdit, onChanged }: { hook: Webhook; onEdit: () => void; onChanged: () => void }) {
  const [testEvent, setTestEvent] = useState<WebhookEvent>(hook.events[0] ?? "ticket.created");

  const test = async () => {
    const d = await webhooksApi.testDeliver(hook.id, testEvent);
    toast[d.status === "success" ? "success" : "error"](
      `Delivery ${d.status}`,
      { description: `HTTP ${d.httpCode} in ${d.durationMs}ms` },
    );
    onChanged();
  };

  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        <Switch checked={hook.enabled} onCheckedChange={() => { webhooksApi.toggleWebhook(hook.id); onChanged(); }} />
        <button onClick={onEdit} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{hook.name || "Untitled webhook"}</span>
            {!hook.enabled && <Badge variant="outline" className="text-xs">paused</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">{hook.url || "no URL set"}</p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {hook.events.slice(0, 3).map((e) => (
              <Badge key={e} variant="secondary" className="text-[10px] font-mono">{e}</Badge>
            ))}
            {hook.events.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">+{hook.events.length - 3}</Badge>
            )}
            {hook.events.length === 0 && (
              <span className="text-[11px] text-destructive">no events selected</span>
            )}
          </div>
        </button>
        <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground tabular-nums">
          <span><span className="text-emerald-600 dark:text-emerald-400 font-semibold">{hook.successCount}</span> ok · <span className="text-destructive font-semibold">{hook.failureCount}</span> fail</span>
          {hook.lastDeliveryAt && <span>Last: {new Date(hook.lastDeliveryAt).toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Select value={testEvent} onValueChange={(v) => setTestEvent(v as WebhookEvent)}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_OPTIONS.map(e => <SelectItem key={e.value} value={e.value} className="text-xs font-mono">{e.value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={test} disabled={!hook.url}>
            <Send className="h-3.5 w-3.5 mr-1" /> Test
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => { webhooksApi.deleteWebhook(hook.id); onChanged(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeliveryRow({ delivery, onView, onRetry }: { delivery: Delivery; onView: () => void; onRetry: () => void }) {
  const Icon = delivery.status === "success" ? CheckCircle2 : delivery.status === "failed" ? XCircle : Clock;
  const tone = delivery.status === "success"
    ? "text-emerald-500"
    : delivery.status === "failed"
      ? "text-destructive"
      : "text-amber-500";

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40 transition-colors">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{delivery.webhookName}</span>
          <Badge variant="secondary" className="text-[10px] font-mono">{delivery.event}</Badge>
          {delivery.attempt > 1 && <Badge variant="outline" className="text-[10px]">attempt {delivery.attempt}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate">{delivery.url}</p>
      </div>
      <div className="hidden sm:flex flex-col items-end text-[11px] text-muted-foreground tabular-nums">
        <span>HTTP {delivery.httpCode ?? "-"} · {delivery.durationMs}ms</span>
        <span>{new Date(delivery.at).toLocaleString()}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onView}>
        <Eye className="h-3.5 w-3.5 mr-1" /> View
      </Button>
      {delivery.status !== "success" && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry
        </Button>
      )}
    </div>
  );
}

function WebhookEditor({ hook, onClose, onSaved }: { hook: Webhook | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Webhook | null>(hook);
  useEffect(() => { setDraft(hook); }, [hook]);
  if (!draft) return null;

  const update = (patch: Partial<Webhook>) => setDraft({ ...draft, ...patch });

  const groupedEvents = useMemo(() => {
    const map = new Map<string, typeof EVENT_OPTIONS>();
    EVENT_OPTIONS.forEach((e) => {
      const arr = map.get(e.group) ?? [];
      arr.push(e);
      map.set(e.group, arr);
    });
    return Array.from(map.entries());
  }, []);

  const toggleEvent = (ev: WebhookEvent) => {
    update({
      events: draft.events.includes(ev)
        ? draft.events.filter(e => e !== ev)
        : [...draft.events, ev],
    });
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    if (!draft.url.trim() || !/^https?:\/\//.test(draft.url)) { toast.error("Valid HTTPS URL required"); return; }
    if (draft.events.length === 0) { toast.error("Select at least one event"); return; }
    webhooksApi.saveWebhook(draft);
    toast.success("Webhook saved");
    onSaved(); onClose();
  };

  return (
    <Sheet open={!!hook} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{hook?.successCount || hook?.failureCount ? "Edit endpoint" : "New endpoint"}</SheetTitle>
          <SheetDescription>POST signed JSON payloads to your URL. We'll retry on failure.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="Slack alerts" />
            </div>
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input value={draft.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://example.com/hooks/lovable" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Signing secret</Label>
            <div className="flex gap-2">
              <Input readOnly value={draft.secret} className="font-mono text-xs" />
              <Button variant="outline" size="icon" title="Copy" onClick={() => { navigator.clipboard.writeText(draft.secret); toast.success("Secret copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Rotate"
                onClick={() => {
                  const next = webhooksApi.rotateSecret(draft.id);
                  update({ secret: next });
                  toast.success("Secret rotated");
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              We sign each payload with HMAC-SHA256 and send it as <code className="font-mono">X-Lovable-Signature</code>.
              Verify on your server using this secret.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Events</Label>
            <div className="rounded-lg border divide-y">
              {groupedEvents.map(([group, items]) => (
                <div key={group} className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{group}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((ev) => {
                      const active = draft.events.includes(ev.value);
                      return (
                        <label
                          key={ev.value}
                          className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer transition-colors ${active ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-primary"
                            checked={active}
                            onChange={() => toggleEvent(ev.value)}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">{ev.label}</div>
                            <div className="text-[10px] font-mono text-muted-foreground truncate">{ev.value}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max retries</Label>
              <Input
                type="number" min={0} max={10}
                value={draft.retryPolicy.maxRetries}
                onChange={(e) => update({ retryPolicy: { ...draft.retryPolicy, maxRetries: Math.max(0, Math.min(10, Number(e.target.value) || 0)) } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Backoff (seconds)</Label>
              <Input
                type="number" min={1} max={3600}
                value={draft.retryPolicy.backoffSeconds}
                onChange={(e) => update({ retryPolicy: { ...draft.retryPolicy, backoffSeconds: Math.max(1, Number(e.target.value) || 30) } })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom headers</Label>
              <Button variant="ghost" size="sm" onClick={() => update({ customHeaders: [...draft.customHeaders, { key: "", value: "" }] })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {draft.customHeaders.length === 0 && (
              <p className="text-xs text-muted-foreground">Optional. Useful for routing keys, auth tokens, or tenant IDs.</p>
            )}
            <div className="space-y-2">
              {draft.customHeaders.map((h, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-5" placeholder="X-Header"
                    value={h.key}
                    onChange={(e) => update({ customHeaders: draft.customHeaders.map((x, j) => j === i ? { ...x, key: e.target.value } : x) })}
                  />
                  <Input
                    className="col-span-6" placeholder="value"
                    value={h.value}
                    onChange={(e) => update({ customHeaders: draft.customHeaders.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })}
                  />
                  <Button variant="ghost" size="icon" className="col-span-1"
                    onClick={() => update({ customHeaders: draft.customHeaders.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">Enabled</p>
              <p className="text-xs text-muted-foreground">Disabled endpoints won't receive events.</p>
            </div>
            <Switch checked={draft.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save endpoint</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DeliveryDetail({ delivery, onClose }: { delivery: Delivery | null; onClose: () => void }) {
  if (!delivery) return null;

  return (
    <Dialog open={!!delivery} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Delivery <Badge variant="secondary" className="font-mono">{delivery.event}</Badge>
            <Badge
              variant={delivery.status === "success" ? "default" : "destructive"}
              className="capitalize"
            >
              {delivery.status} · HTTP {delivery.httpCode}
            </Badge>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs truncate">{delivery.url}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Stat label="Attempt" value={String(delivery.attempt)} />
            <Stat label="Duration" value={`${delivery.durationMs}ms`} />
            <Stat label="At" value={new Date(delivery.at).toLocaleString()} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">X-Lovable-Signature</Label>
            <code className="block rounded-md bg-muted p-2 text-[11px] font-mono break-all">{delivery.signature}</code>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Request payload</Label>
            <ScrollArea className="h-48 rounded-md border bg-muted/30">
              <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap">{delivery.payload}</pre>
            </ScrollArea>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Response</Label>
            <code className="block rounded-md bg-muted p-2 text-[11px] font-mono break-all">
              {delivery.responseBody ?? "-"}
            </code>
            {delivery.errorMessage && (
              <p className="text-xs text-destructive">{delivery.errorMessage}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
