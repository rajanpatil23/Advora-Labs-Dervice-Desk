// Customer 360: aggregated profile, lifetime metrics, and unified activity timeline.
// Pulls from in-memory store (tickets, inbox, csat) and seeds enrichment data.

export interface Customer360 {
  id: string;
  name: string;
  email: string;
  company: string;
  tier: "free" | "pro" | "enterprise" | "vip";
  region: string;
  timezone: string;
  language: string;
  joinedAt: string;
  lifetimeValue: number;
  mrr: number;
  contractRenewal: string;
  healthScore: number; // 0-100
  npsScore: number | null;
  lastSeenAt: string;
  tags: string[];
  customFields: Record<string, string>;
}

export type TimelineEventKind =
  | "ticket_opened"
  | "ticket_resolved"
  | "message_received"
  | "message_sent"
  | "csat_submitted"
  | "billing_event"
  | "login"
  | "feature_used"
  | "note_added"
  | "incident_impacted";

export interface TimelineEvent {
  id: string;
  customerId: string;
  kind: TimelineEventKind;
  title: string;
  detail?: string;
  occurredAt: string;
  meta?: Record<string, any>;
  /** Optional ref to a ticket / message / incident */
  refId?: string;
  refLabel?: string;
}

const KEY_C = "ct.customer360.v1";
const KEY_T = "ct.customer360.timeline.v1";

const COMPANIES = ["Acme Corp", "Globex Industries", "Initech", "Hooli Labs", "Stark Holdings", "Wayne Dynamics", "Wonka Foods", "Pied Piper", "Soylent", "Cyberdyne"];
const REGIONS = ["NA-East", "NA-West", "EU-West", "EU-Central", "APAC-Singapore", "LATAM-Brazil"];
const TIERS: Customer360["tier"][] = ["free", "pro", "enterprise", "vip"];
const TZ = ["America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Singapore", "America/Sao_Paulo"];
const LANGS = ["en-US", "en-GB", "de-DE", "fr-FR", "pt-BR", "ja-JP"];
const TAG_POOL = ["beta-tester", "champion", "renewal-Q3", "expansion-target", "at-risk", "advocate", "integration-heavy", "mobile-first", "self-served", "high-volume"];

function uid(p = "evt") {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}

function pick<T>(a: T[], i: number): T { return a[Math.abs(i) % a.length]; }
function pickN<T>(a: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(pick(a, seed + i * 17));
  return Array.from(new Set(out));
}

function seedCustomers(): Customer360[] {
  const names = [
    ["Maya", "Chen"], ["Daniel", "Okafor"], ["Priya", "Rivera"], ["Marcus", "Kowalski"],
    ["Lena", "Park"], ["Hiro", "Singh"], ["Amina", "Müller"], ["Sofia", "Costa"],
    ["Theo", "Kim"], ["Wren", "Lopez"], ["Jordan", "Patel"], ["Isabel", "Nakamura"],
  ];
  const now = Date.now();
  return names.map(([first, last], i) => {
    const company = pick(COMPANIES, i * 7);
    const tier = TIERS[i % TIERS.length];
    const mrr = tier === "free" ? 0 : tier === "pro" ? 99 + (i * 17) % 200 : tier === "enterprise" ? 1200 + (i * 290) : 4500 + (i * 410);
    return {
      id: `cust_${i + 1}`,
      name: `${first} ${last}`,
      email: `${first}.${last}@${company.toLowerCase().replace(/\s+/g, "")}.com`,
      company,
      tier,
      region: pick(REGIONS, i * 3),
      timezone: pick(TZ, i * 5),
      language: pick(LANGS, i * 11),
      joinedAt: new Date(now - (1000 * 60 * 60 * 24 * (90 + i * 47))).toISOString(),
      lifetimeValue: mrr * (12 + (i * 5) % 30),
      mrr,
      contractRenewal: new Date(now + (1000 * 60 * 60 * 24 * (30 + i * 11))).toISOString(),
      healthScore: 35 + ((i * 13 + 7) % 60),
      npsScore: i % 4 === 0 ? null : (-20 + ((i * 17) % 100)),
      lastSeenAt: new Date(now - (1000 * 60 * (5 + i * 73))).toISOString(),
      tags: pickN(TAG_POOL, 2 + (i % 3), i),
      customFields: {
        "Account manager": pick(["Riley Stone", "Avery Brooks", "Jamie Park"], i),
        "Support plan":    tier === "vip" ? "Premium 24/7" : tier === "enterprise" ? "Business hours" : "Standard",
        "Integration":     pick(["Slack", "Salesforce", "HubSpot", "Zendesk", "Jira"], i * 2),
      },
    };
  });
}

