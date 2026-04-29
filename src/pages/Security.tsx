import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Shield, KeyRound, Globe, Trash2, Plus } from "lucide-react";
import { ALL_SCOPES, securityApi, type ApiToken, type IpRule, type SessionPolicy, type SsoConfig } from "@/lib/api/security";

export default function Security() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin";

  const [sso, setSso] = useState<SsoConfig>(securityApi.get().sso);
  const [policy, setPolicy] = useState<SessionPolicy>(securityApi.get().policy);
  const [ipRules, setIpRules] = useState<IpRule[]>(securityApi.get().ipRules);
  const [tokens, setTokens] = useState<ApiToken[]>(securityApi.get().tokens);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  useEffect(() => {
    const s = securityApi.get();
    setSso(s.sso); setPolicy(s.policy); setIpRules(s.ipRules); setTokens(s.tokens);
  }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Security & Access</h1>
          <p className="text-sm text-muted-foreground">SSO, session policy, network rules, and API tokens.</p>
        </div>
      </header>

      <Tabs defaultValue="sso" className="w-full">
        <TabsList>
          <TabsTrigger value="sso">SSO</TabsTrigger>
          <TabsTrigger value="policy">Session policy</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="tokens">API tokens</TabsTrigger>
        </TabsList>

        {/* SSO */}
        <TabsContent value="sso">
          <Card>
            <CardHeader>
              <CardTitle>Single Sign-On</CardTitle>
              <CardDescription>Configure SAML or OIDC for your organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Enable SSO</p>
                  <p className="text-sm text-muted-foreground">Members sign in through your identity provider.</p>
                </div>
                <Switch checked={sso.enabled} onCheckedChange={(v) => setSso({ ...sso, enabled: v })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={sso.provider} onValueChange={(v) => setSso({ ...sso, provider: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saml">SAML 2.0</SelectItem>
                      <SelectItem value="oidc">OIDC</SelectItem>
                      <SelectItem value="google">Google Workspace</SelectItem>
                      <SelectItem value="microsoft">Microsoft Entra ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email domain</Label>
                  <Input placeholder="acme.com" value={sso.domain ?? ""} onChange={(e) => setSso({ ...sso, domain: e.target.value })} />
                </div>

                {sso.provider === "saml" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Metadata URL</Label>
                      <Input value={sso.metadataUrl ?? ""} onChange={(e) => setSso({ ...sso, metadataUrl: e.target.value })} placeholder="https://idp.example.com/metadata" />
                    </div>
                    <div className="space-y-2">
                      <Label>Entity ID</Label>
                      <Input value={sso.entityId ?? ""} onChange={(e) => setSso({ ...sso, entityId: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>SSO URL</Label>
                      <Input value={sso.ssoUrl ?? ""} onChange={(e) => setSso({ ...sso, ssoUrl: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input value={sso.clientId ?? ""} onChange={(e) => setSso({ ...sso, clientId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Client secret</Label>
                      <Input type="password" value={sso.clientSecret ?? ""} onChange={(e) => setSso({ ...sso, clientSecret: e.target.value })} />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Enforce SSO for all members</p>
                  <p className="text-sm text-muted-foreground">Disable password login for non-owner accounts.</p>
                </div>
                <Switch checked={sso.enforceForAll} onCheckedChange={(v) => setSso({ ...sso, enforceForAll: v })} />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => { securityApi.saveSso(sso); toast.success("SSO settings saved"); }}>Save SSO</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy */}
        <TabsContent value="policy">
          <Card>
            <CardHeader>
              <CardTitle>Session & password policy</CardTitle>
              <CardDescription>Applies to all members of this organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session timeout (minutes)</Label>
                  <Input type="number" min={15} value={policy.sessionTimeoutMinutes} onChange={(e) => setPolicy({ ...policy, sessionTimeoutMinutes: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Idle timeout (minutes)</Label>
                  <Input type="number" min={1} value={policy.idleTimeoutMinutes} onChange={(e) => setPolicy({ ...policy, idleTimeoutMinutes: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Password min length</Label>
                  <Input type="number" min={6} value={policy.passwordMinLength} onChange={(e) => setPolicy({ ...policy, passwordMinLength: Number(e.target.value) })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Require symbol in password</p>
                  </div>
                  <Switch checked={policy.passwordRequireSymbol} onCheckedChange={(v) => setPolicy({ ...policy, passwordRequireSymbol: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                  <div>
                    <p className="font-medium">Require multi-factor authentication</p>
                    <p className="text-sm text-muted-foreground">All members must set up MFA at next login.</p>
                  </div>
                  <Switch checked={policy.requireMfa} onCheckedChange={(v) => setPolicy({ ...policy, requireMfa: v })} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => { securityApi.savePolicy(policy); toast.success("Policy saved"); }}>Save policy</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network */}
        <TabsContent value="network">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> IP rules</CardTitle>
                <CardDescription>Allow or block traffic by CIDR range.</CardDescription>
              </div>
              <AddIpRule onAdd={(r) => setIpRules([r, ...ipRules])} />
            </CardHeader>
            <CardContent>
              {ipRules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No rules. All traffic is allowed.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>CIDR</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipRules.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.label}</TableCell>
                        <TableCell className="font-mono text-sm">{r.cidr}</TableCell>
                        <TableCell>
                          <Badge variant={r.mode === "allow" ? "default" : "destructive"}>{r.mode}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { securityApi.removeIpRule(r.id); setIpRules(ipRules.filter(x => x.id !== r.id)); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tokens */}
        <TabsContent value="tokens">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> API tokens</CardTitle>
                <CardDescription>Personal access tokens for programmatic access.</CardDescription>
              </div>
              <CreateToken onCreate={(t, secret) => { setTokens([t, ...tokens]); setNewSecret(secret); }} />
            </CardHeader>
            <CardContent>
              {newSecret && (
                <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
                  <p className="text-sm font-medium">Copy your token now. It will not be shown again.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm break-all">{newSecret}</code>
                    <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(newSecret); toast.success("Copied"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setNewSecret(null)}>Dismiss</Button>
                  </div>
                </div>
              )}
              {tokens.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No tokens yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="font-mono text-xs">{t.prefix}…</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {t.scopes.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { securityApi.revokeToken(t.id); setTokens(tokens.filter(x => x.id !== t.id)); toast.success("Token revoked"); }}>
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
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

function AddIpRule({ onAdd }: { onAdd: (r: IpRule) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [cidr, setCidr] = useState("");
  const [mode, setMode] = useState<"allow" | "block">("allow");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add rule</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New IP rule</DialogTitle><DialogDescription>Use CIDR notation, e.g. 203.0.113.0/24.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Office network" /></div>
          <div className="space-y-2"><Label>CIDR</Label><Input value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="0.0.0.0/0" /></div>
          <div className="space-y-2">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="allow">Allow</SelectItem>
                <SelectItem value="block">Block</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!label || !cidr) { toast.error("Label and CIDR required"); return; }
            const rule = securityApi.addIpRule({ label, cidr, mode });
            onAdd(rule); setOpen(false); setLabel(""); setCidr(""); toast.success("Rule added");
          }}>Add rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateToken({ onCreate }: { onCreate: (t: ApiToken, secret: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["tickets:read"]);

  const toggle = (s: string) => setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New token</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create API token</DialogTitle><DialogDescription>Pick the scopes this token will have.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CI pipeline" /></div>
          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SCOPES.map(s => (
                <label key={s} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                  <Checkbox checked={scopes.includes(s)} onCheckedChange={() => toggle(s)} />
                  <span className="text-sm font-mono">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!name) { toast.error("Name required"); return; }
            if (scopes.length === 0) { toast.error("Pick at least one scope"); return; }
            const { token, secret } = securityApi.createToken(name, scopes);
            onCreate(token, secret); setOpen(false); setName(""); setScopes(["tickets:read"]);
          }}>Create token</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
