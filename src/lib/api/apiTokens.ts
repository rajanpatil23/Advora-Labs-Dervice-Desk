// Frontend-only personal access tokens. Tokens are generated client-side and stored
// in localStorage with only the masked preview kept for display after creation.
// Backend agent: replace this with real PAT issuance and validation; UI shape stays the same.

export type ApiScope =
  | "tickets:read" | "tickets:write"
  | "incidents:read" | "incidents:write"
  | "requests:read" | "requests:write"
  | "users:read" | "users:write"
  | "reports:read"
  | "automations:read" | "automations:write"
  | "webhooks:read" | "webhooks:write"
  | "kb:read" | "kb:write";

export type ApiToken = {
  id: string;
  name: string;
  prefix: string;        // e.g. "lov_pk_" + 4-char id
  maskedTail: string;    // last 4 chars for display
  scopes: ApiScope[];
  createdAt: string;
  expiresAt?: string;    // optional ISO date
  lastUsedAt?: string;
  requestCount: number;
};

export type ScopeGroup = { group: string; scopes: { value: ApiScope; label: string; description: string }[] };

export const SCOPE_CATALOG: ScopeGroup[] = [
  { group: "Tickets", scopes: [
    { value: "tickets:read",  label: "Read tickets",  description: "List, get and search tickets" },
    { value: "tickets:write", label: "Write tickets", description: "Create, update, assign, resolve tickets" },
  ]},
  { group: "Incidents", scopes: [
    { value: "incidents:read",  label: "Read incidents",  description: "View incident records" },
    { value: "incidents:write", label: "Write incidents", description: "Open, update and resolve incidents" },
  ]},
  { group: "Requests", scopes: [
    { value: "requests:read",  label: "Read requests",  description: "View service requests" },
    { value: "requests:write", label: "Write requests", description: "Submit and update service requests" },
  ]},
  { group: "Users & access", scopes: [
    { value: "users:read",  label: "Read users",  description: "List members and agents" },
    { value: "users:write", label: "Write users", description: "Invite, deactivate or change roles" },
  ]},
  { group: "Insights", scopes: [
    { value: "reports:read", label: "Read reports", description: "Query dashboards and metrics" },
  ]},
  { group: "Automations", scopes: [
    { value: "automations:read",  label: "Read automations",  description: "List rules and templates" },
    { value: "automations:write", label: "Write automations", description: "Create and modify rules" },
  ]},
  { group: "Webhooks", scopes: [
    { value: "webhooks:read",  label: "Read webhooks",  description: "List endpoints and deliveries" },
    { value: "webhooks:write", label: "Write webhooks", description: "Create and rotate endpoints" },
  ]},
  { group: "Knowledge", scopes: [
    { value: "kb:read",  label: "Read KB",  description: "Read articles and categories" },
    { value: "kb:write", label: "Write KB", description: "Author and publish articles" },
  ]},
];

export const ALL_SCOPES: ApiScope[] = SCOPE_CATALOG.flatMap(g => g.scopes.map(s => s.value));

const KEY = "lov.api_tokens.v1";

type State = { tokens: ApiToken[] };

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { tokens: [] };
    return JSON.parse(raw);
  } catch {
    return { tokens: [] };
  }
}
function write(s: State) { localStorage.setItem(KEY, JSON.stringify(s)); }

