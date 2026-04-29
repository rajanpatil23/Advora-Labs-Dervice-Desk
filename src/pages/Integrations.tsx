import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Plug, Webhook as WebhookIcon, Plus, Trash2, Send, CheckCircle2, XCircle } from "lucide-react";
import { ALL_EVENTS, integrationsApi, type Integration, type IntegrationId, type Webhook, type WebhookEvent, type Delivery } from "@/lib/api/integrations";

const CONFIG_FIELDS: Record<IntegrationId, { key: string; label: string; placeholder: string; type?: string }[]> = {
  slack: [{ key: "webhookUrl", label: "Incoming webhook URL", placeholder: "https://hooks.slack.com/services/..." }],
  msteams: [{ key: "webhookUrl", label: "Connector webhook URL", placeholder: "https://outlook.office.com/webhook/..." }],
  discord: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." }],
  github: [{ key: "repo", label: "Repository (owner/name)", placeholder: "acme/app" }, { key: "token", label: "Personal access token", placeholder: "ghp_...", type: "password" }],
  gitlab: [{ key: "project", label: "Project ID", placeholder: "12345" }, { key: "token", label: "Access token", placeholder: "glpat-...", type: "password" }],
  jira: [{ key: "domain", label: "Site domain", placeholder: "acme.atlassian.net" }, { key: "email", label: "Account email", placeholder: "you@acme.com" }, { key: "token", label: "API token", placeholder: "ATATT...", type: "password" }],
  pagerduty: [{ key: "routingKey", label: "Events API routing key", placeholder: "R0123...", type: "password" }],
  zapier: [{ key: "hookUrl", label: "Catch hook URL", placeholder: "https://hooks.zapier.com/hooks/catch/..." }],
};

