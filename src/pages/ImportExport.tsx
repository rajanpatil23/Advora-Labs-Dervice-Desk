import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Download, Upload, FileText, Database, FileJson, FileSpreadsheet,
  CheckCircle2, AlertCircle, ArrowRight, Trash2,
} from "lucide-react";
import { toCsv, downloadFile, parseCsv } from "@/lib/csv";
import type { Priority, TicketStatus } from "@/lib/types";

type Resource = "tickets" | "incidents" | "requests" | "articles" | "agents";

const RESOURCES: { key: Resource; label: string; description: string }[] = [
  { key: "tickets",   label: "Tickets",   description: "All support tickets with status, priority, requester." },
  { key: "incidents", label: "Incidents", description: "Active and resolved incidents and their owners." },
  { key: "requests",  label: "Service requests", description: "Catalog requests and their fulfillment state." },
  { key: "articles",  label: "Knowledge base", description: "Published articles and drafts." },
  { key: "agents",    label: "Agents",    description: "Team members and their roles." },
];

const TICKET_FIELDS = ["number", "title", "description", "status", "priority", "category", "channel", "createdAt", "updatedAt"] as const;
const VALID_STATUS = new Set<TicketStatus>(["new", "open", "in_progress", "on_hold", "resolved", "closed"]);
const VALID_PRIORITY = new Set<Priority>(["low", "medium", "high", "critical"]);

