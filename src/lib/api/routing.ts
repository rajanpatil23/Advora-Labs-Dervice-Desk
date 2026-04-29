// Smart routing: rule-based + skill/load scoring for ticket auto-assignment
import type { Agent, Ticket, Priority } from "@/lib/types";

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number; // lower = evaluated first
  conditions: {
    priorities?: Priority[];
    categories?: string[];
    channels?: ("email" | "chat" | "portal" | "phone")[];
    keywords?: string[]; // any match in title/description
    teams?: string[];   // restrict assignment to these teams
  };
  action: {
    requireSkills?: string[];
    preferTeam?: string;
    strategy: "least_busy" | "round_robin" | "highest_rated" | "fastest_resolver";
  };
}

export interface AgentSkillProfile {
  agentId: string;
  skills: string[];        // e.g. "billing", "vpn", "macos"
  maxConcurrent: number;   // capacity
  awayUntil?: string;      // ISO - treated as offline
}

export interface RoutingDecision {
  ticketId: string;
  matchedRuleId?: string;
  candidateAgentId?: string;
  candidateName?: string;
  reasoning: string[];
  score?: number;
}

const RULES_KEY = "routing_rules_v1";
const SKILLS_KEY = "agent_skills_v1";
const ROUND_ROBIN_KEY = "routing_rr_pointer_v1";

function read<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }

export function listRules(): RoutingRule[] {
  const existing = read<RoutingRule[]>(RULES_KEY, []);
  if (existing.length) return existing.sort((a, b) => a.priority - b.priority);
  // Seed defaults
  const seeded: RoutingRule[] = [
    {
      id: "rule_critical",
      name: "Critical → highest rated, on-call",
      enabled: true,
      priority: 10,
      conditions: { priorities: ["critical"] },
      action: { strategy: "highest_rated" },
    },
    {
      id: "rule_billing",
      name: "Billing tickets → Billing team",
      enabled: true,
      priority: 20,
      conditions: { keywords: ["invoice", "refund", "billing", "payment"] },
      action: { requireSkills: ["billing"], preferTeam: "Billing", strategy: "least_busy" },
    },
    {
      id: "rule_chat",
      name: "Live chat → fastest resolver",
      enabled: true,
      priority: 30,
      conditions: { channels: ["chat"] },
      action: { strategy: "fastest_resolver" },
    },
    {
      id: "rule_default",
      name: "Default round-robin",
      enabled: true,
      priority: 100,
      conditions: {},
      action: { strategy: "round_robin" },
    },
  ];
  write(RULES_KEY, seeded);
  return seeded;
}

export function saveRules(rules: RoutingRule[]) {
  write(RULES_KEY, rules);
}

export function listSkills(): AgentSkillProfile[] {
  return read<AgentSkillProfile[]>(SKILLS_KEY, []);
}

export function saveSkills(profiles: AgentSkillProfile[]) {
  write(SKILLS_KEY, profiles);
}

export function getSkillsFor(agentId: string): AgentSkillProfile {
  const all = listSkills();
  return all.find(s => s.agentId === agentId) ?? { agentId, skills: [], maxConcurrent: 10 };
}

export function setSkillsFor(profile: AgentSkillProfile) {
  const all = listSkills().filter(s => s.agentId !== profile.agentId);
  all.push(profile);
  saveSkills(all);
}

function ruleMatches(rule: RoutingRule, ticket: Ticket): boolean {
  if (!rule.enabled) return false;
  const c = rule.conditions;
  if (c.priorities?.length && !c.priorities.includes(ticket.priority)) return false;
  if (c.categories?.length && !c.categories.includes(ticket.category)) return false;
  if (c.channels?.length && !c.channels.includes(ticket.channel)) return false;
  if (c.keywords?.length) {
    const haystack = `${ticket.title} ${ticket.description ?? ""}`.toLowerCase();
    if (!c.keywords.some(k => haystack.includes(k.toLowerCase()))) return false;
  }
  return true;
}