function rand(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

export const apiTokensApi = {
  get: () => read(),
  create: (params: { name: string; scopes: ApiScope[]; expiresAt?: string }): { token: ApiToken; secret: string } => {
    const s = read();
    const id = rand(8);
    const secret = `lov_pat_${id}_${rand(40)}`;
    const token: ApiToken = {
      id: crypto.randomUUID(),
      name: params.name,
      prefix: `lov_pat_${id}`,
      maskedTail: secret.slice(-4),
      scopes: params.scopes,
      createdAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
      requestCount: 0,
    };
    s.tokens = [token, ...s.tokens];
    write(s);
    return { token, secret };
  },
  revoke: (id: string) => {
    const s = read();
    s.tokens = s.tokens.filter(t => t.id !== id);
    write(s);
  },
  recordUsage: (id: string) => {
    const s = read();
    s.tokens = s.tokens.map(t => t.id === id
      ? { ...t, lastUsedAt: new Date().toISOString(), requestCount: t.requestCount + 1 }
      : t);
    write(s);
  },
  isExpired: (t: ApiToken): boolean => !!t.expiresAt && new Date(t.expiresAt).getTime() < Date.now(),
};

// Playground sample request specs — keep aligned with the scope catalog above.
export type EndpointSpec = {
  id: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  scope: ApiScope;
  group: string;
  sampleBody?: Record<string, unknown>;
  sampleResponse: unknown;
};

export const ENDPOINT_SPECS: EndpointSpec[] = [
  { id: "tk-list", method: "GET",  path: "/v1/tickets",            summary: "List tickets",          scope: "tickets:read",  group: "Tickets",
    sampleResponse: { data: [{ id: "tkt_01", number: "TKT-1042", title: "VPN broken", status: "open", priority: "high" }], cursor: null } },
  { id: "tk-get",  method: "GET",  path: "/v1/tickets/{id}",       summary: "Get ticket",            scope: "tickets:read",  group: "Tickets",
    sampleResponse: { id: "tkt_01", number: "TKT-1042", title: "VPN broken", status: "open", priority: "high", assignee: "alex.kim" } },
  { id: "tk-new",  method: "POST", path: "/v1/tickets",            summary: "Create ticket",         scope: "tickets:write", group: "Tickets",
    sampleBody: { title: "Printer offline", priority: "medium", category: "Hardware" },
    sampleResponse: { id: "tkt_42", number: "TKT-1099", status: "open", createdAt: "2026-04-29T12:00:00Z" } },
  { id: "tk-upd",  method: "PATCH",path: "/v1/tickets/{id}",       summary: "Update ticket",         scope: "tickets:write", group: "Tickets",
    sampleBody: { status: "resolved", resolution: "rebooted printer" },
    sampleResponse: { id: "tkt_42", status: "resolved" } },
  { id: "in-list", method: "GET",  path: "/v1/incidents",          summary: "List incidents",        scope: "incidents:read",group: "Incidents",
    sampleResponse: { data: [{ id: "inc_07", title: "Email degraded", severity: "sev-2", status: "investigating" }] } },
  { id: "rq-new",  method: "POST", path: "/v1/requests",           summary: "Submit request",        scope: "requests:write",group: "Requests",
    sampleBody: { catalogItemId: "ci_laptop", justification: "Replacement for damaged unit" },
    sampleResponse: { id: "req_88", status: "submitted" } },
  { id: "us-list", method: "GET",  path: "/v1/users",              summary: "List users",            scope: "users:read",    group: "Users",
    sampleResponse: { data: [{ id: "u_01", name: "Alex Kim", role: "admin" }] } },
  { id: "rp-summ", method: "GET",  path: "/v1/reports/summary",    summary: "Reports summary",       scope: "reports:read",  group: "Reports",
    sampleResponse: { openTickets: 18, slaCompliance: 0.94, avgFirstResponseMins: 12 } },
  { id: "kb-list", method: "GET",  path: "/v1/kb/articles",        summary: "List KB articles",      scope: "kb:read",       group: "Knowledge",
    sampleResponse: { data: [{ id: "kb_12", title: "Reset your password", views: 248 }] } },
  { id: "wh-list", method: "GET",  path: "/v1/webhooks",           summary: "List webhook endpoints",scope: "webhooks:read", group: "Webhooks",
    sampleResponse: { data: [{ id: "wh_01", url: "https://hooks.slack.com/...", events: ["ticket.created"] }] } },
];
