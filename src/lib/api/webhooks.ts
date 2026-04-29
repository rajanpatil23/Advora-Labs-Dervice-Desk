// Frontend-only webhooks store. Signed payloads are simulated with WebCrypto HMAC-SHA256.
// Backend agent: replace this module with real outbound delivery & retries; UI shape stays the same.

export type WebhookEvent =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.status_changed"
  | "ticket.assigned"
  | "ticket.sla_breached"
  | "ticket.message_added"
  | "incident.opened"
  | "incident.resolved"
  | "request.submitted"
  | "csat.submitted";

export type Webhook = {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string; // signing secret
  enabled: boolean;
  retryPolicy: { maxRetries: number; backoffSeconds: number };
  customHeaders: { key: string; value: string }[];
  createdAt: string;
  lastDeliveryAt?: string;
  successCount: number;
  failureCount: number;
};

export type DeliveryStatus = "success" | "failed" | "pending" | "retrying";

export type Delivery = {
  id: string;
  webhookId: string;
  webhookName: string;
  event: WebhookEvent;
  url: string;
  status: DeliveryStatus;
  httpCode?: number;
  attempt: number;
  durationMs: number;
  signature: string;
  payload: string;
  responseBody?: string;
  errorMessage?: string;
  at: string;
};

const KEY = "lov.webhooks.v1";
type State = { hooks: Webhook[]; deliveries: Delivery[] };

export const EVENT_OPTIONS: { value: WebhookEvent; label: string; group: string }[] = [
  { value: "ticket.created",         label: "Ticket created",         group: "Tickets" },
  { value: "ticket.updated",         label: "Ticket updated",         group: "Tickets" },
  { value: "ticket.status_changed",  label: "Ticket status changed",  group: "Tickets" },
  { value: "ticket.assigned",        label: "Ticket assigned",        group: "Tickets" },
  { value: "ticket.sla_breached",    label: "SLA breached",           group: "Tickets" },
  { value: "ticket.message_added",   label: "Message added",          group: "Tickets" },
  { value: "incident.opened",        label: "Incident opened",        group: "Incidents" },
  { value: "incident.resolved",      label: "Incident resolved",      group: "Incidents" },
  { value: "request.submitted",      label: "Service request",        group: "Requests" },
  { value: "csat.submitted",         label: "CSAT submitted",         group: "Feedback" },
];

const seedHooks: Webhook[] = [
  {
    id: "wh-seed-1",
    name: "Slack #incidents",
    url: "https://hooks.slack.com/services/T000/B000/abc-demo",
    events: ["ticket.sla_breached", "incident.opened"],
    secret: "whsec_demo_4f9a2c8b1e",
    enabled: true,
    retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
    customHeaders: [],
    createdAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
    lastDeliveryAt: new Date(Date.now() - 1800_000).toISOString(),
    successCount: 124,
    failureCount: 3,
  },
  {
    id: "wh-seed-2",
    name: "PagerDuty bridge",
    url: "https://events.pagerduty.com/v2/enqueue",
    events: ["incident.opened", "ticket.sla_breached"],
    secret: "whsec_demo_pd_91ab",
    enabled: false,
    retryPolicy: { maxRetries: 5, backoffSeconds: 60 },
    customHeaders: [{ key: "X-Routing-Key", value: "demo-key" }],
    createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
    successCount: 0,
    failureCount: 0,
  },
];

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { hooks: seedHooks, deliveries: [] };
    return JSON.parse(raw);
  } catch {
    return { hooks: seedHooks, deliveries: [] };
  }
}
function write(s: State) {
  // Keep delivery log bounded.
  s.deliveries = s.deliveries.slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(s));
}