function isAvailable(a: Agent): boolean {
  if (!a.online) return false;
  const skills = getSkillsFor(a.id);
  if (skills.awayUntil && new Date(skills.awayUntil) > new Date()) return false;
  if (a.workload >= skills.maxConcurrent) return false;
  return true;
}

function rrPickIndex(poolKey: string, size: number): number {
  if (size === 0) return -1;
  const ptrs = read<Record<string, number>>(ROUND_ROBIN_KEY, {});
  const next = ((ptrs[poolKey] ?? -1) + 1) % size;
  ptrs[poolKey] = next;
  write(ROUND_ROBIN_KEY, ptrs);
  return next;
}

export function routeTicket(ticket: Ticket, agents: Agent[]): RoutingDecision {
  const decision: RoutingDecision = { ticketId: ticket.id, reasoning: [] };
  if (ticket.assigneeId) {
    decision.reasoning.push(`Already assigned to ${ticket.assigneeId}`);
    decision.candidateAgentId = ticket.assigneeId;
    return decision;
  }

  const rules = listRules();
  const rule = rules.find(r => ruleMatches(r, ticket));
  if (!rule) {
    decision.reasoning.push("No matching rule");
    return decision;
  }
  decision.matchedRuleId = rule.id;
  decision.reasoning.push(`Matched rule: ${rule.name}`);

  // Candidate pool
  let pool = agents.filter(isAvailable);
  decision.reasoning.push(`${pool.length} available agents (online, under capacity)`);

  if (rule.action.preferTeam) {
    const teamPool = pool.filter(a => a.team === rule.action.preferTeam);
    if (teamPool.length) {
      pool = teamPool;
      decision.reasoning.push(`Filtered to team "${rule.action.preferTeam}": ${pool.length}`);
    }
  }

  if (rule.action.requireSkills?.length) {
    const required = rule.action.requireSkills;
    pool = pool.filter(a => {
      const sk = getSkillsFor(a.id).skills;
      return required.every(s => sk.includes(s));
    });
    decision.reasoning.push(`Filtered by skills [${required.join(", ")}]: ${pool.length}`);
  }

  if (pool.length === 0) {
    decision.reasoning.push("No agents in pool - leaving unassigned");
    return decision;
  }

  let pick: Agent | undefined;
  let score = 0;
  switch (rule.action.strategy) {
    case "least_busy": {
      pool.sort((a, b) => a.workload - b.workload);
      pick = pool[0];
      score = 100 - pick.workload * 5;
      decision.reasoning.push(`Least busy: ${pick.name} (load ${pick.workload})`);
      break;
    }
    case "highest_rated": {
      pool.sort((a, b) => b.rating - a.rating);
      pick = pool[0];
      score = pick.rating * 20;
      decision.reasoning.push(`Highest rated: ${pick.name} (${pick.rating}★)`);
      break;
    }
    case "fastest_resolver": {
      pool.sort((a, b) => a.avgResolution - b.avgResolution);
      pick = pool[0];
      score = Math.max(0, 100 - pick.avgResolution);
      decision.reasoning.push(`Fastest resolver: ${pick.name} (~${pick.avgResolution}h avg)`);
      break;
    }
    case "round_robin":
    default: {
      const key = `${rule.id}_${pool.map(a => a.id).join(",")}`;
      const idx = rrPickIndex(key, pool.length);
      pick = pool[idx];
      score = 50;
      decision.reasoning.push(`Round-robin pick #${idx + 1}: ${pick.name}`);
      break;
    }
  }

  if (pick) {
    decision.candidateAgentId = pick.id;
    decision.candidateName = pick.name;
    decision.score = Math.round(score);
  }
  return decision;
}

export function bulkRoute(tickets: Ticket[], agents: Agent[]): RoutingDecision[] {
  return tickets
    .filter(t => !t.assigneeId && t.status !== "closed" && t.status !== "resolved")
    .map(t => routeTicket(t, agents));
}
