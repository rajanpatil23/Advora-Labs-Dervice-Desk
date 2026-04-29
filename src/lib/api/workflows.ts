// Workflow / automation builder primitives.
// Stored in localStorage; runtime is a simple in-memory simulator
// that can dry-run a workflow against a sample ticket payload.

export type NodeKind =
  | "trigger"
  | "condition"
  | "action"
  | "delay"
  | "branch"
  | "end";

export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  /** Display label */
  label: string;
  /** Free-form config bag (depends on kind) */
  config: Record<string, any>;
  /** Canvas position */
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  /** Optional label (e.g. "yes" / "no" for branches) */
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updatedAt: string;
  runs: WorkflowRun[];
}

export interface WorkflowRun {
  id: string;
  startedAt: string;
  status: "ok" | "failed";
  trace: Array<{ nodeId: string; label: string; outcome: string }>;
}

const KEY = "ct.workflows.v1";

function read(): Workflow[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seed();
  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

function write(list: Workflow[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function uid(prefix = "n") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function seed(): Workflow[] {
  const wf: Workflow = {
    id: "wf_vip",
    name: "VIP escalation",
    description: "Auto-assign tickets from VIP customers and notify the on-call manager.",
    enabled: true,
    updatedAt: new Date().toISOString(),
    runs: [],
    nodes: [
      { id: "t1", kind: "trigger", label: "Ticket created", config: { event: "ticket.created" }, x: 80, y: 200 },
      { id: "c1", kind: "condition", label: "Customer is VIP?", config: { field: "customer.tier", op: "eq", value: "vip" }, x: 320, y: 200 },
      { id: "a1", kind: "action", label: "Set priority high", config: { type: "set_field", field: "priority", value: "high" }, x: 580, y: 100 },
      { id: "a2", kind: "action", label: "Notify on-call", config: { type: "notify", channel: "slack", target: "#oncall" }, x: 580, y: 200 },
      { id: "a3", kind: "action", label: "Assign to senior", config: { type: "assign", group: "senior_agents" }, x: 580, y: 300 },
      { id: "e1", kind: "end", label: "Done", config: {}, x: 820, y: 200 },
      { id: "e2", kind: "end", label: "Skip", config: {}, x: 580, y: 420 },
    ],
    edges: [
      { id: "e_t1_c1", from: "t1", to: "c1" },
      { id: "e_c1_a1", from: "c1", to: "a1", label: "yes" },
      { id: "e_c1_a2", from: "c1", to: "a2", label: "yes" },
      { id: "e_c1_a3", from: "c1", to: "a3", label: "yes" },
      { id: "e_a1_e1", from: "a1", to: "e1" },
      { id: "e_a2_e1", from: "a2", to: "e1" },
      { id: "e_a3_e1", from: "a3", to: "e1" },
      { id: "e_c1_e2", from: "c1", to: "e2", label: "no" },
    ],
  };
  return [wf];
}

export const workflowApi = {
  list(): Workflow[] {
    return read();
  },
  get(id: string): Workflow | undefined {
    return read().find((w) => w.id === id);
  },
  create(name: string): Workflow {
    const list = read();
    const wf: Workflow = {
      id: uid("wf"),
      name,
      description: "",
      enabled: false,
      updatedAt: new Date().toISOString(),
      runs: [],
      nodes: [
        { id: "t1", kind: "trigger", label: "Ticket created", config: { event: "ticket.created" }, x: 80, y: 160 },
        { id: "end", kind: "end", label: "End", config: {}, x: 360, y: 160 },
      ],
      edges: [{ id: "e_start", from: "t1", to: "end" }],
    };
    list.unshift(wf);
    write(list);
    return wf;
  },
  update(id: string, patch: Partial<Workflow>): Workflow | undefined {
    const list = read();
    const idx = list.findIndex((w) => w.id === id);
    if (idx < 0) return;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    write(list);
    return list[idx];
  },
  remove(id: string) {
    write(read().filter((w) => w.id !== id));
  },
  addNode(id: string, kind: NodeKind, x: number, y: number): Workflow | undefined {
    const wf = this.get(id);
    if (!wf) return;
    const node: WorkflowNode = {
      id: uid("n"),
      kind,
      label: defaultLabel(kind),
      config: defaultConfig(kind),
      x,
      y,
    };
    return this.update(id, { nodes: [...wf.nodes, node] });
  },
  updateNode(id: string, nodeId: string, patch: Partial<WorkflowNode>): Workflow | undefined {
    const wf = this.get(id);
    if (!wf) return;
    return this.update(id, {
      nodes: wf.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    });
  },
  removeNode(id: string, nodeId: string): Workflow | undefined {
    const wf = this.get(id);
    if (!wf) return;
    return this.update(id, {
      nodes: wf.nodes.filter((n) => n.id !== nodeId),
      edges: wf.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    });
  },
  connect(id: string, from: string, to: string, label?: string): Workflow | undefined {
    const wf = this.get(id);
    if (!wf || from === to) return wf;
    if (wf.edges.some((e) => e.from === from && e.to === to)) return wf;
    return this.update(id, {
      edges: [...wf.edges, { id: uid("e"), from, to, label }],
    });
  },
  disconnect(id: string, edgeId: string): Workflow | undefined {
    const wf = this.get(id);
    if (!wf) return;
    return this.update(id, { edges: wf.edges.filter((e) => e.id !== edgeId) });
  },
  /** Dry-run the workflow against a sample payload. */
  simulate(id: string, payload: Record<string, any>): WorkflowRun {
    const wf = this.get(id);
    const run: WorkflowRun = {
      id: uid("run"),
      startedAt: new Date().toISOString(),
      status: "ok",
      trace: [],
    };
    if (!wf) {
      run.status = "failed";
      return run;
    }
    const trigger = wf.nodes.find((n) => n.kind === "trigger");
    if (!trigger) {
      run.status = "failed";
      return run;
    }
    const visited = new Set<string>();
    const walk = (nodeId: string, branch?: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = wf.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      let outcome = "ok";
      if (node.kind === "condition") {
        const { field, op, value } = node.config;
        const actual = field?.split(".").reduce((o: any, k: string) => o?.[k], payload);
        const matched =
          op === "eq" ? actual === value :
          op === "neq" ? actual !== value :
          op === "contains" ? String(actual ?? "").includes(String(value)) :
          false;
        outcome = matched ? "yes" : "no";
      } else if (node.kind === "delay") {
        outcome = `wait ${node.config.minutes ?? 5}m`;
      } else if (node.kind === "action") {
        outcome = node.config.type ?? "action";
      }
      run.trace.push({ nodeId: node.id, label: node.label, outcome });
      const next = wf.edges.filter((e) => e.from === node.id);
      next.forEach((edge) => {
        if (node.kind === "condition" && edge.label && edge.label !== outcome) return;
        walk(edge.to, edge.label);
      });
    };
    walk(trigger.id);
    // Persist run
    const updated = this.update(id, { runs: [run, ...(wf.runs || [])].slice(0, 25) });
    return updated?.runs[0] ?? run;
  },
};

export function defaultLabel(kind: NodeKind): string {
  switch (kind) {
    case "trigger": return "Trigger";
    case "condition": return "Condition";
    case "action": return "Action";
    case "delay": return "Wait";
    case "branch": return "Branch";
    case "end": return "End";
  }
}

export function defaultConfig(kind: NodeKind): Record<string, any> {
  switch (kind) {
    case "trigger": return { event: "ticket.created" };
    case "condition": return { field: "ticket.priority", op: "eq", value: "high" };
    case "action": return { type: "set_field", field: "status", value: "open" };
    case "delay": return { minutes: 15 };
    case "branch": return {};
    case "end": return {};
    default: return {};
  }
}

export const TRIGGER_EVENTS = [
  "ticket.created",
  "ticket.updated",
  "ticket.assigned",
  "ticket.resolved",
  "comment.added",
  "sla.breached",
];

export const ACTION_TYPES = [
  { value: "set_field", label: "Set field" },
  { value: "assign", label: "Assign to group/agent" },
  { value: "notify", label: "Send notification" },
  { value: "tag", label: "Add tag" },
  { value: "webhook", label: "Call webhook" },
];

export const SAMPLE_PAYLOAD = {
  ticket: {
    id: "T-1042",
    priority: "high",
    status: "new",
    subject: "Login fails after password reset",
  },
  customer: {
    name: "Acme Corp",
    tier: "vip",
    region: "EU",
  },
};
