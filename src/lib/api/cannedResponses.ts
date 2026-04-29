// Canned response / snippet library.
// Variable substitution: {{customer.name}}, {{ticket.id}}, {{agent.name}}, {{date}}, etc.

export interface CannedResponse {
  id: string;
  shortcut: string; // e.g. "/greet", "/refund-policy"
  title: string;
  category: string;
  body: string;
  tags: string[];
  /** Languages this snippet is available in: en, es, fr, de... */
  language: string;
  /** Times inserted */
  usageCount: number;
  /** Times rated useful */
  ratingUp: number;
  ratingDown: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const KEY = "ct.canned.v1";

function uid(p = "cn") {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}

function seed(): CannedResponse[] {
  const now = new Date().toISOString();
  const base = (s: Partial<CannedResponse>): CannedResponse => ({
    id: uid(),
    shortcut: "/snippet",
    title: "Snippet",
    category: "General",
    body: "",
    tags: [],
    language: "en",
    usageCount: Math.floor(Math.random() * 240),
    ratingUp: Math.floor(Math.random() * 40),
    ratingDown: Math.floor(Math.random() * 4),
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    createdBy: "Riley Stone",
    ...s,
  });
  return [
    base({
      shortcut: "/greet",
      title: "Friendly greeting",
      category: "Greetings",
      tags: ["greeting", "intro"],
      body: "Hi {{customer.name}},\n\nThanks for reaching out - happy to help! I'm reviewing your ticket now and will follow up within the hour.\n\nBest,\n{{agent.name}}",
      isFavorite: true,
    }),
    base({
      shortcut: "/refund-policy",
      title: "Standard refund policy",
      category: "Billing",
      tags: ["refund", "policy", "billing"],
      body: "Hi {{customer.name}},\n\nOur refund policy allows full refunds within 30 days of purchase. Since your order ({{order.id}}) was placed on {{order.date}}, you're eligible.\n\nI've initiated the refund - please allow 5-7 business days for it to reflect on your statement.\n\nLet me know if you have questions.\n\n- {{agent.name}}",
    }),
    base({
      shortcut: "/password-reset",
      title: "Password reset walkthrough",
      category: "Account",
      tags: ["password", "auth", "reset"],
      body: "Hi {{customer.name}},\n\nTo reset your password:\n\n1. Go to the sign-in page\n2. Click \"Forgot password\"\n3. Enter the email associated with your account\n4. Open the reset link from the email (check spam if you don't see it)\n\nIf you still have trouble, just reply and we'll help you directly.",
      isFavorite: true,
    }),
    base({
      shortcut: "/escalate",
      title: "Escalating to specialist",
      category: "Internal",
      tags: ["escalation", "handoff"],
      body: "Hi {{customer.name}},\n\nThanks for the detail. I'm looping in our specialist team for the deepest expertise on this. They'll respond within {{sla.response}} from now and have full context of our conversation.",
    }),
    base({
      shortcut: "/closing",
      title: "Closing & CSAT request",
      category: "Closings",
      tags: ["closing", "csat"],
      body: "Hi {{customer.name}},\n\nGlad we could resolve this! I'll close the ticket - but feel free to reply anytime to reopen it.\n\nIf you have a moment, would you mind rating our help? It only takes 10 seconds.\n\nThank you!\n{{agent.name}}",
    }),
    base({
      shortcut: "/known-issue",
      title: "Known issue acknowledgment",
      category: "Incidents",
      tags: ["incident", "known-issue"],
      body: "Hi {{customer.name}},\n\nThanks for flagging this. We're aware of the issue and our engineering team is actively working on a fix. You can follow live updates at our status page.\n\nWe'll notify you the moment it's resolved.",
    }),
    base({
      shortcut: "/saludo",
      title: "Saludo amigable",
      category: "Greetings",
      tags: ["greeting", "spanish"],
      language: "es",
      body: "Hola {{customer.name}},\n\n¡Gracias por contactarnos! Estoy revisando tu ticket y te responderé dentro de la próxima hora.\n\nSaludos,\n{{agent.name}}",
    }),
    base({
      shortcut: "/feature-request",
      title: "Feature request received",
      category: "Product",
      tags: ["feedback", "feature"],
      body: "Hi {{customer.name}},\n\nThanks for the suggestion - I've logged this with our product team. We can't promise a timeline, but customer ideas like yours genuinely shape our roadmap.\n\nI'll let you know if/when there's news on this front.",
    }),
  ];
}

function read(): CannedResponse[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function write(list: CannedResponse[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const cannedApi = {
  list: () => read(),
  get: (id: string) => read().find((c) => c.id === id),
  create(input: Partial<CannedResponse>): CannedResponse {
    const list = read();
    const now = new Date().toISOString();
    const c: CannedResponse = {
      id: uid(),
      shortcut: input.shortcut ?? "/new",
      title: input.title ?? "Untitled snippet",
      category: input.category ?? "General",
      body: input.body ?? "",
      tags: input.tags ?? [],
      language: input.language ?? "en",
      usageCount: 0,
      ratingUp: 0,
      ratingDown: 0,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy ?? "You",
    };
    list.unshift(c);
    write(list);
    return c;
  },
  update(id: string, patch: Partial<CannedResponse>) {
    const list = read();
    const i = list.findIndex((c) => c.id === id);
    if (i < 0) return;
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    write(list);
    return list[i];
  },
  remove(id: string) {
    write(read().filter((c) => c.id !== id));
  },
  duplicate(id: string) {
    const c = this.get(id);
    if (!c) return;
    return this.create({ ...c, title: `${c.title} (copy)`, shortcut: `${c.shortcut}-copy` });
  },
  recordUse(id: string) {
    return this.update(id, { usageCount: (this.get(id)?.usageCount ?? 0) + 1 });
  },
  rate(id: string, up: boolean) {
    const c = this.get(id);
    if (!c) return;
    return this.update(id, { ratingUp: c.ratingUp + (up ? 1 : 0), ratingDown: c.ratingDown + (up ? 0 : 1) });
  },
  toggleFavorite(id: string) {
    const c = this.get(id);
    if (!c) return;
    return this.update(id, { isFavorite: !c.isFavorite });
  },
  /** Return all unique categories */
  categories(): string[] {
    return Array.from(new Set(read().map((c) => c.category))).sort();
  },
};

const SAMPLE_CONTEXT = {
  customer: { name: "Maya Chen", email: "maya@acme.co", tier: "Pro" },
  agent: { name: "Riley Stone", team: "Tier 1" },
  ticket: { id: "T-1042", subject: "Login issue", priority: "high" },
  order: { id: "A-7741", date: "Apr 12, 2026", total: "$129.00" },
  sla: { response: "1 hour", resolution: "8 hours" },
  date: new Date().toLocaleDateString(),
};

/** Render variables in a template string against a context bag. */
export function renderTemplate(body: string, ctx: Record<string, any> = SAMPLE_CONTEXT): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const value = path.split(".").reduce((o: any, k: string) => o?.[k], ctx);
    return value == null ? `{{${path}}}` : String(value);
  });
}

/** Available variable tokens for the inserter UI. */
export const VARIABLE_TOKENS: Array<{ token: string; label: string; group: string }> = [
  { token: "{{customer.name}}",   label: "Customer name",   group: "Customer" },
  { token: "{{customer.email}}",  label: "Customer email",  group: "Customer" },
  { token: "{{customer.tier}}",   label: "Customer tier",   group: "Customer" },
  { token: "{{agent.name}}",      label: "Agent name",      group: "Agent" },
  { token: "{{agent.team}}",      label: "Agent team",      group: "Agent" },
  { token: "{{ticket.id}}",       label: "Ticket ID",       group: "Ticket" },
  { token: "{{ticket.subject}}",  label: "Ticket subject",  group: "Ticket" },
  { token: "{{ticket.priority}}", label: "Ticket priority", group: "Ticket" },
  { token: "{{order.id}}",        label: "Order ID",        group: "Order" },
  { token: "{{order.date}}",      label: "Order date",      group: "Order" },
  { token: "{{order.total}}",     label: "Order total",     group: "Order" },
  { token: "{{sla.response}}",    label: "SLA response",    group: "SLA" },
  { token: "{{sla.resolution}}",  label: "SLA resolution",  group: "SLA" },
  { token: "{{date}}",            label: "Today's date",    group: "System" },
];
