import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ShieldCheck, Copy, Plus, Trash2, CheckCircle2, XCircle, Clock, Globe,
  KeyRound, Network, Users, FlaskConical, ArrowRight, ArrowLeft, Sparkles,
} from "lucide-react";
import {
  ssoApi, SP_DETAILS, PROVIDER_PRESETS,
  type SsoConfig, type SsoProvider, type SsoProtocol, type AttributeMap, type RoleMapping,
} from "@/lib/api/sso";

const STEPS = [
  { id: "provider",   title: "Provider",      icon: Network,      description: "Pick your IdP" },
  { id: "metadata",   title: "Metadata",      icon: KeyRound,     description: "Connect IdP" },
  { id: "attributes", title: "Attributes",    icon: Sparkles,     description: "Map claims" },
  { id: "jit",        title: "Provisioning",  icon: Users,        description: "JIT & roles" },
  { id: "domains",    title: "Domains",       icon: Globe,        description: "Verify ownership" },
  { id: "test",       title: "Test & enable", icon: FlaskConical, description: "Round-trip check" },
] as const;

type StepId = typeof STEPS[number]["id"];

export default function SsoSetup() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin";

  const [cfg, setCfg] = useState<SsoConfig>(() => ssoApi.get());
  const [step, setStep] = useState<StepId>("provider");

  const refresh = () => setCfg(ssoApi.get());
  useEffect(() => { refresh(); }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  const update = (patch: Partial<SsoConfig>) => setCfg(ssoApi.save(patch));

  const stepIdx = STEPS.findIndex(s => s.id === step);
  const goNext = () => stepIdx < STEPS.length - 1 && setStep(STEPS[stepIdx + 1].id);
  const goPrev = () => stepIdx > 0 && setStep(STEPS[stepIdx - 1].id);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Single sign-on</h1>
            <p className="text-sm text-muted-foreground">
              Let your team sign in with your identity provider — Okta, Entra ID, Google Workspace, or any SAML/OIDC IdP.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Status</span>
          {cfg.enabled
            ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">Enabled</Badge>
            : <Badge variant="outline">Disabled</Badge>}
        </div>
      </header>

      <Stepper current={step} onSelect={setStep} />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {step === "provider" &&   <ProviderStep cfg={cfg} update={update} />}
          {step === "metadata" &&   <MetadataStep cfg={cfg} update={update} />}
          {step === "attributes" && <AttributesStep cfg={cfg} update={update} />}
          {step === "jit" &&        <JitStep cfg={cfg} onChanged={refresh} />}
          {step === "domains" &&    <DomainsStep cfg={cfg} onChanged={refresh} />}
          {step === "test" &&       <TestStep cfg={cfg} update={update} />}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={goPrev} disabled={stepIdx === 0}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {stepIdx < STEPS.length - 1 ? (
              <Button onClick={goNext}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">All set — toggle SSO on once tests pass.</span>
            )}
          </div>
        </div>

        <SpDetailsCard />
      </div>
    </div>
  );
}

