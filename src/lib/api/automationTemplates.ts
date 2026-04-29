import type { Rule } from "./automations";

export type RuleTemplate = {
  id: string;
  name: string;
  description: string;
  category: "Routing" | "Escalation" | "Notifications" | "Tagging" | "SLA";
  build: () => Omit<Rule, "id" | "createdAt" | "runCount" | "lastRunAt">;
};

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "tpl-vip",
    name: "VIP fast-track",
    description: "Tag and prioritize tickets from VIP customers automatically.",
    category: "Routing",
    build: () => ({
      name: "VIP fast-track",
      description: "Boost priority for tagged VIP customers",
      trigger: "ticket.created",
      matchAll: true,
      conditions: [{ id: crypto.randomUUID(), field: "tag", op: "equals", value: "vip" }],
      actions: [
        { id: crypto.randomUUID(), type: "set_priority", value: "high" },
        { id: crypto.randomUUID(), type: "send_notification", value: "VIP ticket received" },
      ],
      enabled: true,
    }),
  },
  {
    id: "tpl-roundrobin",
    name: "Round-robin assignment",
    description: "Distribute new tickets evenly across the support team.",
    category: "Routing",
    build: () => ({
      name: "Round-robin to support",
      trigger: "ticket.created",
      matchAll: true,
      conditions: [{ id: crypto.randomUUID(), field: "category", op: "equals", value: "Support" }],
      actions: [{ id: crypto.randomUUID(), type: "assign_team", value: "support" }],
      enabled: true,
    }),
  },
  {
    id: "tpl-stale",
    name: "Stale ticket reminder",
    description: "Notify the assignee when a ticket sits unassigned for over an hour.",
    category: "Notifications",
    build: () => ({
      name: "Notify on stale tickets",
      trigger: "ticket.unassigned_for",
      matchAll: true,
      conditions: [],
      actions: [{ id: crypto.randomUUID(), type: "send_notification", value: "Ticket awaiting assignment" }],
      enabled: true,
    }),
  },
  {
    id: "tpl-incident",
    name: "Incident war room",
    description: "Open an incident channel automatically for urgent outages.",
    category: "Escalation",
    build: () => ({
      name: "Auto war-room for incidents",
      trigger: "incident.opened",
      matchAll: true,
      conditions: [{ id: crypto.randomUUID(), field: "priority", op: "in", value: "urgent,high" }],
      actions: [
        { id: crypto.randomUUID(), type: "post_to_channel", value: "#incidents" },
        { id: crypto.randomUUID(), type: "escalate", value: "manager" },
      ],
      enabled: true,
    }),
  },
  {
    id: "tpl-sla",
    name: "SLA at-risk warning",
    description: "Ping the team channel when an SLA is about to breach.",
    category: "SLA",
    build: () => ({
      name: "SLA breach escalation",
      trigger: "ticket.sla_breached",
      matchAll: false,
      conditions: [{ id: crypto.randomUUID(), field: "priority", op: "in", value: "urgent,high" }],
      actions: [
        { id: crypto.randomUUID(), type: "post_to_channel", value: "#sla-watch" },
        { id: crypto.randomUUID(), type: "escalate", value: "manager" },
      ],
      enabled: true,
    }),
  },
  {
    id: "tpl-tag-network",
    name: "Auto-tag network issues",
    description: "Tag tickets mentioning network/wifi/vpn for triage.",
    category: "Tagging",
    build: () => ({
      name: "Auto-tag network keywords",
      trigger: "ticket.created",
      matchAll: false,
      conditions: [
        { id: crypto.randomUUID(), field: "title_contains", op: "contains", value: "wifi" },
        { id: crypto.randomUUID(), field: "title_contains", op: "contains", value: "vpn" },
        { id: crypto.randomUUID(), field: "title_contains", op: "contains", value: "network" },
      ],
      actions: [
        { id: crypto.randomUUID(), type: "add_tag", value: "network" },
        { id: crypto.randomUUID(), type: "set_category", value: "Network" },
      ],
      enabled: true,
    }),
  },
];
