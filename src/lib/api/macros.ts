// Macros: reusable bundles of ticket actions (reply, status, priority, assignee, tags).
// Frontend-only persistence via localStorage; swap to API when backend lands.
import type { Priority, TicketStatus, Ticket } from "@/lib/types";

export type AssigneeAction =
  | { kind: "unchanged" }
  | { kind: "specific"; agentId: string }
  | { kind: "current_user" }
  | { kind: "unassign" };

export interface Macro {
  id: string;
  name: string;
  description?: string;
  scope: "personal" | "team";
  // Composer
  reply?: string;          // template body, supports {requester}, {agent}, {ticketNumber}, {title}
  isInternal?: boolean;    // post as internal note instead of reply
  // Field updates (all optional)
  status?: TicketStatus;
  priority?: Priority;
  assignee?: AssigneeAction;
  addTags?: string[];
  removeTags?: string[];
  shortcut?: string;       // e.g. "1", "2"… max length 1, runs from composer when focused
  createdAt: string;
  updatedAt: string;
}

const KEY = (uid: string) => `lov.macros.v1.${uid}`;

export const SEED_MACROS: Omit<Macro, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Acknowledge & start working",
    description: "Send a friendly ack, take ownership, mark in-progress.",
    scope: "personal",
    reply: "Hi {requester}, thanks for reaching out - I've taken this on and I'm looking into it now. I'll follow up shortly with an update.",
    status: "in_progress",
    assignee: { kind: "current_user" },
    addTags: ["ack"],
    shortcut: "1",
  },
  {
    name: "Need more info",
    description: "Ask for steps to reproduce; pause clock.",
    scope: "team",
    reply: "Hi {requester}, to help me track this down, could you share:\n\n• Exact steps to reproduce\n• Browser & OS\n• Any error messages or screenshots\n\nThanks!",
    status: "on_hold",
    addTags: ["awaiting-info"],
    shortcut: "2",
  },
  {
    name: "Escalate to manager",
    description: "Bump priority, internal note for handoff, tag urgent.",
    scope: "team",
    reply: "Escalating - customer impact is higher than initially scoped. Please review the thread and reassign if needed.",
    isInternal: true,
    priority: "high",
    addTags: ["urgent", "escalated"],
    shortcut: "3",
  },
  {
    name: "Resolve & thank",
    description: "Send resolution message and close the ticket.",
    scope: "personal",
    reply: "Hi {requester}, this should be sorted now. Please confirm everything is working on your end and I'll close this out. Thanks for your patience!",
    status: "resolved",
    addTags: ["resolved-by-agent"],
    shortcut: "4",
  },
  {
    name: "Mark as duplicate",
    description: "Internal note + close as duplicate.",
    scope: "team",
    reply: "Closing as duplicate - see related ticket for ongoing work.",
    isInternal: true,
    status: "closed",
    addTags: ["duplicate"],
  },
];

function uid(prefix = "macro") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function seed(): Macro[] {
  const now = new Date().toISOString();
  return SEED_MACROS.map((m) => ({ ...m, id: uid(), createdAt: now, updatedAt: now }));
}

export function readMacros(userId: string): Macro[] {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) {
      const seeded = seed();
      localStorage.setItem(KEY(userId), JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as Macro[];
  } catch {
    return seed();
  }
}

export function writeMacros(userId: string, list: Macro[]) {
  localStorage.setItem(KEY(userId), JSON.stringify(list));
}

export function upsertMacro(userId: string, m: Omit<Macro, "id" | "createdAt" | "updatedAt"> & Partial<Pick<Macro, "id">>): Macro {
  const list = readMacros(userId);
  const now = new Date().toISOString();
  if (m.id) {
    const idx = list.findIndex((x) => x.id === m.id);
    if (idx >= 0) {
      const next: Macro = { ...list[idx], ...m, id: list[idx].id, createdAt: list[idx].createdAt, updatedAt: now };
      list[idx] = next;
      writeMacros(userId, list);
      return next;
    }
  }
  const created: Macro = { ...m, id: uid(), createdAt: now, updatedAt: now };
  list.unshift(created);
  writeMacros(userId, list);
  return created;
}

export function deleteMacro(userId: string, id: string) {
  const list = readMacros(userId).filter((m) => m.id !== id);
  writeMacros(userId, list);
}

export function duplicateMacro(userId: string, id: string): Macro | null {
  const list = readMacros(userId);
  const src = list.find((m) => m.id === id);
  if (!src) return null;
  return upsertMacro(userId, { ...src, name: `${src.name} (copy)`, shortcut: undefined });
}

// ─── Apply a macro to a ticket ───────────────────────────────────────────────

export interface MacroVars {
  requester?: string;
  agent?: string;
  ticketNumber?: string;
  title?: string;
}

export function interpolate(template: string, vars: MacroVars): string {
  return template
    .replace(/\{requester\}/g, vars.requester ?? "there")
    .replace(/\{agent\}/g, vars.agent ?? "")
    .replace(/\{ticketNumber\}/g, vars.ticketNumber ?? "")
    .replace(/\{title\}/g, vars.title ?? "");
}

export interface RunMacroDeps {
  ticket: Ticket;
  vars: MacroVars;
  meId?: string;
  // Bound store actions
  addMessage: (id: string, body: string, isInternal: boolean) => void;
  setStatus: (id: string, status: TicketStatus) => void;
  setPriority: (id: string, priority: Priority) => void;
  setAssignee: (id: string, agentId: string | undefined) => void;
  setTags?: (id: string, tags: string[]) => void; // optional; if not provided we skip tag changes
}

export interface RunResult {
  changed: string[];        // human-readable summary of what changed
  replied: boolean;
}

export function runMacro(macro: Macro, deps: RunMacroDeps): RunResult {
  const { ticket, vars, meId } = deps;
  const changed: string[] = [];
  let replied = false;

  if (macro.reply && macro.reply.trim()) {
    deps.addMessage(ticket.id, interpolate(macro.reply, vars), !!macro.isInternal);
    changed.push(macro.isInternal ? "added internal note" : "sent reply");
    replied = true;
  }
  if (macro.status && macro.status !== ticket.status) {
    deps.setStatus(ticket.id, macro.status);
    changed.push(`status → ${macro.status}`);
  }
  if (macro.priority && macro.priority !== ticket.priority) {
    deps.setPriority(ticket.id, macro.priority);
    changed.push(`priority → ${macro.priority}`);
  }
  if (macro.assignee) {
    if (macro.assignee.kind === "current_user" && meId && ticket.assigneeId !== meId) {
      deps.setAssignee(ticket.id, meId);
      changed.push("assigned to me");
    } else if (macro.assignee.kind === "specific" && ticket.assigneeId !== macro.assignee.agentId) {
      deps.setAssignee(ticket.id, macro.assignee.agentId);
      changed.push("assignee updated");
    } else if (macro.assignee.kind === "unassign" && ticket.assigneeId) {
      deps.setAssignee(ticket.id, undefined);
      changed.push("unassigned");
    }
  }
  if (deps.setTags && (macro.addTags?.length || macro.removeTags?.length)) {
    const set = new Set(ticket.tags);
    macro.addTags?.forEach((t) => set.add(t));
    macro.removeTags?.forEach((t) => set.delete(t));
    deps.setTags(ticket.id, Array.from(set));
    if (macro.addTags?.length) changed.push(`tagged ${macro.addTags.map((t) => "#" + t).join(" ")}`);
    if (macro.removeTags?.length) changed.push(`untagged ${macro.removeTags.map((t) => "#" + t).join(" ")}`);
  }

  return { changed, replied };
}
