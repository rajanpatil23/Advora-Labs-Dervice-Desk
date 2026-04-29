import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  KeyRound, Plus, Trash2, Copy, ShieldAlert, ShieldCheck, Code2, Play,
  CheckCircle2, XCircle, Terminal, Eye, EyeOff,
} from "lucide-react";
import {
  apiTokensApi, ENDPOINT_SPECS, SCOPE_CATALOG,
  type ApiScope, type ApiToken, type EndpointSpec,
} from "@/lib/api/apiTokens";

export default function Developer() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin";

  const [state, setState] = useState(apiTokensApi.get());
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ token: ApiToken; secret: string } | null>(null);

  const refresh = () => setState(apiTokensApi.get());
  useEffect(() => { refresh(); }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Code2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Developer console</h1>
            <p className="text-sm text-muted-foreground">Issue scoped API tokens and try endpoints in a live request playground.</p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> New token
        </Button>
      </header>

      <Tabs defaultValue="tokens">
        <TabsList>
          <TabsTrigger value="tokens">Tokens ({state.tokens.length})</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger>
          <TabsTrigger value="reference">API reference</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="space-y-3">
          {state.tokens.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <KeyRound className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No personal access tokens yet. Create one to authenticate API requests.</p>
              </CardContent>
            </Card>
          ) : (
            state.tokens.map(t => (
              <TokenRow key={t.id} token={t} onChanged={refresh} />
            ))
          )}
        </TabsContent>

        <TabsContent value="playground">
          <Playground tokens={state.tokens} onUsed={refresh} />
        </TabsContent>

        <TabsContent value="reference" className="space-y-3">
          <ApiReference />
        </TabsContent>
      </Tabs>

      <CreateTokenSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(payload) => { refresh(); setRevealed(payload); setCreating(false); }}
      />
      <RevealDialog payload={revealed} onClose={() => setRevealed(null)} />
    </div>
  );
}

