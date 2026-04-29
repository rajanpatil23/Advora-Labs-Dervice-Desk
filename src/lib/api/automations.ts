// Frontend-only automation rules. Persisted to localStorage.
// Backend agent: replace this module with API calls; UI shape stays the same.

export type TriggerType =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.priority_changed"
  | "ticket.sla_breached"
  | "ticket.unassigned_for"
  | "request.submitted"
  | "incident.opened";

export type ConditionField =
  | "priority" | "category" | "status" | "channel" | "assignee" | "title_contains" | "tag";
export type ConditionOp = "equals" | "not_equals" | "contains" | "in";

export type Condition = {
  id: string;
  field: ConditionField;
  op: ConditionOp;
  value: string;
};

export type ActionType =
  | "assign_agent"
  | "assign_team"
  | "set_priority"
  | "set_category"
  | "add_tag"
  | "send_notification"
  | "escalate"
  | "post_to_channel"
  | "trigger_webhook";

export type Action = {
  id: string;
  type: ActionType;
  value: string;
};

export type Rule = {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerType;
  matchAll: boolean; // AND vs OR for conditions
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
};

export type RunLog = {
  id: string;
  ruleId: string;
  ruleName: string;
  at: string;
  outcome: "matched" | "skipped" | "failed";
  detail: string;
};

const KEY = "lov.automations.v1";

type State = { rules: Rule[]; logs: RunLog[] };

const seedRules: Rule[] = [
  {
    id: "r-seed-1",
    name: "Auto-assign urgent tickets to on-call",
    description: "Route every urgent ticket to the on-call agent immediately.",
    trigger: "ticket.created",
    matchAll: true,
    conditions: [{ id: "c1", field: "priority", op: "equals", value: "urgent" }],
    actions: [
      { id: "a1", type: "assign_agent", value: "on-call" },
      { id: "a2", type: "send_notification", value: "Urgent ticket assigned" },
    ],
    enabled: true,
    runCount: 42,
    lastRunAt: new Date(Date.now() - 3_600_000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
  },
  {
    id: "r-seed-2",
    name: "Escalate on SLA breach",
    description: "Page the manager when a high-priority ticket breaches SLA.",
    trigger: "ticket.sla_breached",
    matchAll: true,
    conditions: [{ id: "c1", field: "priority", op: "in", value: "urgent,high" }],
    actions: [
      { id: "a1", type: "escalate", value: "manager" },
      { id: "a2", type: "post_to_channel", value: "#incidents" },
    ],
    enabled: true,
    runCount: 8,
    createdAt: new Date(Date.now() - 14 * 86400_000).toISOString(),
  },
];

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { rules: seedRules, logs: [] };
    return JSON.parse(raw);
  } catch {
    return { rules: seedRules, logs: [] };
  }
}
function write(s: State) { localStorage.setItem(KEY, JSON.stringify(s)); }

export const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: "ticket.created", label: "Ticket is created" },
  { value: "ticket.updated", label: "Ticket is updated" },
  { value: "ticket.priority_changed", label: "Ticket priority changes" },
  { value: "ticket.sla_breached", label: "Ticket SLA breaches" },
  { value: "ticket.unassigned_for", label: "Ticket unassigned > 1h" },
  { value: "request.submitted", label: "Service request submitted" },
  { value: "incident.opened", label: "Incident is opened" },
];

export const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
  { value: "channel", label: "Channel" },
  { value: "assignee", label: "Assignee" },
  { value: "title_contains", label: "Title contains" },
  { value: "tag", label: "Tag" },
];

export const CONDITION_OPS: { value: ConditionOp; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "in", label: "is one of" },
];

export const ACTION_OPTIONS: { value: ActionType; label: string; placeholder: string }[] = [
  { value: "assign_agent", label: "Assign agent", placeholder: "agent name or 'on-call'" },
  { value: "assign_team", label: "Assign team", placeholder: "team name" },
  { value: "set_priority", label: "Set priority", placeholder: "low | medium | high | urgent" },
  { value: "set_category", label: "Set category", placeholder: "Network" },
  { value: "add_tag", label: "Add tag", placeholder: "vip" },
  { value: "send_notification", label: "Send notification", placeholder: "Message text" },
  { value: "escalate", label: "Escalate to", placeholder: "manager | admin" },
  { value: "post_to_channel", label: "Post to channel", placeholder: "#alerts" },
  { value: "trigger_webhook", label: "Trigger webhook", placeholder: "Webhook name" },
];

export const automationsApi = {
  get: () => read(),
  saveRule: (rule: Rule) => {
    const s = read();
    const exists = s.rules.find(r => r.id === rule.id);
    s.rules = exists ? s.rules.map(r => r.id === rule.id ? rule : r) : [rule, ...s.rules];
    write(s);
  },
  toggleRule: (id: string) => {
    const s = read();
    s.rules = s.rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    write(s);
  },
  deleteRule: (id: string) => {
    const s = read();
    s.rules = s.rules.filter(r => r.id !== id);
    s.logs = s.logs.filter(l => l.ruleId !== id);
    write(s);
  },
  runTest: (id: string) => {
    const s = read();
    const rule = s.rules.find(r => r.id === id);
    if (!rule) return null;
    const outcome: RunLog["outcome"] = Math.random() > 0.2 ? "matched" : Math.random() > 0.5 ? "skipped" : "failed";
    const log: RunLog = {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      at: new Date().toISOString(),
      outcome,
      detail: outcome === "matched"
        ? `Ran ${rule.actions.length} action(s) on test ticket TKT-DEMO`
        : outcome === "skipped"
          ? "Conditions did not match test payload"
          : "Action failed: target not found",
    };
    s.logs = [log, ...s.logs].slice(0, 100);
    if (outcome === "matched") {
      s.rules = s.rules.map(r => r.id === id ? { ...r, runCount: r.runCount + 1, lastRunAt: log.at } : r);
    }
    write(s);
    return log;
  },
  newRule: (): Rule => ({
    id: crypto.randomUUID(),
    name: "",
    trigger: "ticket.created",
    matchAll: true,
    conditions: [],
    actions: [],
    enabled: true,
    runCount: 0,
    createdAt: new Date().toISOString(),
  }),
  duplicateRule: (id: string): Rule | null => {
    const s = read();
    const src = s.rules.find(r => r.id === id);
    if (!src) return null;
    const copy: Rule = {
      ...src,
      id: crypto.randomUUID(),
      name: `${src.name} (copy)`,
      runCount: 0,
      lastRunAt: undefined,
      createdAt: new Date().toISOString(),
      conditions: src.conditions.map(c => ({ ...c, id: crypto.randomUUID() })),
      actions: src.actions.map(a => ({ ...a, id: crypto.randomUUID() })),
    };
    const idx = s.rules.findIndex(r => r.id === id);
    s.rules = [...s.rules.slice(0, idx + 1), copy, ...s.rules.slice(idx + 1)];
    write(s);
    return copy;
  },
  moveRule: (id: string, dir: "up" | "down") => {
    const s = read();
    const idx = s.rules.findIndex(r => r.id === id);
    if (idx < 0) return;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= s.rules.length) return;
    const arr = [...s.rules];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    s.rules = arr;
    write(s);
  },
  createFromTemplate: (rule: Omit<Rule, "id" | "createdAt" | "runCount" | "lastRunAt">): Rule => {
    const full: Rule = {
      ...rule,
      id: crypto.randomUUID(),
      runCount: 0,
      createdAt: new Date().toISOString(),
    };
    const s = read();
    s.rules = [full, ...s.rules];
    write(s);
    return full;
  },
};