export default function Integrations() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin";

  const [state, setState] = useState(integrationsApi.get());
  const [revealed, setRevealed] = useState<{ url: string; secret: string } | null>(null);

  const refresh = () => setState(integrationsApi.get());
  useEffect(() => { refresh(); }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  const grouped = useMemo(() => {
    const g: Record<string, Integration[]> = {};
    state.integrations.forEach(i => { (g[i.category] ??= []).push(i); });
    return g;
  }, [state.integrations]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center gap-3">
        <Plug className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations & Webhooks</h1>
          <p className="text-sm text-muted-foreground">Connect third-party tools and stream events to your own endpoints.</p>
        </div>
      </header>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList>
          <TabsTrigger value="catalog">Marketplace</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>

        {/* Marketplace */}
        <TabsContent value="catalog" className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{cat}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(i => (
                  <IntegrationCard key={i.id} integration={i} onChanged={refresh} />
                ))}
              </div>
            </section>
          ))}
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><WebhookIcon className="h-4 w-4" /> Outgoing webhooks</CardTitle>
                <CardDescription>Send signed event payloads to your endpoints.</CardDescription>
              </div>
              <CreateWebhook onCreated={(wh) => { refresh(); setRevealed({ url: wh.url, secret: wh.secret }); }} />
            </CardHeader>
            <CardContent>
              {revealed && (
                <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
                  <p className="text-sm font-medium">Signing secret - shown only once</p>
                  <p className="text-xs text-muted-foreground mt-1">Use this to verify the <code>X-Signature</code> header on incoming requests.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm break-all">{revealed.secret}</code>
                    <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(revealed.secret); toast.success("Copied"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setRevealed(null)}>Dismiss</Button>
                  </div>
                </div>
              )}
              {state.webhooks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No webhooks configured yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Last delivery</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.webhooks.map(w => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[260px] truncate">{w.url}</TableCell>
                        <TableCell><Badge variant="secondary">{w.events.length} events</Badge></TableCell>
                        <TableCell className="text-sm">
                          {w.lastDeliveryAt ? (
                            <span className="flex items-center gap-1">
                              {w.lastStatus && w.lastStatus < 300
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                              {w.lastStatus} · {new Date(w.lastDeliveryAt).toLocaleTimeString()}
                            </span>
                          ) : <span className="text-muted-foreground">never</span>}
                        </TableCell>
                        <TableCell>
                          <Switch checked={w.active} onCheckedChange={() => { integrationsApi.toggleWebhook(w.id); refresh(); }} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => { integrationsApi.testWebhook(w.id); refresh(); toast.success("Test event sent"); }}>
                              <Send className="h-3.5 w-3.5 mr-1" /> Test
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { integrationsApi.deleteWebhook(w.id); refresh(); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliveries */}
        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Recent deliveries</CardTitle>
              <CardDescription>Last 100 webhook deliveries across all endpoints.</CardDescription>
            </CardHeader>
            <CardContent>
              {state.deliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No deliveries yet. Send a test event from the Webhooks tab.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Payload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.deliveries.map(d => (
                      <DeliveryRow key={d.id} d={d} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeliveryRow({ d }: { d: Delivery }) {
  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground">{new Date(d.at).toLocaleString()}</TableCell>
      <TableCell><Badge variant="outline" className="font-mono text-xs">{d.event}</Badge></TableCell>
      <TableCell>
        <Badge variant={d.status < 300 ? "default" : "destructive"}>{d.status}</Badge>
      </TableCell>
      <TableCell className="text-sm">{d.durationMs}ms</TableCell>
      <TableCell className="font-mono text-xs max-w-[360px] truncate">{d.payloadPreview}</TableCell>
    </TableRow>
  );
}

function IntegrationCard({ integration, onChanged }: { integration: Integration; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const fields = CONFIG_FIELDS[integration.id];
  const [config, setConfig] = useState<Record<string, string>>(integration.config ?? {});

  const handleConnect = () => {
    for (const f of fields) {
      if (!config[f.key]) { toast.error(`${f.label} is required`); return; }
    }
    integrationsApi.connectIntegration(integration.id, config);
    onChanged(); setOpen(false);
    toast.success(`${integration.name} connected`);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{integration.name}</CardTitle>
          <CardDescription className="mt-1 text-xs">{integration.description}</CardDescription>
        </div>
        {integration.connected && <Badge variant="default" className="bg-green-500/15 text-green-600 hover:bg-green-500/20">Connected</Badge>}
      </CardHeader>
      <CardContent className="mt-auto flex gap-2">
        {integration.connected ? (
          <>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(true)}>Configure</Button>
            <Button variant="ghost" size="sm" onClick={() => { integrationsApi.disconnectIntegration(integration.id); onChanged(); toast.success("Disconnected"); }}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button size="sm" className="flex-1" onClick={() => setOpen(true)}>Connect</Button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {integration.name}</DialogTitle>
            <DialogDescription>Credentials are stored in your organization and never shared.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  value={config[f.key] ?? ""}
                  onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleConnect}>{integration.connected ? "Save" : "Connect"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateWebhook({ onCreated }: { onCreated: (wh: Webhook) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["ticket.created"]);

  const toggle = (e: WebhookEvent) => setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New webhook</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New webhook</DialogTitle>
          <DialogDescription>We'll POST signed JSON payloads to this endpoint.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production webhook" /></div>
          <div className="space-y-2"><Label>Endpoint URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.acme.com/hooks/lovable" /></div>
          <div className="space-y-2">
            <Label>Subscribed events</Label>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto">
              {ALL_EVENTS.map(e => (
                <label key={e} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                  <Checkbox checked={events.includes(e)} onCheckedChange={() => toggle(e)} />
                  <span className="text-xs font-mono">{e}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!name || !url) { toast.error("Name and URL required"); return; }
            try { new URL(url); } catch { toast.error("Invalid URL"); return; }
            if (events.length === 0) { toast.error("Pick at least one event"); return; }
            const wh = integrationsApi.createWebhook({ name, url, events });
            onCreated(wh); setOpen(false); setName(""); setUrl(""); setEvents(["ticket.created"]);
          }}>Create webhook</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
