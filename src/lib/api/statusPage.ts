// Public Status Page & Subscriber Notifications API (mock, in-memory)

export type ComponentStatus = "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type IncidentImpact = "none" | "minor" | "major" | "critical";

export interface StatusComponent {
  id: string;
  name: string;
  description?: string;
  group?: string;
  status: ComponentStatus;
  showUptime: boolean;
  order: number;
}

export interface IncidentUpdate {
  id: string;
  at: string;
  status: IncidentStatus;
  body: string;
  authorName: string;
}

export interface PublicIncident {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  componentIds: string[];
  startedAt: string;
  resolvedAt?: string;
  updates: IncidentUpdate[];
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  componentIds: string[];
  scheduledStart: string;
  scheduledEnd: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

export type SubscriberChannel = "email" | "rss" | "webhook" | "sms";

export interface Subscriber {
  id: string;
  channel: SubscriberChannel;
  target: string; // email address, phone, webhook URL
  componentIds: string[]; // empty = all
  confirmed: boolean;
  createdAt: string;
}

export interface StatusPageSettings {
  pageTitle: string;
  pageUrl: string; // public slug
  supportEmail: string;
  showUptimeHistory: boolean;
  uptimeWindowDays: 7 | 30 | 90;
  allowSubscriptions: boolean;
  brandingColor: string;
  customCss?: string;
}

const RAND = (n = 8) => Math.random().toString(36).slice(2, 2 + n);
const NOW = () => new Date().toISOString();

const mkUptime = (days: number) =>
  Array.from({ length: days }).map((_, i) => {
    const r = Math.random();
    return {
      day: i,
      pct: r > 0.92 ? 96 + Math.random() * 3 : 99.5 + Math.random() * 0.5,
      hadIncident: r > 0.94,
    };
  });

let components: StatusComponent[] = [
  { id: "c-api", name: "Public API", description: "REST + GraphQL endpoints", group: "Core", status: "operational", showUptime: true, order: 1 },
  { id: "c-app", name: "Web Application", description: "app.connecttly.com", group: "Core", status: "operational", showUptime: true, order: 2 },
  { id: "c-portal", name: "Customer Portal", description: "End-user self-service", group: "Core", status: "degraded", showUptime: true, order: 3 },
  { id: "c-mail", name: "Email Delivery", description: "Inbound + outbound mail", group: "Integrations", status: "operational", showUptime: true, order: 4 },
  { id: "c-webhooks", name: "Webhooks", description: "Outgoing webhook delivery", group: "Integrations", status: "operational", showUptime: false, order: 5 },
  { id: "c-search", name: "Search & KB Indexing", group: "Background", status: "operational", showUptime: false, order: 6 },
];

let incidents: PublicIncident[] = [
  {
    id: "i-001",
    title: "Increased latency on Customer Portal",
    status: "monitoring",
    impact: "minor",
    componentIds: ["c-portal"],
    startedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updates: [
      { id: RAND(), at: new Date(Date.now() - 1000 * 60 * 90).toISOString(), status: "investigating", body: "We are investigating reports of slow page loads on the customer portal.", authorName: "On-call Engineer" },
      { id: RAND(), at: new Date(Date.now() - 1000 * 60 * 50).toISOString(), status: "identified", body: "A backend cache node was misbehaving. Failing it over now.", authorName: "On-call Engineer" },
      { id: RAND(), at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), status: "monitoring", body: "Failover complete. Latency has returned to normal - monitoring for 30 minutes before resolving.", authorName: "On-call Engineer" },
    ],
  },
  {
    id: "i-002",
    title: "Email delivery delays from third-party provider",
    status: "resolved",
    impact: "major",
    componentIds: ["c-mail"],
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
    updates: [
      { id: RAND(), at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), status: "investigating", body: "Customers reported delayed notification emails.", authorName: "Support" },
      { id: RAND(), at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), status: "identified", body: "Upstream SMTP provider was rate-limiting us.", authorName: "Support" },
      { id: RAND(), at: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(), status: "resolved", body: "Quotas restored - backlog drained.", authorName: "Support" },
    ],
  },
];

let maintenance: MaintenanceWindow[] = [
  {
    id: "m-001",
    title: "Scheduled database upgrade",
    description: "We will perform a rolling Postgres upgrade. No downtime expected, brief read-only windows of <30 seconds.",
    componentIds: ["c-api", "c-app"],
    scheduledStart: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    scheduledEnd: new Date(Date.now() + 1000 * 60 * 60 * 50).toISOString(),
    status: "scheduled",
  },
];

let subscribers: Subscriber[] = [
  { id: "s-001", channel: "email", target: "ops@acme.com", componentIds: [], confirmed: true, createdAt: NOW() },
  { id: "s-002", channel: "email", target: "alerts@globex.io", componentIds: ["c-api", "c-webhooks"], confirmed: true, createdAt: NOW() },
  { id: "s-003", channel: "webhook", target: "https://hooks.example.com/status", componentIds: [], confirmed: true, createdAt: NOW() },
];

let settings: StatusPageSettings = {
  pageTitle: "Advora Status",
  pageUrl: "status.connecttly.com",
  supportEmail: "support@connecttly.com",
  showUptimeHistory: true,
  uptimeWindowDays: 90,
  allowSubscriptions: true,
  brandingColor: "#6366F1",
};

