import { toCsv } from "@/lib/csv";

export type ReportResource = "tickets" | "incidents" | "requests" | "users" | "csat" | "sla";
export type ReportFormat = "csv" | "json" | "pdf";
export type Cadence = "daily" | "weekly" | "monthly";

export type ReportFilter = {
  status?: string[];
  priority?: string[];
  category?: string[];
  slaState?: string[];
  dateRange?: "7d" | "30d" | "90d" | "ytd" | "all";
};

export type ReportGroupBy = "none" | "status" | "priority" | "category" | "assignee" | "slaState";
export type ReportMetric = "count" | "avg_resolution_h" | "sla_compliance_pct" | "open_count" | "resolved_count";

export type ReportTemplate = {
  id: string;
  name: string;
  description?: string;
  resource: ReportResource;
  filters: ReportFilter;
  groupBy: ReportGroupBy;
  metrics: ReportMetric[];
  columns: string[];
  format: ReportFormat;
  createdAt: string;
  updatedAt: string;
};

export type ReportSchedule = {
  id: string;
  templateId: string;
  cadence: Cadence;
  dayOfWeek?: number; // 0-6 weekly
  dayOfMonth?: number; // 1-28 monthly
  hour: number; // 0-23
  recipients: string[];
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  createdAt: string;
};

export type ReportRun = {
  id: string;
  templateId: string;
  scheduleId?: string;
  ranAt: string;
  rowCount: number;
  format: ReportFormat;
  recipients?: string[];
  triggeredBy: "manual" | "schedule";
};

const T_KEY = "lovable.reports.templates.v1";
const S_KEY = "lovable.reports.schedules.v1";
const R_KEY = "lovable.reports.runs.v1";

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v));
}

export const RESOURCE_COLUMNS: Record<ReportResource, string[]> = {
  tickets: ["number", "title", "status", "priority", "category", "slaState", "requesterId", "assigneeId", "createdAt", "updatedAt", "resolvedAt"],
  incidents: ["id", "title", "severity", "status", "startedAt", "resolvedAt"],
  requests: ["id", "title", "status", "requesterId", "createdAt"],
  users: ["id", "name", "email", "role", "rating", "workload"],
  csat: ["ticketId", "score", "comment", "submittedAt"],
  sla: ["id", "name", "priority", "responseMinutes", "resolutionMinutes"],
};

