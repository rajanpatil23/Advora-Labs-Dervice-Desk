import { useEffect, useMemo, useState } from "react";
import { useAppStore, useOrgAgents, useOrgCustomers } from "@/lib/store";
function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
import {
  reportsApi,
  applyFilters,
  computeMetrics,
  groupRows,
  serializeReport,
  nextRunDate,
  RESOURCE_COLUMNS,
  type ReportTemplate,
  type ReportSchedule,
  type ReportRun,
  type ReportResource,
  type ReportFormat,
  type ReportGroupBy,
  type ReportMetric,
  type Cadence,
} from "@/lib/api/reports";
import {
  FileBarChart,
  Plus,
  Calendar,
  Play,
  Trash2,
  Download,
  Save,
  Mail,
  Pause,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

const RESOURCES: { id: ReportResource; label: string }[] = [
  { id: "tickets", label: "Tickets" },
  { id: "incidents", label: "Incidents" },
  { id: "requests", label: "Requests" },
  { id: "users", label: "Users" },
  { id: "csat", label: "CSAT" },
  { id: "sla", label: "SLA policies" },
];

const METRIC_LABELS: Record<ReportMetric, string> = {
  count: "Total count",
  open_count: "Open count",
  resolved_count: "Resolved count",
  avg_resolution_h: "Avg resolution (h)",
  sla_compliance_pct: "SLA compliance %",
};

const GROUPS: { id: ReportGroupBy; label: string }[] = [
  { id: "none", label: "None" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "category", label: "Category" },
  { id: "assignee", label: "Assignee" },
  { id: "slaState", label: "SLA state" },
];

export default function ReportBuilder() {
  const tickets = useAppStore((s) => s.tickets);
  const incidents = useAppStore((s) => s.incidents);
  const requests = useAppStore((s) => s.requests);
  const slaPolicies = useAppStore((s) => s.slaPolicies);
  const agents = useOrgAgents();
  const customers = useOrgCustomers();

  const [templates, setTemplates] = useState<ReportTemplate[]>(() => reportsApi.listTemplates());
  const [schedules, setSchedules] = useState<ReportSchedule[]>(() => reportsApi.listSchedules());
  const [runs, setRuns] = useState<ReportRun[]>(() => reportsApi.listRuns());
  const [activeId, setActiveId] = useState<string | null>(templates[0]?.id ?? null);
  const [tab, setTab] = useState<"builder" | "schedules" | "runs">("builder");

  const active = templates.find((t) => t.id === activeId) ?? null;
  const [draft, setDraft] = useState<ReportTemplate | null>(active);
  useEffect(() => setDraft(active), [activeId]); // eslint-disable-line

  function getRows(resource: ReportResource): any[] {
    switch (resource) {
      case "tickets":
        return tickets;
      case "incidents":
        return incidents;
      case "requests":
        return requests;
      case "users":
        return [...agents, ...customers];
      case "csat":
        return tickets.filter((t: any) => t.csat).map((t: any) => ({ ticketId: t.number, ...t.csat }));
      case "sla":
        return slaPolicies;
    }
  }

  const previewData = useMemo(() => {
    if (!draft) return null;
    const rows = applyFilters(getRows(draft.resource), draft.filters);
    const grouped = groupRows(rows, draft.groupBy);
    const metricsByGroup = Object.fromEntries(
      Object.entries(grouped).map(([k, v]) => [k, computeMetrics(v, draft.metrics)]),
    );
    return { rows, grouped, metricsByGroup };
  }, [draft, tickets, incidents, requests, agents, customers, slaPolicies]);

  function refresh() {
    setTemplates(reportsApi.listTemplates());
    setSchedules(reportsApi.listSchedules());
    setRuns(reportsApi.listRuns());
  }

  function createNew() {
    const tpl = reportsApi.newTemplate();
    reportsApi.saveTemplate(tpl);
    refresh();
    setActiveId(tpl.id);
    setTab("builder");
  }

  function saveDraft() {
    if (!draft) return;
    reportsApi.saveTemplate(draft);
    refresh();
    toast.success("Report template saved");
  }

  function removeTemplate(id: string) {
    if (!confirm("Delete this report and its schedules?")) return;
    reportsApi.deleteTemplate(id);
    refresh();
    if (activeId === id) setActiveId(reportsApi.listTemplates()[0]?.id ?? null);
  }

  function runNow(tpl: ReportTemplate, scheduleId?: string) {
    const rows = applyFilters(getRows(tpl.resource), tpl.filters);
    const { blob, ext } = serializeReport(rows, tpl.columns, tpl.format);
    downloadBlob(`${tpl.name.replace(/\s+/g, "_")}.${ext}`, blob);
    const run: ReportRun = {
      id: `run-${Date.now()}`,
      templateId: tpl.id,
      scheduleId,
      ranAt: new Date().toISOString(),
      rowCount: rows.length,
      format: tpl.format,
      triggeredBy: scheduleId ? "schedule" : "manual",
    };
    reportsApi.recordRun(run);
    refresh();
    toast.success(`Generated ${rows.length} rows`);
  }

  return (
    <div className="h-full flex">
      {/* Left rail */}
      <aside className="w-72 border-r border-border bg-surface flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Reports</div>
            <div className="font-display font-semibold mt-0.5">Templates</div>
          </div>
          <button
            onClick={createNew}
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center hover:bg-primary/90"
            title="New report"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveId(t.id);
                setTab("builder");
              }}
              className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${
                activeId === t.id ? "bg-primary/10 text-primary" : "hover:bg-surface-2"
              }`}
            >
              <FileBarChart className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {t.resource} · {t.format.toUpperCase()}
                </div>
              </div>
            </button>
          ))}
          {!templates.length && (
            <div className="text-xs text-muted-foreground text-center py-8 px-3">
              No templates. Create your first report.
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {!draft ? (
          <div className="h-full grid place-items-center text-center p-8">
            <div>
              <FileBarChart className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
              <div className="font-display font-semibold">Build a custom report</div>
              <div className="text-sm text-muted-foreground mt-1">Define filters, metrics, and a delivery schedule.</div>
              <button
                onClick={createNew}
                className="mt-4 px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> New report
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full text-2xl font-display font-bold bg-transparent outline-none border-b border-transparent focus:border-border pb-1"
                />
                <input
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Add a description…"
                  className="mt-1 w-full text-sm text-muted-foreground bg-transparent outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runNow(draft)}
                  className="px-3 py-2 rounded-xl bg-surface border border-border text-sm font-medium hover:bg-surface-2 flex items-center gap-2"
                >
                  <Play className="h-4 w-4" /> Run now
                </button>
                <button
                  onClick={saveDraft}
                  className="px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold hover:shadow-glow flex items-center gap-2"
                >
                  <Save className="h-4 w-4" /> Save
                </button>
                <button
                  onClick={() => removeTemplate(draft.id)}
                  className="h-9 w-9 rounded-xl border border-border hover:bg-destructive hover:text-destructive-foreground grid place-items-center"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {(["builder", "schedules", "runs"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                    tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                  {t === "schedules" && (
                    <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2">
                      {schedules.filter((s) => s.templateId === draft.id).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === "builder" && (
              <BuilderTab
                draft={draft}
                setDraft={setDraft}
                preview={previewData}
              />
            )}

            {tab === "schedules" && (
              <SchedulesTab
                template={draft}
                schedules={schedules.filter((s) => s.templateId === draft.id)}
                onChange={refresh}
                onRun={(s) => runNow(draft, s.id)}
              />
            )}

            {tab === "runs" && (
              <RunsTab runs={runs.filter((r) => r.templateId === draft.id)} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Builder tab ---------- */

function BuilderTab({
  draft,
  setDraft,
  preview,
}: {
  draft: ReportTemplate;
  setDraft: (t: ReportTemplate) => void;
  preview: { rows: any[]; grouped: Record<string, any[]>; metricsByGroup: Record<string, Record<ReportMetric, number>> } | null;
}) {
  const cols = RESOURCE_COLUMNS[draft.resource];
  const allMetrics: ReportMetric[] = ["count", "open_count", "resolved_count", "avg_resolution_h", "sla_compliance_pct"];

  function toggleArr<T extends string>(arr: T[] | undefined, v: T): T[] {
    const a = arr ?? [];
    return a.includes(v) ? a.filter((x) => x !== v) : [...a, v];
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Config */}
      <div className="lg:col-span-1 space-y-4">
        <Section title="Data source">
          <select
            value={draft.resource}
            onChange={(e) => {
              const resource = e.target.value as ReportResource;
              setDraft({ ...draft, resource, columns: RESOURCE_COLUMNS[resource].slice(0, 6) });
            }}
            className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm outline-none"
          >
            {RESOURCES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Section>

        <Section title="Date range" icon={Calendar}>
          <div className="grid grid-cols-3 gap-1.5">
            {(["7d", "30d", "90d", "ytd", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDraft({ ...draft, filters: { ...draft.filters, dateRange: r } })}
                className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                  draft.filters.dateRange === r ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border hover:bg-surface-2/70"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Section>

        {draft.resource === "tickets" && (
          <>
            <Section title="Status" icon={Filter}>
              <ChipGroup
                options={["new", "open", "pending", "on_hold", "resolved", "closed"]}
                value={draft.filters.status ?? []}
                onToggle={(v) => setDraft({ ...draft, filters: { ...draft.filters, status: toggleArr(draft.filters.status, v) } })}
              />
            </Section>
            <Section title="Priority">
              <ChipGroup
                options={["critical", "high", "medium", "low"]}
                value={draft.filters.priority ?? []}
                onToggle={(v) => setDraft({ ...draft, filters: { ...draft.filters, priority: toggleArr(draft.filters.priority, v) } })}
              />
            </Section>
            <Section title="SLA state">
              <ChipGroup
                options={["on_track", "met", "at_risk", "breached"]}
                value={draft.filters.slaState ?? []}
                onToggle={(v) => setDraft({ ...draft, filters: { ...draft.filters, slaState: toggleArr(draft.filters.slaState, v) } })}
              />
            </Section>
          </>
        )}

        <Section title="Group by">
          <select
            value={draft.groupBy}
            onChange={(e) => setDraft({ ...draft, groupBy: e.target.value as ReportGroupBy })}
            className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm outline-none"
          >
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Section>

        <Section title="Metrics">
          <div className="space-y-1">
            {allMetrics.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={draft.metrics.includes(m)}
                  onChange={() => setDraft({ ...draft, metrics: toggleArr(draft.metrics, m) })}
                  className="accent-primary"
                />
                {METRIC_LABELS[m]}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Columns">
          <div className="grid grid-cols-2 gap-1">
            {cols.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-xs cursor-pointer p-1.5 rounded hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={draft.columns.includes(c)}
                  onChange={() => setDraft({ ...draft, columns: toggleArr(draft.columns, c) })}
                  className="accent-primary"
                />
                <span className="truncate font-mono">{c}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="Output format">
          <div className="grid grid-cols-3 gap-1.5">
            {(["csv", "json", "pdf"] as ReportFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setDraft({ ...draft, format: f })}
                className={`px-2 py-1.5 text-xs uppercase rounded-lg border transition-colors ${
                  draft.format === f ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border hover:bg-surface-2/70"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Preview */}
      <div className="lg:col-span-2 space-y-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display font-semibold">Preview</div>
              <div className="text-xs text-muted-foreground">
                {preview?.rows.length ?? 0} rows match · grouped by {draft.groupBy}
              </div>
            </div>
          </div>

          {preview && (
            <div className="space-y-3">
              {Object.entries(preview.metricsByGroup).map(([group, metrics]) => (
                <div key={group} className="rounded-xl bg-surface-2/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>
                    <div className="text-[11px] text-muted-foreground">{preview.grouped[group].length} rows</div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(metrics).map(([m, v]) => (
                      <div key={m} className="bg-surface rounded-lg p-2 border border-border">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                          {METRIC_LABELS[m as ReportMetric]}
                        </div>
                        <div className="text-lg font-display font-bold tabular-nums mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-5">
          <div className="font-display font-semibold mb-3">Sample rows</div>
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  {draft.columns.map((c) => (
                    <th key={c} className="text-left font-mono font-normal px-2 py-2 border-b border-border">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview?.rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-surface-2/40">
                    {draft.columns.map((c) => (
                      <td key={c} className="px-2 py-2 truncate max-w-[200px]">
                        {String(r[c] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!preview?.rows.length && <div className="text-center text-xs text-muted-foreground py-6">No matching rows.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Schedules tab ---------- */

function SchedulesTab({
  template,
  schedules,
  onChange,
  onRun,
}: {
  template: ReportTemplate;
  schedules: ReportSchedule[];
  onChange: () => void;
  onRun: (s: ReportSchedule) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<ReportSchedule | null>(null);

  function startNew() {
    setDraft({
      id: `sch-${Date.now()}`,
      templateId: template.id,
      cadence: "weekly",
      dayOfWeek: 1,
      hour: 9,
      recipients: [],
      enabled: true,
      nextRunAt: nextRunDate("weekly", 9, 1),
      createdAt: new Date().toISOString(),
    });
    setCreating(true);
  }

  function save() {
    if (!draft) return;
    if (!draft.recipients.length) return toast.error("Add at least one recipient email");
    const next = { ...draft, nextRunAt: nextRunDate(draft.cadence, draft.hour, draft.dayOfWeek, draft.dayOfMonth) };
    reportsApi.saveSchedule(next);
    setCreating(false);
    setDraft(null);
    onChange();
    toast.success("Schedule saved");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold">Email delivery schedules</div>
          <div className="text-xs text-muted-foreground">Send this report automatically on a recurring basis.</div>
        </div>
        {!creating && (
          <button
            onClick={startNew}
            className="px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New schedule
          </button>
        )}
      </div>

      {creating && draft && (
        <div className="panel p-5 space-y-4 border-primary/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Cadence">
              <select
                value={draft.cadence}
                onChange={(e) => setDraft({ ...draft, cadence: e.target.value as Cadence })}
                className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>

            {draft.cadence === "weekly" && (
              <Field label="Day of week">
                <select
                  value={draft.dayOfWeek ?? 1}
                  onChange={(e) => setDraft({ ...draft, dayOfWeek: +e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm outline-none"
                >
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {draft.cadence === "monthly" && (
              <Field label="Day of month">
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={draft.dayOfMonth ?? 1}
                  onChange={(e) => setDraft({ ...draft, dayOfMonth: +e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm outline-none"
                />
              </Field>
            )}

            <Field label="Hour (24h)">
              <input
                type="number"
                min={0}
                max={23}
                value={draft.hour}
                onChange={(e) => setDraft({ ...draft, hour: +e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm outline-none"
              />
            </Field>
          </div>

          <Field label="Recipients (comma-separated emails)">
            <input
              value={draft.recipients.join(", ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  recipients: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="alice@acme.com, bob@acme.com"
              className="w-full h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm outline-none"
            />
          </Field>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setCreating(false);
                setDraft(null);
              }}
              className="px-3 py-2 rounded-lg text-sm hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> Create schedule
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {schedules.map((s) => (
          <div key={s.id} className="panel p-4 flex items-center gap-4 flex-wrap">
            <div className={`h-9 w-9 rounded-xl grid place-items-center ${s.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium capitalize">
                {s.cadence}
                {s.cadence === "weekly" && ` · ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.dayOfWeek ?? 1]}`}
                {s.cadence === "monthly" && ` · day ${s.dayOfMonth}`}
                {` · ${String(s.hour).padStart(2, "0")}:00`}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {s.recipients.length} recipient{s.recipients.length === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Next: {new Date(s.nextRunAt).toLocaleString()}
                </span>
                {s.lastRunAt && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Last: {new Date(s.lastRunAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRun(s)}
                className="h-8 px-2 rounded-lg hover:bg-surface-2 grid place-items-center"
                title="Run now"
              >
                <Play className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  reportsApi.toggleSchedule(s.id, !s.enabled);
                  onChange();
                }}
                className="h-8 px-2 rounded-lg hover:bg-surface-2 grid place-items-center"
                title={s.enabled ? "Pause" : "Enable"}
              >
                {s.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this schedule?")) {
                    reportsApi.deleteSchedule(s.id);
                    onChange();
                  }
                }}
                className="h-8 px-2 rounded-lg hover:bg-destructive hover:text-destructive-foreground grid place-items-center"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {!schedules.length && !creating && (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            No schedules yet. Create one to email this report on a cadence.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Runs tab ---------- */

function RunsTab({ runs }: { runs: ReportRun[] }) {
  return (
    <div className="panel divide-y divide-border">
      {runs.map((r) => (
        <div key={r.id} className="p-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
            {r.triggeredBy === "schedule" ? <Calendar className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium capitalize">
              {r.triggeredBy} · {r.format.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(r.ranAt).toLocaleString()} · {r.rowCount} rows
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ))}
      {!runs.length && (
        <div className="p-8 text-center text-sm text-muted-foreground">No runs yet. Click "Run now" to generate the first report.</div>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="panel p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />} {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function ChipGroup({
  options,
  value,
  onToggle,
}: {
  options: string[];
  value: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onToggle(o)}
          className={`px-2 py-1 text-[11px] rounded-full border capitalize transition-colors ${
            value.includes(o) ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border hover:bg-surface-2/70"
          }`}
        >
          {o.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}