function TokenRow({ token, onChanged }: { token: ApiToken; onChanged: () => void }) {
  const expired = apiTokensApi.isExpired(token);
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${expired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {expired ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{token.name}</span>
            {expired && <Badge variant="destructive" className="text-[10px]">expired</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
            {token.prefix}…{token.maskedTail} · {token.scopes.length} scope{token.scopes.length !== 1 ? "s" : ""}
          </p>
          <div className="mt-1 flex items-center gap-1 flex-wrap">
            {token.scopes.slice(0, 4).map(s => (
              <Badge key={s} variant="secondary" className="text-[10px] font-mono">{s}</Badge>
            ))}
            {token.scopes.length > 4 && <Badge variant="secondary" className="text-[10px]">+{token.scopes.length - 4}</Badge>}
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground tabular-nums">
          <span>{token.requestCount} requests</span>
          {token.lastUsedAt
            ? <span>Last: {new Date(token.lastUsedAt).toLocaleString()}</span>
            : <span>Never used</span>}
          {token.expiresAt && <span>Expires {new Date(token.expiresAt).toLocaleDateString()}</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Revoke"
          onClick={() => {
            apiTokensApi.revoke(token.id);
            toast.success("Token revoked");
            onChanged();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateTokenSheet({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: { token: ApiToken; secret: string }) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>([]);
  const [expiry, setExpiry] = useState<"never" | "30d" | "90d" | "1y">("never");

  useEffect(() => {
    if (open) { setName(""); setScopes([]); setExpiry("never"); }
  }, [open]);

  const toggle = (s: ApiScope) =>
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const save = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (scopes.length === 0) { toast.error("Pick at least one scope"); return; }
    let expiresAt: string | undefined;
    if (expiry !== "never") {
      const days = expiry === "30d" ? 30 : expiry === "90d" ? 90 : 365;
      expiresAt = new Date(Date.now() + days * 86400_000).toISOString();
    }
    const payload = apiTokensApi.create({ name: name.trim(), scopes, expiresAt });
    onCreated(payload);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create personal access token</SheetTitle>
          <SheetDescription>Tokens inherit your permissions. Pick the smallest scope set possible.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Token name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My CI script" />
            </div>
            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select value={expiry} onValueChange={(v) => setExpiry(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                  <SelectItem value="1y">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Scopes ({scopes.length} selected)</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setScopes(SCOPE_CATALOG.flatMap(g => g.scopes.filter(s => s.value.endsWith(":read")).map(s => s.value)))}>
                  Read-only preset
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setScopes([])}>Clear</Button>
              </div>
            </div>
            <div className="rounded-lg border divide-y">
              {SCOPE_CATALOG.map(group => (
                <div key={group.group} className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{group.group}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.scopes.map(scope => {
                      const active = scopes.includes(scope.value);
                      return (
                        <label key={scope.value}
                          className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors ${active ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                        >
                          <input
                            type="checkbox" className="h-3.5 w-3.5 mt-0.5 accent-primary"
                            checked={active} onChange={() => toggle(scope.value)}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium">{scope.label}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{scope.value}</div>
                            <div className="text-[11px] text-muted-foreground">{scope.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Create token</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RevealDialog({ payload, onClose }: { payload: { token: ApiToken; secret: string } | null; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { setShown(false); }, [payload]);
  if (!payload) return null;
  return (
    <Dialog open={!!payload} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-500" /> Save your token now</DialogTitle>
          <DialogDescription>This is the only time the full secret is shown. Store it somewhere safe — we only keep a masked preview.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              readOnly
              type={shown ? "text" : "password"}
              value={payload.secret}
              className="font-mono text-xs"
            />
            <Button variant="outline" size="icon" title={shown ? "Hide" : "Show"} onClick={() => setShown(!shown)}>
              {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" title="Copy"
              onClick={() => { navigator.clipboard.writeText(payload.secret); toast.success("Copied"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Use it as a Bearer token</div>
            <code className="font-mono break-all">Authorization: Bearer {payload.secret.slice(0, 20)}…</code>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>I've saved it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Playground({ tokens, onUsed }: { tokens: ApiToken[]; onUsed: () => void }) {
  const [endpointId, setEndpointId] = useState<string>(ENDPOINT_SPECS[0].id);
  const [tokenId, setTokenId] = useState<string>(tokens[0]?.id ?? "");
  const [pathParam, setPathParam] = useState<string>("tkt_01");
  const [body, setBody] = useState<string>("");
  const [response, setResponse] = useState<{ status: number; latencyMs: number; body: unknown; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const endpoint = useMemo(() => ENDPOINT_SPECS.find(e => e.id === endpointId)!, [endpointId]);

  useEffect(() => {
    setBody(endpoint.sampleBody ? JSON.stringify(endpoint.sampleBody, null, 2) : "");
    setResponse(null);
  }, [endpointId]);

  useEffect(() => {
    if (!tokenId && tokens[0]) setTokenId(tokens[0].id);
  }, [tokens, tokenId]);

  const token = tokens.find(t => t.id === tokenId);
  const hasScope = token ? token.scopes.includes(endpoint.scope) : false;
  const expired = token ? apiTokensApi.isExpired(token) : false;
  const resolvedPath = endpoint.path.replace("{id}", pathParam || "tkt_01");
  const baseUrl = "https://api.connecttly.com";

  const send = async () => {
    if (!token) { toast.error("Choose a token first"); return; }
    if (expired) { toast.error("Token is expired"); return; }
    if (!hasScope) {
      setResponse({
        status: 403, latencyMs: 12,
        body: { error: "insufficient_scope", required_scope: endpoint.scope, message: `Token is missing scope ${endpoint.scope}` },
        error: "Forbidden",
      });
      return;
    }

    let parsed: unknown = undefined;
    if (endpoint.method !== "GET" && body.trim()) {
      try { parsed = JSON.parse(body); }
      catch {
        setResponse({ status: 400, latencyMs: 8, body: { error: "invalid_json", message: "Request body is not valid JSON" }, error: "Bad Request" });
        return;
      }
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 220 + Math.random() * 380));
    const latencyMs = Math.round(120 + Math.random() * 380);
    setResponse({
      status: endpoint.method === "POST" ? 201 : 200,
      latencyMs,
      body: endpoint.sampleResponse,
    });
    apiTokensApi.recordUsage(token.id);
    onUsed();
    setLoading(false);
  };

  const curl = useMemo(() => {
    const headers = `-H "Authorization: Bearer ${token ? token.prefix + "…" + token.maskedTail : "<TOKEN>"}" \\\n  -H "Content-Type: application/json"`;
    const bodyPart = endpoint.method !== "GET" && body.trim() ? ` \\\n  -d '${body.replace(/\n\s*/g, "")}'` : "";
    const m = endpoint.method === "GET" ? "" : ` \\\n  -X ${endpoint.method}`;
    return `curl ${baseUrl}${resolvedPath}${m} \\\n  ${headers}${bodyPart}`;
  }, [endpoint, token, body, resolvedPath]);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Terminal className="h-4 w-4" /> Request</CardTitle>
          <CardDescription>Pick an endpoint and a token, then send a simulated request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Endpoint</Label>
              <Select value={endpointId} onValueChange={setEndpointId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENDPOINT_SPECS.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="font-mono text-xs mr-2 text-primary">{e.method}</span>
                      <span className="font-mono text-xs">{e.path}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Token</Label>
              <Select value={tokenId} onValueChange={setTokenId} disabled={tokens.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={tokens.length === 0 ? "No tokens yet" : "Pick a token"} />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} <span className="font-mono text-[10px] text-muted-foreground ml-1">({t.prefix}…{t.maskedTail})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-2.5 text-xs font-mono break-all flex items-center gap-2">
            <span className="text-primary font-bold">{endpoint.method}</span>
            <span>{baseUrl}{resolvedPath}</span>
          </div>

          {endpoint.path.includes("{id}") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Path parameter <code className="font-mono">{"{id}"}</code></Label>
              <Input value={pathParam} onChange={(e) => setPathParam(e.target.value)} className="font-mono text-xs" />
            </div>
          )}

          {endpoint.method !== "GET" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Request body (JSON)</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="w-full rounded-md border bg-background p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                spellCheck={false}
              />
            </div>
          )}

          {token && (
            <div className="flex items-center gap-2 text-xs">
              {expired ? (
                <Badge variant="destructive">expired</Badge>
              ) : hasScope ? (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> scope ok
                </Badge>
              ) : (
                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> needs {endpoint.scope}</Badge>
              )}
              <span className="text-muted-foreground">Required: <code className="font-mono">{endpoint.scope}</code></span>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={send} disabled={loading || tokens.length === 0}>
              <Play className="h-3.5 w-3.5 mr-1" /> {loading ? "Sending…" : "Send request"}
            </Button>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(curl); toast.success("cURL copied"); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy as cURL
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Response</CardTitle>
          <CardDescription>
            {response
              ? <span>HTTP <span className={`font-semibold ${response.status >= 400 ? "text-destructive" : "text-emerald-500"}`}>{response.status}</span> · {response.latencyMs}ms</span>
              : "No response yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[360px] rounded-md border bg-muted/30">
            <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap">
              {response ? JSON.stringify(response.body, null, 2) : "// Run a request to see the response here"}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiReference() {
  const grouped = useMemo(() => {
    const m = new Map<string, EndpointSpec[]>();
    ENDPOINT_SPECS.forEach(e => {
      const arr = m.get(e.group) ?? [];
      arr.push(e);
      m.set(e.group, arr);
    });
    return Array.from(m.entries());
  }, []);

  return (
    <div className="space-y-4">
      {grouped.map(([group, items]) => (
        <Card key={group}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {items.map(e => (
              <div key={e.id} className="py-2.5 flex items-center gap-3">
                <Badge variant="outline" className={`font-mono text-[10px] ${e.method === "GET" ? "border-blue-500/30 text-blue-600 dark:text-blue-400" : e.method === "POST" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : e.method === "PATCH" ? "border-amber-500/30 text-amber-600 dark:text-amber-400" : "border-destructive/30 text-destructive"}`}>
                  {e.method}
                </Badge>
                <code className="font-mono text-xs flex-1 truncate">{e.path}</code>
                <span className="text-xs text-muted-foreground hidden md:block">{e.summary}</span>
                <Badge variant="secondary" className="font-mono text-[10px]">{e.scope}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