export const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: "tpl-weekly-tickets",
    name: "Weekly ticket summary",
    description: "All tickets created in the last 7 days, grouped by status.",
    resource: "tickets",
    filters: { dateRange: "7d" },
    groupBy: "status",
    metrics: ["count", "avg_resolution_h", "sla_compliance_pct"],
    columns: ["number", "title", "status", "priority", "slaState", "createdAt"],
    format: "csv",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-sla-breaches",
    name: "SLA breach audit",
    description: "Every ticket that breached SLA in the last 30 days.",
    resource: "tickets",
    filters: { slaState: ["breached"], dateRange: "30d" },
    groupBy: "priority",
    metrics: ["count", "avg_resolution_h"],
    columns: ["number", "title", "priority", "slaState", "createdAt", "resolvedAt"],
    format: "csv",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-monthly-incidents",
    name: "Monthly incident report",
    description: "All incidents from the past 30 days for stakeholder review.",
    resource: "incidents",
    filters: { dateRange: "30d" },
    groupBy: "none",
    metrics: ["count"],
    columns: ["id", "title", "severity", "status", "startedAt", "resolvedAt"],
    format: "pdf",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function nextRunDate(cadence: Cadence, hour: number, dayOfWeek?: number, dayOfMonth?: number): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hour, 0, 0, 0);
  if (cadence === "daily") {
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  } else if (cadence === "weekly") {
    const target = dayOfWeek ?? 1;
    const diff = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (diff === 0 && d.getTime() <= Date.now() ? 7 : diff));
  } else {
    const target = dayOfMonth ?? 1;
    d.setDate(target);
    if (d.getTime() <= Date.now()) d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

export const reportsApi = {
  /* Templates */
  listTemplates(): ReportTemplate[] {
    const stored = read<ReportTemplate[] | null>(T_KEY, null);
    if (!stored) {
      write(T_KEY, DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }
    return stored;
  },
  saveTemplate(tpl: ReportTemplate) {
    const all = this.listTemplates();
    const idx = all.findIndex((t) => t.id === tpl.id);
    const next = { ...tpl, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = next;
    else all.push(next);
    write(T_KEY, all);
    return next;
  },
  deleteTemplate(id: string) {
    write(T_KEY, this.listTemplates().filter((t) => t.id !== id));
    write(S_KEY, this.listSchedules().filter((s) => s.templateId !== id));
  },
  newTemplate(): ReportTemplate {
    return {
      id: `tpl-${Date.now()}`,
      name: "Untitled report",
      resource: "tickets",
      filters: { dateRange: "30d" },
      groupBy: "none",
      metrics: ["count"],
      columns: RESOURCE_COLUMNS.tickets.slice(0, 6),
      format: "csv",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /* Schedules */
  listSchedules(): ReportSchedule[] {
    return read<ReportSchedule[]>(S_KEY, []);
  },
  saveSchedule(s: ReportSchedule) {
    const all = this.listSchedules();
    const idx = all.findIndex((x) => x.id === s.id);
    if (idx >= 0) all[idx] = s;
    else all.push(s);
    write(S_KEY, all);
    return s;
  },
  deleteSchedule(id: string) {
    write(S_KEY, this.listSchedules().filter((s) => s.id !== id));
  },
  toggleSchedule(id: string, enabled: boolean) {
    const all = this.listSchedules().map((s) => (s.id === id ? { ...s, enabled } : s));
    write(S_KEY, all);
  },

  /* Runs */
  listRuns(): ReportRun[] {
    return read<ReportRun[]>(R_KEY, []);
  },
  recordRun(run: ReportRun) {
    const all = [run, ...this.listRuns()].slice(0, 100);
    write(R_KEY, all);
  },
};

/* ----- Run a report against in-memory data ----- */

const RANGE_MS: Record<NonNullable<ReportFilter["dateRange"]>, number> = {
  "7d": 7 * 86400000,
  "30d": 30 * 86400000,
  "90d": 90 * 86400000,
  ytd: Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime(),
  all: 0,
};

export function applyFilters<T extends Record<string, any>>(rows: T[], f: ReportFilter, dateField = "createdAt"): T[] {
  const cutoff = f.dateRange && f.dateRange !== "all" ? Date.now() - RANGE_MS[f.dateRange] : 0;
  return rows.filter((r) => {
    if (cutoff && r[dateField] && new Date(r[dateField]).getTime() < cutoff) return false;
    if (f.status?.length && !f.status.includes(r.status)) return false;
    if (f.priority?.length && !f.priority.includes(r.priority)) return false;
    if (f.category?.length && !f.category.includes(r.category)) return false;
    if (f.slaState?.length && !f.slaState.includes(r.slaState)) return false;
    return true;
  });
}

export function computeMetrics(rows: any[], metrics: ReportMetric[]): Record<ReportMetric, number> {
  const out = {} as Record<ReportMetric, number>;
  metrics.forEach((m) => {
    if (m === "count") out[m] = rows.length;
    else if (m === "open_count") out[m] = rows.filter((r) => r.status !== "resolved" && r.status !== "closed").length;
    else if (m === "resolved_count") out[m] = rows.filter((r) => r.status === "resolved" || r.status === "closed").length;
    else if (m === "avg_resolution_h") {
      const resolved = rows.filter((r) => r.resolvedAt && r.createdAt);
      out[m] = resolved.length
        ? +(
            resolved.reduce((s, r) => s + (new Date(r.resolvedAt).getTime() - new Date(r.createdAt).getTime()), 0) /
            resolved.length /
            3.6e6
          ).toFixed(1)
        : 0;
    } else if (m === "sla_compliance_pct") {
      const total = rows.length || 1;
      const ok = rows.filter((r) => r.slaState === "met" || r.slaState === "on_track").length;
      out[m] = +((ok / total) * 100).toFixed(1);
    }
  });
  return out;
}

export function groupRows(rows: any[], groupBy: ReportGroupBy): Record<string, any[]> {
  if (groupBy === "none") return { All: rows };
  const out: Record<string, any[]> = {};
  rows.forEach((r) => {
    const k = String(r[groupBy] ?? "—");
    (out[k] ??= []).push(r);
  });
  return out;
}

export function serializeReport(rows: any[], columns: string[], format: ReportFormat): { blob: Blob; ext: string } {
  if (format === "json") {
    const filtered = rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c]])));
    return { blob: new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" }), ext: "json" };
  }
  if (format === "pdf") {
    // Lightweight pseudo-PDF (HTML-printable). Real PDFs need a backend.
    const html = `<!doctype html><meta charset="utf-8"><title>Report</title>
<style>body{font:13px/1.4 -apple-system,sans-serif;padding:24px}h1{font-size:18px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}th{background:#f5f5f5}</style>
<h1>Report — ${new Date().toLocaleString()}</h1>
<table><thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${String(r[c] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    return { blob: new Blob([html], { type: "text/html" }), ext: "html" };
  }
  const csv = toCsv(rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c]]))) as any[]);
  return { blob: new Blob([csv], { type: "text/csv;charset=utf-8" }), ext: "csv" };
}