function Stepper({ current, onSelect }: { current: StepId; onSelect: (s: StepId) => void }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = s.id === current;
        const done = i < idx;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors shrink-0 ${
              active ? "bg-primary text-primary-foreground"
              : done ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                     : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
              active ? "bg-primary-foreground/20" : done ? "bg-emerald-500/20" : "bg-background"
            }`}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" /> {s.title}
            </span>
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 opacity-40 hidden md:block" />}
          </button>
        );
      })}
    </div>
  );
}

function ProviderStep({ cfg, update }: { cfg: SsoConfig; update: (p: Partial<SsoConfig>) => void }) {
  const providers = Object.keys(PROVIDER_PRESETS) as SsoProvider[];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Choose your identity provider</CardTitle>
        <CardDescription>We'll pre-fill suggested settings. You can always switch later.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {providers.map(p => {
            const preset = PROVIDER_PRESETS[p];
            const active = cfg.provider === p;
            return (
              <button
                key={p}
                onClick={() => update({ provider: p, protocol: preset.protocol })}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  active ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{preset.label}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{preset.protocol}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{preset.tip}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Login button label</Label>
            <Input value={cfg.displayName} onChange={(e) => update({ displayName: e.target.value })} placeholder="Sign in with Acme SSO" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Protocol</Label>
            <Select value={cfg.protocol} onValueChange={(v) => update({ protocol: v as SsoProtocol })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="saml">SAML 2.0</SelectItem>
                <SelectItem value="oidc">OpenID Connect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetadataStep({ cfg, update }: { cfg: SsoConfig; update: (p: Partial<SsoConfig>) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connect your IdP</CardTitle>
        <CardDescription>
          {cfg.protocol === "saml"
            ? "Provide a metadata URL or paste the XML — we accept either."
            : "Enter your OIDC issuer and client credentials."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cfg.protocol === "saml" ? (
          <Tabs defaultValue="url">
            <TabsList>
              <TabsTrigger value="url">Metadata URL</TabsTrigger>
              <TabsTrigger value="xml">Paste XML</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="space-y-2 pt-3">
              <Label className="text-xs">Federation metadata URL</Label>
              <Input
                value={cfg.metadataUrl}
                onChange={(e) => update({ metadataUrl: e.target.value })}
                placeholder="https://idp.example.com/app/exk1.../sso/saml/metadata"
                className="font-mono text-xs"
              />
            </TabsContent>
            <TabsContent value="xml" className="space-y-2 pt-3">
              <Label className="text-xs">Metadata XML</Label>
              <Textarea
                rows={10}
                value={cfg.metadataXml}
                onChange={(e) => update({ metadataXml: e.target.value })}
                className="font-mono text-[11px]"
                placeholder={`<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" ...>`}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Issuer URL</Label>
              <Input
                value={cfg.oidcIssuer}
                onChange={(e) => update({ oidcIssuer: e.target.value })}
                placeholder="https://login.example.com"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Client ID</Label>
                <Input value={cfg.oidcClientId} onChange={(e) => update({ oidcClientId: e.target.value })} className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Client secret</Label>
                <Input type="password" value={cfg.oidcClientSecret} onChange={(e) => update({ oidcClientSecret: e.target.value })} className="font-mono text-xs" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttributesStep({ cfg, update }: { cfg: SsoConfig; update: (p: Partial<SsoConfig>) => void }) {
  const fields: { key: keyof AttributeMap; label: string; required?: boolean }[] = [
    { key: "email",       label: "Email",       required: true },
    { key: "fullName",    label: "Full name" },
    { key: "firstName",   label: "First name" },
    { key: "lastName",    label: "Last name" },
    { key: "groups",      label: "Groups (for role mapping)" },
    { key: "externalId",  label: "External ID" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attribute mapping</CardTitle>
        <CardDescription>Tell us which IdP claim fills each user field.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(f => (
          <div key={f.key} className="grid grid-cols-12 gap-3 items-center">
            <Label className="col-span-4 text-xs flex items-center gap-1">
              {f.label} {f.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              className="col-span-8 font-mono text-xs"
              value={cfg.attributes[f.key]}
              onChange={(e) => update({ attributes: { ...cfg.attributes, [f.key]: e.target.value } })}
              placeholder="claim name"
            />
          </div>
        ))}
        <div className="rounded-md bg-muted/40 border p-3 text-xs text-muted-foreground">
          Use the exact claim names emitted by your IdP. SAML users typically need
          <code className="font-mono mx-1">http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress</code>
          mapped to <code className="font-mono">email</code>.
        </div>
      </CardContent>
    </Card>
  );
}

function JitStep({ cfg, onChanged }: { cfg: SsoConfig; onChanged: () => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Just-in-time provisioning</CardTitle>
          <CardDescription>Create accounts automatically on first sign-in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">Auto-provision new users</p>
              <p className="text-xs text-muted-foreground">If off, only pre-invited users may sign in via SSO.</p>
            </div>
            <Switch checked={cfg.jitEnabled} onCheckedChange={(v) => { ssoApi.save({ jitEnabled: v }); onChanged(); }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Default role for new users</Label>
              <Select value={cfg.jitDefaultRole} onValueChange={(v) => { ssoApi.save({ jitDefaultRole: v as RoleMapping["appRole"] }); onChanged(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["agent", "resolver", "manager", "admin", "requester"] as const).map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex w-full items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Enforce SSO for verified domains</p>
                  <p className="text-[11px] text-muted-foreground">Block password login on those domains.</p>
                </div>
                <Switch checked={cfg.enforceForDomains} onCheckedChange={(v) => { ssoApi.save({ enforceForDomains: v }); onChanged(); }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Group → role mapping</CardTitle>
            <CardDescription>Match IdP group names to app roles. First match wins.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => { ssoApi.addRoleMapping(); onChanged(); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add mapping
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {cfg.roleMappings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">
              No mappings yet — every user receives the default role.
            </p>
          ) : cfg.roleMappings.map(rm => (
            <div key={rm.id} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-7 font-mono text-xs"
                placeholder="IdP group name"
                value={rm.groupName}
                onChange={(e) => { ssoApi.updateRoleMapping(rm.id, { groupName: e.target.value }); onChanged(); }}
              />
              <Select value={rm.appRole} onValueChange={(v) => { ssoApi.updateRoleMapping(rm.id, { appRole: v as RoleMapping["appRole"] }); onChanged(); }}>
                <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["owner", "admin", "manager", "agent", "resolver", "requester"] as const).map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="col-span-1" onClick={() => { ssoApi.removeRoleMapping(rm.id); onChanged(); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DomainsStep({ cfg, onChanged }: { cfg: SsoConfig; onChanged: () => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(draft.trim())) {
      toast.error("Enter a valid domain like acme.com");
      return;
    }
    ssoApi.addDomain(draft.trim());
    setDraft("");
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Verified domains</CardTitle>
        <CardDescription>Verify ownership so we route their users through SSO automatically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="acme.com" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>

        {cfg.domains.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No domains added yet.</p>
        ) : (
          <div className="space-y-2">
            {cfg.domains.map(d => {
              const Icon = d.status === "verified" ? CheckCircle2 : d.status === "failed" ? XCircle : Clock;
              const tone = d.status === "verified" ? "text-emerald-500" : d.status === "failed" ? "text-destructive" : "text-amber-500";
              return (
                <div key={d.domain} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${tone}`} />
                    <span className="font-medium font-mono text-sm flex-1">{d.domain}</span>
                    <Badge variant={d.status === "verified" ? "default" : d.status === "failed" ? "destructive" : "outline"} className="capitalize text-[10px]">
                      {d.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => { ssoApi.verifyDomain(d.domain); onChanged(); }}>
                      Verify now
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { ssoApi.removeDomain(d.domain); onChanged(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2 text-[11px] font-mono flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">TXT @ {d.domain}:</span>
                    <code className="flex-1 truncate">{d.txtRecord}</code>
                    <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(d.txtRecord); toast.success("TXT record copied"); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TestStep({ cfg, update }: { cfg: SsoConfig; update: (p: Partial<SsoConfig>) => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; latencyMs: number; message: string } | null>(null);

  const run = async () => {
    setRunning(true);
    const r = await ssoApi.testConnection();
    setResult(r);
    setRunning(false);
    toast[r.ok ? "success" : "error"](r.ok ? "SSO test passed" : "SSO test failed", { description: r.message });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test the round trip</CardTitle>
          <CardDescription>We send a sample SAML request and validate the response signature.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={run} disabled={running}>
            <FlaskConical className="h-4 w-4 mr-1" /> {running ? "Testing…" : "Run connection test"}
          </Button>
          {result && (
            <div className={`rounded-lg border p-3 text-sm ${result.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
              <div className="flex items-center gap-2 font-medium">
                {result.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                {result.ok ? "Handshake OK" : "Handshake failed"}
                <span className="text-xs text-muted-foreground ml-auto">{result.latencyMs}ms</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{result.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activate</CardTitle>
          <CardDescription>Once tests pass, enable SSO so it appears on the login screen.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">SSO is {cfg.enabled ? "live" : "disabled"}</p>
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(cfg.updatedAt).toLocaleString()}
              </p>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SpDetailsCard() {
  const copy = (val: string, label: string) => { navigator.clipboard.writeText(val); toast.success(`${label} copied`); };
  return (
    <Card className="lg:sticky lg:top-4 self-start">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Network className="h-4 w-4" /> Service provider info</CardTitle>
        <CardDescription>Paste these into your IdP setup screen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="ACS URL" value={SP_DETAILS.acsUrl} onCopy={() => copy(SP_DETAILS.acsUrl, "ACS URL")} />
        <Field label="Entity ID" value={SP_DETAILS.entityId} onCopy={() => copy(SP_DETAILS.entityId, "Entity ID")} />
        <Field label="NameID format" value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" onCopy={() => copy("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress", "NameID format")} />
        <div className="rounded-md bg-muted/40 border p-2 text-[11px] text-muted-foreground">
          Need help? Each preset above links to provider-specific docs in our knowledge base.
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-[11px]" />
        <Button variant="outline" size="icon" onClick={onCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
