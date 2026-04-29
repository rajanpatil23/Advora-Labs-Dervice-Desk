// Frontend-only integrations & webhooks state. Persisted to localStorage.
// Backend agent: replace this module with real fetch() calls; UI is decoupled.

export type IntegrationId =
  | "slack"
  | "msteams"
  | "github"
  | "jira"
  | "gitlab"
  | "discord"
  | "pagerduty"
  | "zapier";

export type Integration = {
  id: IntegrationId;
  name: string;
  category: "chat" | "devtools" | "incident" | "automation";
  description: string;
  connected: boolean;
  config?: Record<string, string>;
  connectedAt?: string;
};

export type WebhookEvent =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.resolved"
  | "ticket.escalated"
  | "request.approved"
  | "request.rejected"
  | "incident.opened"
  | "incident.closed";

export type Webhook = {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string; // signing secret (shown once on create, kept here for demo)
  active: boolean;
  createdAt: string;
  lastDeliveryAt?: string;
  lastStatus?: number;
};

export type Delivery = {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  status: number;
  durationMs: number;
  at: string;
  payloadPreview: string;
};

const KEY = "lov.integrations.v1";

type State = {
  integrations: Integration[];
  webhooks: Webhook[];
  deliveries: Delivery[];
};

const seedIntegrations: Integration[] = [
  { id: "slack", name: "Slack", category: "chat", description: "Post ticket and incident updates to channels.", connected: false },
  { id: "msteams", name: "Microsoft Teams", category: "chat", description: "Notify channels on critical events.", connected: false },
  { id: "discord", name: "Discord", category: "chat", description: "Stream events to a Discord webhook.", connected: false },
  { id: "github", name: "GitHub", category: "devtools", description: "Link tickets to issues and pull requests.", connected: false },
  { id: "gitlab", name: "GitLab", category: "devtools", description: "Sync merge requests with tickets.", connected: false },
  { id: "jira", name: "Jira", category: "devtools", description: "Two-way sync with Jira issues.", connected: false },
  { id: "pagerduty", name: "PagerDuty", category: "incident", description: "Trigger on-call escalations from incidents.", connected: false },
  { id: "zapier", name: "Zapier", category: "automation", description: "Connect to 6,000+ apps via Zapier.", connected: false },
];

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { integrations: seedIntegrations, webhooks: [], deliveries: [] };
    const parsed = JSON.parse(raw);
    // merge any missing seed integrations (in case we add more later)
    const merged = seedIntegrations.map(s => parsed.integrations?.find((i: Integration) => i.id === s.id) ?? s);
    return { integrations: merged, webhooks: parsed.webhooks ?? [], deliveries: parsed.deliveries ?? [] };
  } catch {
    return { integrations: seedIntegrations, webhooks: [], deliveries: [] };
  }
}

function write(s: State) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const ALL_EVENTS: WebhookEvent[] = [
  "ticket.created", "ticket.updated", "ticket.resolved", "ticket.escalated",
  "request.approved", "request.rejected", "incident.opened", "incident.closed",
];

export const integrationsApi = {
  get: () => read(),
  connectIntegration: (id: IntegrationId, config: Record<string, string>) => {
    const s = read();
    s.integrations = s.integrations.map(i => i.id === id ? { ...i, connected: true, config, connectedAt: new Date().toISOString() } : i);
    write(s);
  },
  disconnectIntegration: (id: IntegrationId) => {
    const s = read();
    s.integrations = s.integrations.map(i => i.id === id ? { ...i, connected: false, config: undefined, connectedAt: undefined } : i);
    write(s);
  },
  createWebhook: (input: { name: string; url: string; events: WebhookEvent[] }) => {
    const s = read();
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    const wh: Webhook = {
      id: crypto.randomUUID(),
      ...input,
      secret,
      active: true,
      createdAt: new Date().toISOString(),
    };
    s.webhooks = [wh, ...s.webhooks];
    write(s);
    return wh;
  },
  toggleWebhook: (id: string) => {
    const s = read();
    s.webhooks = s.webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w);
    write(s);
  },
  deleteWebhook: (id: string) => {
    const s = read();
    s.webhooks = s.webhooks.filter(w => w.id !== id);
    s.deliveries = s.deliveries.filter(d => d.webhookId !== id);
    write(s);
  },
  testWebhook: (id: string) => {
    const s = read();
    const wh = s.webhooks.find(w => w.id === id);
    if (!wh) return null;
    const status = Math.random() > 0.15 ? 200 : 500;
    const delivery: Delivery = {
      id: crypto.randomUUID(),
      webhookId: id,
      event: "ticket.created",
      status,
      durationMs: Math.round(80 + Math.random() * 320),
      at: new Date().toISOString(),
      payloadPreview: `{"event":"ticket.created","data":{"id":"TKT-001","title":"Test"}}`,
    };
    s.deliveries = [delivery, ...s.deliveries].slice(0, 100);
    s.webhooks = s.webhooks.map(w => w.id === id ? { ...w, lastDeliveryAt: delivery.at, lastStatus: status } : w);
    write(s);
    return delivery;
  },
};
