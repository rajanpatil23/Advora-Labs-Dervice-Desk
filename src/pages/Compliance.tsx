import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgLogs } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldCheck, Download, FileSignature, Calendar, Trash2, Plus, RefreshCw,
  KeyRound, FileCheck2, FileX2, Filter, Clock, Mail,
} from "lucide-react";
import {
  complianceApi, type ExportFormat, type ExportRecord, type ScheduledExport,
} from "@/lib/api/compliance";

const RANGES = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

const FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "csv",    label: "CSV",     description: "Spreadsheet-friendly. Best for auditors." },
  { value: "json",   label: "JSON",    description: "Structured. Includes schema version + envelope." },
  { value: "ndjson", label: "NDJSON",  description: "Newline-delimited. Stream-friendly for SIEMs." },
];

export default function Compliance() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin";

  const logs = useOrgLogs();
  const [state, setState] = useState(complianceApi.get());
  const [keyId, setKeyId] = useState<string>(() => complianceApi.signingKeyId());
  const refresh = () => setState(complianceApi.get());
  useEffect(() => { refresh(); }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Compliance & exports</h1>
            <p className="text-sm text-muted-foreground">Generate signed audit exports, configure retention, and schedule recurring deliveries.</p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export">Generate export</TabsTrigger>
          <TabsTrigger value="history">History ({state.exports.length})</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="schedules">Schedules ({state.retention.scheduledExports.length})</TabsTrigger>
          <TabsTrigger value="verify">Verify manifest</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <ExportPanel logs={logs} keyId={keyId} onGenerated={refresh} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryPanel records={state.exports} onChanged={refresh} />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionPanel
            keyId={keyId}
            onRotate={() => { setKeyId(complianceApi.rotateSigningKey()); toast.success("Signing key rotated"); }}
            policy={state.retention}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="schedules">
          <SchedulesPanel
            schedules={state.retention.scheduledExports}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="verify">
          <VerifyPanel keyId={keyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExportPanel({ logs, keyId, onGenerated }: { logs: ReturnType<typeof useOrgLogs>; keyId: string; onGenerated: () => void }) {
  const [range, setRange] = useState<typeof RANGES[number]["value"]>("30d");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [type, setType] = useState<string>("all");
  const [actor, setActor] = useState<string>("");
  const [running, setRunning] = useState(false);

  const types = useMemo(() => Array.from(new Set(logs.map(l => l.type))).sort(), [logs]);
  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (type !== "all" && l.type !== type) return false;
      if (actor && !l.actor.toLowerCase().includes(actor.toLowerCase())) return false;
      return true;
    });
  }, [logs, type, actor]);

  const generate = async () => {
    setRunning(true);
    const { record } = await complianceApi.generateExport({
      logs: filtered, format, range,
      filters: { type: type === "all" ? undefined : type, actor: actor || undefined },
    });
    setRunning(false);
    onGenerated();
    toast.success(`Exported ${record.recordCount} records`, { description: `Signed manifest also downloaded.` });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> Export audit log</CardTitle>
          <CardDescription>Pick a range and format. We'll download the data file plus a signed JSON manifest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date range</Label>
              <Select value={range} onValueChange={(v) => setRange(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Event type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Actor contains</Label>
              <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="e.g. alex.kim" />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Selection summary</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <Badge variant="secondary">{filtered.length} records</Badge>
              <Badge variant="secondary">range = {range}</Badge>
              <Badge variant="secondary">format = {format}</Badge>
              {type !== "all" && <Badge variant="secondary">type = {type}</Badge>}
              {actor && <Badge variant="secondary">actor ~ {actor}</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <FileSignature className="h-3 w-3" /> Manifest signed with key <code className="font-mono">{keyId}</code> using HMAC-SHA256.
            </p>
          </div>

          <Button onClick={generate} disabled={running || filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" /> {running ? "Generating…" : "Generate export"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What's in the bundle?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <BundleItem icon={<FileCheck2 className="h-4 w-4 text-emerald-500" />} title="Data file" body="CSV, JSON, or NDJSON of every audit record matching your filters." />
          <BundleItem icon={<FileSignature className="h-4 w-4 text-primary" />} title="Signed manifest" body="JSON sidecar containing record count, byte length, filters, retention policy, and HMAC-SHA256 signature." />
          <BundleItem icon={<KeyRound className="h-4 w-4 text-amber-500" />} title="Key ID" body="Manifest references the signing key ID so reviewers can request the public verifier from your security team." />
        </CardContent>
      </Card>
    </div>
  );
}

function BundleItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function HistoryPanel({ records, onChanged }: { records: ExportRecord[]; onChanged: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Export history</CardTitle>
          <CardDescription>Most recent 100 exports across this organization.</CardDescription>
        </div>
        {records.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => { complianceApi.clearExports(); onChanged(); toast.success("Cleared"); }}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear history
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No exports generated yet.</p>
        ) : (
          <div className="space-y-2">
            {records.map(r => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium font-mono text-sm truncate">{r.fileName}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase">{r.format}</Badge>
                      <Badge variant="outline" className="text-[10px]">{r.rangeLabel}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                      {r.recordCount} records · {(r.bytes / 1024).toFixed(1)} KB · {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 rounded-md bg-muted/40 p-2 text-[10px] font-mono break-all">
                  <span className="text-muted-foreground">key {r.manifestKeyId} · </span>
                  {r.signature}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RetentionPanel({ policy, keyId, onRotate, onChanged }: {
  policy: ReturnType<typeof complianceApi.get>["retention"];
  keyId: string;
  onRotate: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retention policy</CardTitle>
          <CardDescription>Applied to all exports going forward.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Keep audit records for</Label>
              <span className="text-sm font-medium tabular-nums">{policy.retentionDays} days</span>
            </div>
            <Slider
              min={30} max={2555} step={30}
              value={[policy.retentionDays]}
              onValueChange={(v) => { complianceApi.saveRetention({ retentionDays: v[0] }); onChanged(); }}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>30d</span><span>1y</span><span>7y</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">Pseudonymize requester identifiers</p>
              <p className="text-xs text-muted-foreground">Replace actor names with deterministic hashes in exports.</p>
            </div>
            <Switch
              checked={policy.pseudonymizeRequesters}
              onCheckedChange={(v) => { complianceApi.saveRetention({ pseudonymizeRequesters: v }); onChanged(); }}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">Redact target details</p>
              <p className="text-xs text-muted-foreground">Mask the target field for non-system events.</p>
            </div>
            <Switch
              checked={policy.redactMessageBodies}
              onCheckedChange={(v) => { complianceApi.saveRetention({ redactMessageBodies: v }); onChanged(); }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Signing key</CardTitle>
          <CardDescription>Used to HMAC every exported manifest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Active key ID</div>
            {keyId}
          </div>
          <Button variant="outline" onClick={onRotate}>
            <RefreshCw className="h-4 w-4 mr-1" /> Rotate signing key
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Rotating invalidates verification of older exports. Archive prior manifests before rotating.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SchedulesPanel({ schedules, onChanged }: { schedules: ScheduledExport[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<ScheduledExport, "id">>({
    name: "", format: "csv", cadence: "monthly",
    nextRunAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
    recipients: [], enabled: true,
  });
  const [recipients, setRecipients] = useState("");

  const save = () => {
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    const list = recipients.split(",").map(s => s.trim()).filter(Boolean);
    if (list.length === 0) { toast.error("Add at least one recipient email"); return; }
    complianceApi.addScheduledExport({ ...draft, recipients: list });
    toast.success("Schedule added");
    setAdding(false);
    setDraft({ name: "", format: "csv", cadence: "monthly", nextRunAt: new Date(Date.now() + 7 * 86400_000).toISOString(), recipients: [], enabled: true });
    setRecipients("");
    onChanged();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Scheduled deliveries</CardTitle>
          <CardDescription>Auto-generate audit exports on a recurring cadence.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New schedule
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {schedules.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No scheduled exports yet.</p>
        ) : (
          schedules.map(s => (
            <div key={s.id} className="rounded-lg border p-3 flex items-center gap-3">
              <Switch checked={s.enabled} onCheckedChange={() => { complianceApi.toggleScheduledExport(s.id); onChanged(); }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{s.name}</span>
                  <Badge variant="secondary" className="text-[10px] uppercase">{s.format}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{s.cadence}</Badge>
                  {!s.enabled && <Badge variant="outline" className="text-[10px]">paused</Badge>}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <Clock className="h-3 w-3" /> Next run {new Date(s.nextRunAt).toLocaleString()}
                  <span className="text-muted-foreground/60">·</span>
                  <Mail className="h-3 w-3" /> {s.recipients.join(", ")}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { complianceApi.removeScheduledExport(s.id); onChanged(); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New scheduled export</DialogTitle>
            <DialogDescription>We'll generate and email a signed bundle on the chosen cadence.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Monthly compliance bundle" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Format</Label>
                <Select value={draft.format} onValueChange={(v) => setDraft({ ...draft, format: v as ExportFormat })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cadence</Label>
                <Select value={draft.cadence} onValueChange={(v) => setDraft({ ...draft, cadence: v as ScheduledExport["cadence"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Recipients (comma separated)</Label>
              <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="security@acme.com, audit@acme.com" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={save}>Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function VerifyPanel({ keyId }: { keyId: string }) {
  const [manifest, setManifest] = useState("");
  const [file, setFile] = useState("");
  const [result, setResult] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    setBusy(true);
    setResult(null);
    const r = await complianceApi.verifyManifest(manifest, file);
    setResult(r);
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4" /> Verify a manifest</CardTitle>
        <CardDescription>Paste an exported manifest and the matching file to confirm integrity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/40 border p-2 text-xs">
          Active key ID: <code className="font-mono">{keyId}</code> - manifests signed with a different key will fail.
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Manifest JSON</Label>
            <textarea
              rows={10}
              value={manifest}
              onChange={(e) => setManifest(e.target.value)}
              className="w-full rounded-md border bg-background p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
              placeholder='{ "schemaVersion": 1, "signature": "sha256=..." }'
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data file contents</Label>
            <textarea
              rows={10}
              value={file}
              onChange={(e) => setFile(e.target.value)}
              className="w-full rounded-md border bg-background p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
              placeholder="paste the CSV/JSON file contents here"
            />
          </div>
        </div>

        <Button onClick={verify} disabled={busy || !manifest.trim() || !file.trim()}>
          <FileCheck2 className="h-4 w-4 mr-1" /> {busy ? "Verifying…" : "Verify integrity"}
        </Button>

        {result && (
          <div className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${result.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
            {result.ok
              ? <FileCheck2 className="h-4 w-4 mt-0.5 text-emerald-500" />
              : <FileX2 className="h-4 w-4 mt-0.5 text-destructive" />}
            <div>
              <p className="font-medium">{result.ok ? "Signature valid" : "Signature mismatch"}</p>
              <p className="text-xs text-muted-foreground">{result.ok ? "The file matches the manifest." : result.reason}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