export const statusApi = {
  // components
  listComponents: () => [...components].sort((a, b) => a.order - b.order),
  updateComponentStatus: (id: string, status: ComponentStatus) => {
    components = components.map((c) => (c.id === id ? { ...c, status } : c));
  },
  createComponent: (input: Omit<StatusComponent, "id" | "order">) => {
    const c: StatusComponent = { ...input, id: `c-${RAND()}`, order: components.length + 1 };
    components = [...components, c];
    return c;
  },
  deleteComponent: (id: string) => {
    components = components.filter((c) => c.id !== id);
  },
  uptimeFor: (id: string, days: number) => {
    void id;
    return mkUptime(days);
  },

  // incidents
  listIncidents: () => [...incidents].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt)),
  activeIncidents: () => incidents.filter((i) => i.status !== "resolved"),
  createIncident: (input: { title: string; impact: IncidentImpact; componentIds: string[]; body: string; authorName: string }) => {
    const inc: PublicIncident = {
      id: `i-${RAND()}`,
      title: input.title,
      status: "investigating",
      impact: input.impact,
      componentIds: input.componentIds,
      startedAt: NOW(),
      updates: [{ id: RAND(), at: NOW(), status: "investigating", body: input.body, authorName: input.authorName }],
    };
    incidents = [inc, ...incidents];
    return inc;
  },
  postUpdate: (incidentId: string, input: { status: IncidentStatus; body: string; authorName: string }) => {
    incidents = incidents.map((i) => {
      if (i.id !== incidentId) return i;
      const upd: IncidentUpdate = { id: RAND(), at: NOW(), status: input.status, body: input.body, authorName: input.authorName };
      return {
        ...i,
        status: input.status,
        resolvedAt: input.status === "resolved" ? NOW() : i.resolvedAt,
        updates: [...i.updates, upd],
      };
    });
  },

  // maintenance
  listMaintenance: () => [...maintenance].sort((a, b) => +new Date(a.scheduledStart) - +new Date(b.scheduledStart)),
  scheduleMaintenance: (input: Omit<MaintenanceWindow, "id" | "status">) => {
    const m: MaintenanceWindow = { ...input, id: `m-${RAND()}`, status: "scheduled" };
    maintenance = [...maintenance, m];
    return m;
  },
  cancelMaintenance: (id: string) => {
    maintenance = maintenance.map((m) => (m.id === id ? { ...m, status: "cancelled" } : m));
  },

  // subscribers
  listSubscribers: () => [...subscribers].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  subscribe: (input: { channel: SubscriberChannel; target: string; componentIds: string[] }) => {
    const s: Subscriber = { id: `s-${RAND()}`, ...input, confirmed: input.channel !== "email", createdAt: NOW() };
    subscribers = [s, ...subscribers];
    return s;
  },
  unsubscribe: (id: string) => {
    subscribers = subscribers.filter((s) => s.id !== id);
  },
  confirmSubscriber: (id: string) => {
    subscribers = subscribers.map((s) => (s.id === id ? { ...s, confirmed: true } : s));
  },

  // overall
  overallStatus: (): { status: ComponentStatus; label: string } => {
    const order: ComponentStatus[] = ["operational", "maintenance", "degraded", "partial_outage", "major_outage"];
    const worst = components.reduce<ComponentStatus>((acc, c) => (order.indexOf(c.status) > order.indexOf(acc) ? c.status : acc), "operational");
    const labels: Record<ComponentStatus, string> = {
      operational: "All Systems Operational",
      maintenance: "Scheduled Maintenance",
      degraded: "Degraded Performance",
      partial_outage: "Partial System Outage",
      major_outage: "Major System Outage",
    };
    return { status: worst, label: labels[worst] };
  },

  // settings
  getSettings: () => ({ ...settings }),
  updateSettings: (patch: Partial<StatusPageSettings>) => {
    settings = { ...settings, ...patch };
    return settings;
  },

  // RSS export simulation
  rssFeed: () => {
    const items = incidents
      .slice(0, 20)
      .map(
        (i) => `  <item>
    <title>${i.title}</title>
    <pubDate>${new Date(i.startedAt).toUTCString()}</pubDate>
    <description>${i.updates[i.updates.length - 1]?.body ?? ""}</description>
    <guid>${i.id}</guid>
  </item>`,
      )
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${settings.pageTitle}</title>
  <link>https://${settings.pageUrl}</link>
  <description>Incident history</description>
${items}
</channel>
</rss>`;
  },
};

export const STATUS_COLORS: Record<ComponentStatus, string> = {
  operational: "bg-emerald-500",
  maintenance: "bg-sky-500",
  degraded: "bg-amber-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-rose-600",
};

export const STATUS_LABELS: Record<ComponentStatus, string> = {
  operational: "Operational",
  maintenance: "Maintenance",
  degraded: "Degraded",
  partial_outage: "Partial outage",
  major_outage: "Major outage",
};

export const IMPACT_COLORS: Record<IncidentImpact, string> = {
  none: "bg-muted text-muted-foreground",
  minor: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  major: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  critical: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};