export default function ImportExport() {
  const { user, currentOrgId } = useAuth();
  const store = useAppStore();
  if (!user || !currentOrgId) return <Navigate to="/login" replace />;

  // ---------- Export ----------
  const [resource, setResource] = useState<Resource>("tickets");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [fields, setFields] = useState<string[]>([...TICKET_FIELDS]);

  const data = useMemo(() => {
    switch (resource) {
      case "tickets":   return store.tickets;
      case "incidents": return store.incidents;
      case "requests":  return store.requests;
      case "articles":  return store.articles;
      case "agents":    return [] as any[];
      default: return [];
    }
  }, [resource, store]);

  const availableFields = useMemo(() => data.length ? Object.keys(data[0]) : [], [data]);

  const toggleField = (f: string) => {
    setFields((cur) => cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]);
  };

  const doExport = () => {
    if (!data.length) { toast.error("No data to export"); return; }
    const stamp = new Date().toISOString().slice(0, 10);
    const cols = fields.length ? fields : availableFields;
    if (format === "csv") {
      const trimmed = data.map((r: any) => Object.fromEntries(cols.map((c) => [c, (r as any)[c]])));
      downloadFile(`${resource}-${stamp}.csv`, toCsv(trimmed), "text/csv;charset=utf-8");
    } else {
      const trimmed = data.map((r: any) => Object.fromEntries(cols.map((c) => [c, (r as any)[c]])));
      downloadFile(`${resource}-${stamp}.json`, JSON.stringify(trimmed, null, 2), "application/json");
    }
    toast.success(`Exported ${data.length} ${resource}`);
  };

  const exportAll = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const bundle = {
      exportedAt: new Date().toISOString(),
      orgId: currentOrgId,
      tickets: store.tickets,
      incidents: store.incidents,
      requests: store.requests,
      articles: store.articles,
    };
    downloadFile(`workspace-backup-${stamp}.json`, JSON.stringify(bundle, null, 2), "application/json");
    toast.success("Full workspace backup downloaded");
  };

  // ---------- Import ----------
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResource, setImportResource] = useState<"tickets">("tickets");
  const [parsed, setParsed] = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const onFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const rows = parseCsv(text);
        setParsed(rows);
        setParseErrors(validate(rows));
        toast.success(`Parsed ${rows.length} row${rows.length === 1 ? "" : "s"}`);
      } catch (e) {
        toast.error("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const validate = (rows: Record<string, string>[]): string[] => {
    const errs: string[] = [];
    if (!rows.length) errs.push("File contains no data rows.");
    if (rows.length && !("title" in rows[0])) errs.push("Missing required column: title");
    rows.slice(0, 50).forEach((r, i) => {
      const ln = i + 2;
      if (r.status && !VALID_STATUS.has(r.status as TicketStatus))
        errs.push(`Line ${ln}: invalid status "${r.status}"`);
      if (r.priority && !VALID_PRIORITY.has(r.priority as Priority))
        errs.push(`Line ${ln}: invalid priority "${r.priority}"`);
    });
    return errs;
  };

  const commitImport = () => {
    if (parseErrors.length) { toast.error("Fix validation errors first"); return; }
    if (!parsed.length) return;
    const me = (user as any).id ?? "current_user";
    let added = 0;
    parsed.forEach((row) => {
      try {
        store.createTicket({
          title: row.title || "Untitled",
          description: row.description || "",
          requesterId: row.requesterId || me,
          priority: (VALID_PRIORITY.has(row.priority as Priority) ? row.priority : "medium") as Priority,
          category: row.category || "General",
          channel: (row.channel as any) || "web",
        });
        added++;
      } catch {}
    });
    toast.success(`Imported ${added} ticket${added === 1 ? "" : "s"}`);
    setParsed([]); setFileName(""); if (fileRef.current) fileRef.current.value = "";
  };

  const sampleCsv = () => {
    const sample = toCsv([
      { title: "Cannot login to portal", description: "Getting 403 after SSO redirect", priority: "high",   category: "Access",  channel: "email" },
      { title: "VPN slow on Tuesdays",   description: "Throughput drops to 1Mbps",     priority: "medium", category: "Network", channel: "chat" },
      { title: "Request new monitor",     description: "27\" preferred",                 priority: "low",    category: "Hardware",channel: "portal" },
    ]);
    downloadFile("tickets-template.csv", sample, "text/csv;charset=utf-8");
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto h-full">
      <header className="flex flex-wrap items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Import & export</h1>
          <p className="text-sm text-muted-foreground">Migrate data in or out of your workspace.</p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" onClick={exportAll}>
            <Download className="h-4 w-4 mr-2" /> Full workspace backup
          </Button>
        </div>
      </header>

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export"><Download className="h-3.5 w-3.5 mr-1.5" /> Export</TabsTrigger>
          <TabsTrigger value="import"><Upload className="h-3.5 w-3.5 mr-1.5" /> Import</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-4">
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resource</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-2">
                {RESOURCES.map((r) => (
                  <button key={r.key} onClick={() => { setResource(r.key); setFields([]); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${resource === r.key ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                    <div className="font-medium">{r.label}</div>
                    <div className="text-[11px] text-muted-foreground">{r.description}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Export {resource}
                </CardTitle>
                <CardDescription>{data.length} record{data.length === 1 ? "" : "s"} available.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv"><FileSpreadsheet className="h-3.5 w-3.5 inline mr-2" /> CSV (Excel)</SelectItem>
                      <SelectItem value="json"><FileJson className="h-3.5 w-3.5 inline mr-2" /> JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Fields to include</Label>
                    <div className="flex gap-2">
                      <button className="text-[11px] text-primary hover:underline" onClick={() => setFields(availableFields)}>Select all</button>
                      <button className="text-[11px] text-muted-foreground hover:underline" onClick={() => setFields([])}>Clear</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-md border bg-muted/30 max-h-[220px] overflow-y-auto">
                    {availableFields.map((f) => (
                      <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={fields.includes(f)} onCheckedChange={() => toggleField(f)} />
                        <span className="truncate">{f}</span>
                      </label>
                    ))}
                    {availableFields.length === 0 && (
                      <span className="text-sm text-muted-foreground col-span-full">No fields detected.</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={doExport} disabled={!data.length}>
                    <Download className="h-4 w-4 mr-2" /> Export {data.length} record{data.length === 1 ? "" : "s"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> Import tickets from CSV
              </CardTitle>
              <CardDescription>
                Required column: <code className="px-1 rounded bg-muted">title</code>.
                Optional: description, status, priority, category, channel, requesterId.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef} type="file" accept=".csv,text/csv"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Choose CSV file
                </Button>
                <Button variant="ghost" onClick={sampleCsv}>
                  <FileText className="h-4 w-4 mr-2" /> Download template
                </Button>
                {fileName && <Badge variant="secondary">{fileName}</Badge>}
                {parsed.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setParsed([]); setFileName(""); setParseErrors([]); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {parsed.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {parseErrors.length === 0 ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {parsed.length} row{parsed.length === 1 ? "" : "s"} ready
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" /> {parseErrors.length} issue{parseErrors.length === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>

                  {parseErrors.length > 0 && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 max-h-32 overflow-y-auto text-xs space-y-1">
                      {parseErrors.map((err, i) => <div key={i}>• {err}</div>)}
                    </div>
                  )}

                  <div className="rounded-md border overflow-hidden">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 bg-muted/40">
                      Preview (first 8 rows)
                    </div>
                    <div className="overflow-x-auto max-h-[280px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left bg-muted/30">
                            {Object.keys(parsed[0]).map((h) => (
                              <th key={h} className="px-3 py-2 font-medium text-xs">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.slice(0, 8).map((r, i) => (
                            <tr key={i} className="border-t">
                              {Object.values(r).map((v, j) => (
                                <td key={j} className="px-3 py-1.5 text-xs whitespace-nowrap max-w-[240px] truncate">{v}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={commitImport} disabled={parseErrors.length > 0}>
                      Import {parsed.length} ticket{parsed.length === 1 ? "" : "s"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
