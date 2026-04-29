// Escalation engine: multi-step chains triggered by SLA risk/breach.
// Stored in localStorage. Includes business-hours calendar and an
// in-memory evaluator that classifies tickets against the chain.

export type EscalationTrigger = "at_risk" | "breached" | "no_response" | "reopened";

export type EscalationActionType =
  | "notify_assignee"
  | "notify_manager"
  | "page_oncall"
  | "reassign_group"
  | "increase_priority"
  | "create_incident";

export interface EscalationStep {
  id: string;
  /** Wait this many minutes after the trigger (or after previous step) */
  afterMinutes: number;
  action: EscalationActionType;
  /** Free-form target: group name, channel, user id */
  target?: string;
  note?: string;
}

export interface BusinessHours {
  /** 0=Sun..6=Sat. Days that count as business days */
  days: number[];
  /** "09:00" */
  start: string;
  end: string;
  timezone: string;
  /** Holiday ISO dates (YYYY-MM-DD) */
  holidays: string[];
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: EscalationTrigger;
  /** Apply only to tickets matching this priority. null = any */
  priority: "low" | "medium" | "high" | "urgent" | null;
  steps: EscalationStep[];
  businessHours: BusinessHours;
  createdAt: string;
  updatedAt: string;
}

const KEY = "ct.escalation.v1";

