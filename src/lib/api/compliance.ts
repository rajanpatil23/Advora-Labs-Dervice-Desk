// Frontend-only compliance export utilities.
// Signs export payloads with HMAC-SHA256 using a per-org key persisted in localStorage.
// Backend agent: replace this with a real export pipeline; UI shape stays the same.

import type { LogEntry } from "@/lib/types";

export type ExportFormat = "csv" | "json" | "ndjson";

export type ExportRecord = {
  id: string;
  createdAt: string;
  format: ExportFormat;
  rangeLabel: string;
  recordCount: number;
  fileName: string;
  bytes: number;
  signature: string; // sha256=...
  manifestKeyId: string;
  filters: Record<string, string | undefined>;
};

export type RetentionPolicy = {
  retentionDays: number;
  pseudonymizeRequesters: boolean;
  redactMessageBodies: boolean;
  scheduledExports: ScheduledExport[];
};

export type ScheduledExport = {
  id: string;
  name: string;
  format: ExportFormat;
  cadence: "daily" | "weekly" | "monthly";
  nextRunAt: string;
  recipients: string[];
  enabled: boolean;
};

const KEY = "lov.compliance.v1";
const MANIFEST_KEY = "lov.compliance.signing_key.v1";

type State = { exports: ExportRecord[]; retention: RetentionPolicy };

function defaultRetention(): RetentionPolicy {
  return {
    retentionDays: 365,
    pseudonymizeRequesters: false,
    redactMessageBodies: false,
    scheduledExports: [
      {
        id: crypto.randomUUID(),
        name: "Monthly SOC 2 export",
        format: "csv",
        cadence: "monthly",
        nextRunAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
        recipients: ["compliance@example.com"],
        enabled: true,
      },
    ],
  };
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { exports: [], retention: defaultRetention() };
    const parsed = JSON.parse(raw) as State;
    return {
      exports: parsed.exports ?? [],
      retention: { ...defaultRetention(), ...(parsed.retention ?? {}) },
    };
  } catch {
    return { exports: [], retention: defaultRetention() };
  }
}
function write(s: State) {
  s.exports = s.exports.slice(0, 100);
  localStorage.setItem(KEY, JSON.stringify(s));
}

function getOrCreateSigningKey(): { id: string; secret: string } {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  const id = "kid_" + crypto.randomUUID().slice(0, 8);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const next = { id, secret };
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(next));
  return next;
}

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}`;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function logsToCsv(logs: LogEntry[]): string {
  const headers = ["id", "at", "type", "actor", "action", "target"];
  const rows = logs.map(l => [
    l.id, l.at, l.type, l.actor, l.action, l.target,
  ].map(escapeCsv).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function logsToJson(logs: LogEntry[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    records: logs,
  }, null, 2);
}

function logsToNdjson(logs: LogEntry[]): string {
  return logs.map(l => JSON.stringify(l)).join("\n");
}

function downloadBlob(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function rangeBoundary(range: "1h" | "24h" | "7d" | "30d" | "90d" | "all"): number | null {
  if (range === "all") return null;
  const map = { "1h": 3.6e6, "24h": 8.64e7, "7d": 6.048e8, "30d": 2.592e9, "90d": 7.776e9 };
  return Date.now() - map[range];
}

export const complianceApi = {
  get: () => read(),
  signingKeyId: (): string => getOrCreateSigningKey().id,
  rotateSigningKey: (): string => {
    localStorage.removeItem(MANIFEST_KEY);
    return getOrCreateSigningKey().id;
  },
  saveRetention: (patch: Partial<RetentionPolicy>) => {
    const s = read();
    s.retention = { ...s.retention, ...patch };
    write(s);
    return s.retention;
  },
  addScheduledExport: (item: Omit<ScheduledExport, "id">) => {
    const s = read();
    s.retention.scheduledExports = [
      ...s.retention.scheduledExports,
      { ...item, id: crypto.randomUUID() },
    ];
    write(s);
  },
  removeScheduledExport: (id: string) => {
    const s = read();
    s.retention.scheduledExports = s.retention.scheduledExports.filter(x => x.id !== id);
    write(s);
  },
  toggleScheduledExport: (id: string) => {
    const s = read();
    s.retention.scheduledExports = s.retention.scheduledExports.map(x =>
      x.id === id ? { ...x, enabled: !x.enabled } : x);
    write(s);
  },
  clearExports: () => {
    const s = read();
    s.exports = [];
    write(s);
  },
  generateExport: async (params: {
    logs: LogEntry[];
    format: ExportFormat;
    range: "1h" | "24h" | "7d" | "30d" | "90d" | "all";
    filters: Record<string, string | undefined>;
  }): Promise<{ record: ExportRecord; manifest: string }> => {
    const cutoff = rangeBoundary(params.range);
    const filtered = cutoff
      ? params.logs.filter(l => new Date(l.at).getTime() >= cutoff)
      : params.logs;

    const retention = read().retention;
    const sanitized = filtered.map(l => ({
      ...l,
      actor: retention.pseudonymizeRequesters
        ? `user_${l.actor.split("").reduce((a, c) => a + c.charCodeAt(0), 0).toString(16)}`
        : l.actor,
      target: retention.redactMessageBodies && l.type !== "system" ? "[redacted]" : l.target,
    }));

    const content = params.format === "csv" ? logsToCsv(sanitized)
                  : params.format === "json" ? logsToJson(sanitized)
                  : logsToNdjson(sanitized);
    const fileName = `audit_${params.range}_${new Date().toISOString().slice(0, 10)}.${params.format}`;
    const mime = params.format === "csv" ? "text/csv" : params.format === "json" ? "application/json" : "application/x-ndjson";

    downloadBlob(content, fileName, mime);

    const key = getOrCreateSigningKey();
    const signature = await hmacSha256(key.secret, content);

    const manifest = JSON.stringify({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      manifestKeyId: key.id,
      algorithm: "HMAC-SHA256",
      file: { name: fileName, format: params.format, byteLength: content.length, recordCount: sanitized.length },
      filters: params.filters,
      retention,
      signature,
    }, null, 2);
    downloadBlob(manifest, fileName + ".manifest.json", "application/json");

    const record: ExportRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      format: params.format,
      rangeLabel: params.range === "all" ? "All time" : `Last ${params.range}`,
      recordCount: sanitized.length,
      fileName,
      bytes: content.length,
      signature,
      manifestKeyId: key.id,
      filters: params.filters,
    };

    const s = read();
    s.exports = [record, ...s.exports];
    write(s);
    return { record, manifest };
  },
  verifyManifest: async (manifestJson: string, fileContent: string): Promise<{ ok: boolean; reason?: string }> => {
    let parsed: any;
    try { parsed = JSON.parse(manifestJson); } catch { return { ok: false, reason: "Manifest is not valid JSON" }; }
    if (!parsed?.signature || !parsed?.manifestKeyId) return { ok: false, reason: "Manifest is missing signature fields" };
    const key = getOrCreateSigningKey();
    if (parsed.manifestKeyId !== key.id) return { ok: false, reason: "Manifest was signed with a different key" };
    const sig = await hmacSha256(key.secret, fileContent);
    return sig === parsed.signature
      ? { ok: true }
      : { ok: false, reason: "Computed signature does not match manifest" };
  },
};