function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return "whsec_" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function signPayload(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}`;
}

function samplePayload(event: WebhookEvent): Record<string, unknown> {
  return {
    event,
    deliveredAt: new Date().toISOString(),
    data: {
      ticket: {
        id: "tkt_" + crypto.randomUUID().slice(0, 8),
        number: "TKT-" + Math.floor(1000 + Math.random() * 9000),
        title: event === "incident.opened" ? "Email service degraded" : "Sample ticket payload",
        priority: "high",
        status: event === "incident.resolved" ? "resolved" : "open",
        requester: { name: "Demo User", email: "demo@example.com" },
      },
    },
  };
}

export const webhooksApi = {
  get: () => read(),
  newWebhook: (): Webhook => ({
    id: crypto.randomUUID(),
    name: "",
    url: "",
    events: [],
    secret: generateSecret(),
    enabled: true,
    retryPolicy: { maxRetries: 3, backoffSeconds: 30 },
    customHeaders: [],
    createdAt: new Date().toISOString(),
    successCount: 0,
    failureCount: 0,
  }),
  saveWebhook: (hook: Webhook) => {
    const s = read();
    const exists = s.hooks.find(h => h.id === hook.id);
    s.hooks = exists ? s.hooks.map(h => h.id === hook.id ? hook : h) : [hook, ...s.hooks];
    write(s);
  },
  toggleWebhook: (id: string) => {
    const s = read();
    s.hooks = s.hooks.map(h => h.id === id ? { ...h, enabled: !h.enabled } : h);
    write(s);
  },
  rotateSecret: (id: string): string => {
    const s = read();
    const next = generateSecret();
    s.hooks = s.hooks.map(h => h.id === id ? { ...h, secret: next } : h);
    write(s);
    return next;
  },
  deleteWebhook: (id: string) => {
    const s = read();
    s.hooks = s.hooks.filter(h => h.id !== id);
    s.deliveries = s.deliveries.filter(d => d.webhookId !== id);
    write(s);
  },
  testDeliver: async (id: string, event: WebhookEvent): Promise<Delivery> => {
    const s = read();
    const hook = s.hooks.find(h => h.id === id);
    if (!hook) throw new Error("Webhook not found");

    const payloadObj = samplePayload(event);
    const payload = JSON.stringify(payloadObj, null, 2);
    const signature = await signPayload(hook.secret, payload);

    // Simulate delivery (no real network call). Bias toward success.
    const roll = Math.random();
    const success = roll > 0.18;
    const httpCode = success ? 200 : (roll > 0.1 ? 500 : 404);
    const durationMs = Math.round(80 + Math.random() * 420);

    const delivery: Delivery = {
      id: crypto.randomUUID(),
      webhookId: hook.id,
      webhookName: hook.name || hook.url,
      event,
      url: hook.url,
      status: success ? "success" : "failed",
      httpCode,
      attempt: 1,
      durationMs,
      signature,
      payload,
      responseBody: success ? '{"ok":true}' : '{"error":"endpoint returned non-2xx"}',
      errorMessage: success ? undefined : `Receiver returned HTTP ${httpCode}`,
      at: new Date().toISOString(),
    };

    s.deliveries = [delivery, ...s.deliveries];
    s.hooks = s.hooks.map(h => h.id === id ? {
      ...h,
      lastDeliveryAt: delivery.at,
      successCount: h.successCount + (success ? 1 : 0),
      failureCount: h.failureCount + (success ? 0 : 1),
    } : h);
    write(s);
    return delivery;
  },
  retryDelivery: async (deliveryId: string): Promise<Delivery | null> => {
    const s = read();
    const prev = s.deliveries.find(d => d.id === deliveryId);
    if (!prev) return null;
    const hook = s.hooks.find(h => h.id === prev.webhookId);
    if (!hook) return null;

    const success = Math.random() > 0.25;
    const httpCode = success ? 200 : 502;
    const durationMs = Math.round(80 + Math.random() * 420);
    const signature = await signPayload(hook.secret, prev.payload);

    const next: Delivery = {
      ...prev,
      id: crypto.randomUUID(),
      attempt: prev.attempt + 1,
      status: success ? "success" : (prev.attempt + 1 >= hook.retryPolicy.maxRetries ? "failed" : "retrying"),
      httpCode,
      durationMs,
      signature,
      responseBody: success ? '{"ok":true}' : '{"error":"upstream gateway error"}',
      errorMessage: success ? undefined : `Receiver returned HTTP ${httpCode}`,
      at: new Date().toISOString(),
    };
    s.deliveries = [next, ...s.deliveries];
    s.hooks = s.hooks.map(h => h.id === hook.id ? {
      ...h,
      lastDeliveryAt: next.at,
      successCount: h.successCount + (success ? 1 : 0),
      failureCount: h.failureCount + (success ? 0 : 1),
    } : h);
    write(s);
    return next;
  },
  clearDeliveries: () => {
    const s = read();
    s.deliveries = [];
    write(s);
  },
};