const TIMELINE_TEMPLATES: Array<{ kind: TimelineEventKind; title: string; detail?: string }> = [
  { kind: "ticket_opened",    title: "Opened ticket",            detail: "Login fails after password reset" },
  { kind: "message_received", title: "Replied via email",        detail: "Thanks for the quick response - applying the fix now." },
  { kind: "ticket_resolved",  title: "Ticket resolved",          detail: "Resolved in 2h 14m" },
  { kind: "csat_submitted",   title: "Submitted CSAT survey",    detail: "Rated 5/5 - \"Fast and friendly\"" },
  { kind: "billing_event",    title: "Upgraded plan",            detail: "pro → enterprise" },
  { kind: "login",            title: "Signed in to portal" },
  { kind: "feature_used",     title: "Used integration",         detail: "Triggered Slack notification webhook" },
  { kind: "ticket_opened",    title: "Opened ticket",            detail: "API rate limit increase request" },
  { kind: "incident_impacted",title: "Impacted by incident",     detail: "INC-204 EU region degraded latency" },
  { kind: "message_sent",     title: "Agent replied",            detail: "Hi! I've raised your tier to 5k req/min." },
  { kind: "note_added",       title: "Internal note added",      detail: "Flagged as expansion candidate by AM." },
  { kind: "ticket_resolved",  title: "Ticket resolved",          detail: "Resolved in 38m" },
  { kind: "csat_submitted",   title: "Submitted CSAT survey",    detail: "Rated 4/5" },
  { kind: "feature_used",     title: "Exported report",          detail: "Q2 incident summary CSV" },
  { kind: "login",            title: "Mobile app opened" },
];

function seedTimeline(customers: Customer360[]): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  const now = Date.now();
  customers.forEach((c, ci) => {
    const eventCount = 8 + (ci * 3) % 8;
    for (let i = 0; i < eventCount; i++) {
      const tpl = TIMELINE_TEMPLATES[(ci * 5 + i * 3) % TIMELINE_TEMPLATES.length];
      out.push({
        id: uid(),
        customerId: c.id,
        kind: tpl.kind,
        title: tpl.title,
        detail: tpl.detail,
        occurredAt: new Date(now - (1000 * 60 * 60 * (i * 8 + ci * 3 + 1))).toISOString(),
        refId: tpl.kind.startsWith("ticket") ? `T-${1000 + ci * 12 + i}` : undefined,
        refLabel: tpl.kind.startsWith("ticket") ? `T-${1000 + ci * 12 + i}` : undefined,
      });
    }
  });
  return out;
}

function readCustomers(): Customer360[] {
  try {
    const raw = localStorage.getItem(KEY_C);
    if (raw) return JSON.parse(raw);
  } catch {}
  const c = seedCustomers();
  localStorage.setItem(KEY_C, JSON.stringify(c));
  return c;
}

function readTimeline(): TimelineEvent[] {
  try {
    const raw = localStorage.getItem(KEY_T);
    if (raw) return JSON.parse(raw);
  } catch {}
  const customers = readCustomers();
  const t = seedTimeline(customers);
  localStorage.setItem(KEY_T, JSON.stringify(t));
  return t;
}

export const customer360Api = {
  list: () => readCustomers(),
  get: (id: string) => readCustomers().find((c) => c.id === id),
  timeline(customerId: string): TimelineEvent[] {
    return readTimeline()
      .filter((e) => e.customerId === customerId)
      .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  },
  addNote(customerId: string, text: string): TimelineEvent {
    const all = readTimeline();
    const evt: TimelineEvent = {
      id: uid(),
      customerId,
      kind: "note_added",
      title: "Internal note added",
      detail: text,
      occurredAt: new Date().toISOString(),
    };
    all.unshift(evt);
    localStorage.setItem(KEY_T, JSON.stringify(all));
    return evt;
  },
  metrics(customerId: string) {
    const events = this.timeline(customerId);
    const opened   = events.filter((e) => e.kind === "ticket_opened").length;
    const resolved = events.filter((e) => e.kind === "ticket_resolved").length;
    const csatEvents = events.filter((e) => e.kind === "csat_submitted");
    const avgCsat = csatEvents.length
      ? csatEvents.reduce((a, e) => a + (parseInt((e.detail ?? "").match(/(\d)\/5/)?.[1] ?? "0")), 0) / csatEvents.length
      : null;
    return { opened, resolved, csatCount: csatEvents.length, avgCsat };
  },
};

export const KIND_META: Record<TimelineEventKind, { label: string; color: string; icon: string }> = {
  ticket_opened:     { label: "Ticket opened",      color: "bg-sky-500/15 text-sky-600 border-sky-500/30",       icon: "Ticket" },
  ticket_resolved:   { label: "Ticket resolved",    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: "CheckCircle2" },
  message_received:  { label: "Message in",         color: "bg-violet-500/15 text-violet-600 border-violet-500/30", icon: "MessageCircle" },
  message_sent:      { label: "Message out",        color: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30", icon: "Send" },
  csat_submitted:    { label: "CSAT survey",        color: "bg-amber-500/15 text-amber-600 border-amber-500/30",   icon: "Smile" },
  billing_event:     { label: "Billing",            color: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30", icon: "CreditCard" },
  login:             { label: "Sign-in",            color: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",      icon: "LogIn" },
  feature_used:      { label: "Feature used",       color: "bg-teal-500/15 text-teal-600 border-teal-500/30",      icon: "Sparkles" },
  note_added:        { label: "Internal note",      color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", icon: "StickyNote" },
  incident_impacted: { label: "Incident impact",    color: "bg-rose-500/15 text-rose-600 border-rose-500/30",      icon: "AlertOctagon" },
};