function uid(p = "esc") {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_HOURS: BusinessHours = {
  days: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "18:00",
  timezone: "UTC",
  holidays: [],
};

function seed(): EscalationPolicy[] {
  const now = new Date().toISOString();
  return [
    {
      id: "esc_p0_urgent",
      name: "P0 urgent escalation",
      description: "Page on-call immediately, then loop in management.",
      enabled: true,
      trigger: "at_risk",
      priority: "urgent",
      businessHours: { ...DEFAULT_HOURS, days: [0, 1, 2, 3, 4, 5, 6] },
      steps: [
        { id: uid("s"), afterMinutes: 0,  action: "page_oncall",     target: "primary",  note: "First responder" },
        { id: uid("s"), afterMinutes: 10, action: "notify_manager",  target: "support-managers" },
        { id: uid("s"), afterMinutes: 20, action: "create_incident", target: "sev1" },
      ],
      createdAt: now, updatedAt: now,
    },
    {
      id: "esc_high_breach",
      name: "High priority breach response",
      description: "Reassign and bump severity if a high-priority ticket breaches SLA.",
      enabled: true,
      trigger: "breached",
      priority: "high",
      businessHours: DEFAULT_HOURS,
      steps: [
        { id: uid("s"), afterMinutes: 0,  action: "increase_priority", target: "urgent" },
        { id: uid("s"), afterMinutes: 5,  action: "reassign_group",    target: "tier-2" },
        { id: uid("s"), afterMinutes: 30, action: "notify_manager",    target: "regional-lead" },
      ],
      createdAt: now, updatedAt: now,
    },
    {
      id: "esc_no_response",
      name: "No-response nudge",
      description: "Friendly nudge to assignee when a ticket sits without reply.",
      enabled: false,
      trigger: "no_response",
      priority: null,
      businessHours: DEFAULT_HOURS,
      steps: [
        { id: uid("s"), afterMinutes: 60,  action: "notify_assignee" },
        { id: uid("s"), afterMinutes: 120, action: "notify_manager", target: "team-lead" },
      ],
      createdAt: now, updatedAt: now,
    },
  ];
}

function read(): EscalationPolicy[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function write(list: EscalationPolicy[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const escalationApi = {
  list: () => read(),
  get: (id: string) => read().find((p) => p.id === id),
  create(name: string): EscalationPolicy {
    const list = read();
    const now = new Date().toISOString();
    const p: EscalationPolicy = {
      id: uid(),
      name,
      description: "",
      enabled: false,
      trigger: "at_risk",
      priority: null,
      businessHours: DEFAULT_HOURS,
      steps: [{ id: uid("s"), afterMinutes: 0, action: "notify_assignee" }],
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(p);
    write(list);
    return p;
  },
  update(id: string, patch: Partial<EscalationPolicy>): EscalationPolicy | undefined {
    const list = read();
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return;
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    write(list);
    return list[i];
  },
  remove(id: string) {
    write(read().filter((p) => p.id !== id));
  },
  addStep(id: string, step: Omit<EscalationStep, "id">) {
    const p = this.get(id);
    if (!p) return;
    return this.update(id, { steps: [...p.steps, { ...step, id: uid("s") }] });
  },
  updateStep(id: string, stepId: string, patch: Partial<EscalationStep>) {
    const p = this.get(id);
    if (!p) return;
    return this.update(id, {
      steps: p.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    });
  },
  removeStep(id: string, stepId: string) {
    const p = this.get(id);
    if (!p) return;
    return this.update(id, { steps: p.steps.filter((s) => s.id !== stepId) });
  },
};

export const ACTION_META: Record<EscalationActionType, { label: string; tone: string }> = {
  notify_assignee:    { label: "Notify assignee",    tone: "bg-sky-500/15 text-sky-600 border-sky-500/40" },
  notify_manager:     { label: "Notify manager",     tone: "bg-indigo-500/15 text-indigo-600 border-indigo-500/40" },
  page_oncall:        { label: "Page on-call",       tone: "bg-rose-500/15 text-rose-600 border-rose-500/40" },
  reassign_group:     { label: "Reassign group",     tone: "bg-amber-500/15 text-amber-600 border-amber-500/40" },
  increase_priority:  { label: "Increase priority",  tone: "bg-orange-500/15 text-orange-600 border-orange-500/40" },
  create_incident:    { label: "Create incident",    tone: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/40" },
};

export const TRIGGER_META: Record<EscalationTrigger, { label: string; description: string }> = {
  at_risk:     { label: "SLA at risk",        description: "Fires when ticket reaches 80% of SLA window" },
  breached:    { label: "SLA breached",        description: "Fires when SLA target is missed" },
  no_response: { label: "No response",         description: "Fires after period without a reply" },
  reopened:    { label: "Ticket reopened",     description: "Fires when a closed ticket re-opens" },
};

/** Classify a ticket against active policies - returns matched policies + the next step. */
export interface PendingEscalation {
  ticketId: string;
  ticketSubject: string;
  policy: EscalationPolicy;
  /** which step is next */
  nextStep: EscalationStep;
  /** minutes until next step fires (negative = overdue) */
  etaMinutes: number;
  ticketState: "at_risk" | "breached";
  priority: string;
}

export function evaluatePending(
  tickets: Array<{ id: string; subject: string; priority: string; slaState: string; createdAt?: string }>,
): PendingEscalation[] {
  const policies = read().filter((p) => p.enabled);
  const out: PendingEscalation[] = [];
  for (const t of tickets) {
    if (t.slaState !== "at_risk" && t.slaState !== "breached") continue;
    for (const p of policies) {
      if (p.trigger !== "at_risk" && p.trigger !== "breached") continue;
      if (p.trigger !== t.slaState) continue;
      if (p.priority && p.priority !== t.priority) continue;
      if (p.steps.length === 0) continue;
      // Pseudo-eta from ticket id hash so it stays stable per render
      const hash = Array.from(t.id).reduce((a, c) => a + c.charCodeAt(0), 0);
      const next = p.steps[0];
      const eta = ((hash + next.afterMinutes) % 60) - (t.slaState === "breached" ? 30 : 0);
      out.push({
        ticketId: t.id,
        ticketSubject: t.subject,
        policy: p,
        nextStep: next,
        etaMinutes: eta,
        ticketState: t.slaState as any,
        priority: t.priority,
      });
    }
  }
  return out.sort((a, b) => a.etaMinutes - b.etaMinutes);
}
