// Frontend-only notification preferences. Persisted to localStorage per user.
// Backend agent: replace with API; keep the shape stable.

export type Channel = "inApp" | "email" | "slack";
export type DigestFrequency = "off" | "realtime" | "hourly" | "daily" | "weekly";

export type NotificationEventKey =
  | "ticket_assigned"
  | "ticket_mentioned"
  | "ticket_updated"
  | "ticket_resolved"
  | "sla_breach_warning"
  | "sla_breached"
  | "incident_created"
  | "incident_updated"
  | "approval_requested"
  | "approval_decided"
  | "csat_received"
  | "kb_comment";

export type EventDefinition = {
  key: NotificationEventKey;
  label: string;
  description: string;
  group: "Tickets" | "SLA" | "Incidents" | "Approvals" | "Other";
  defaults: Record<Channel, boolean>;
};

export const EVENT_DEFINITIONS: EventDefinition[] = [
  { key: "ticket_assigned",   label: "Ticket assigned to me",     description: "When a ticket is routed or manually assigned to you.", group: "Tickets",   defaults: { inApp: true,  email: true,  slack: true  } },
  { key: "ticket_mentioned",  label: "Mentioned in a ticket",     description: "When someone @mentions you in a ticket comment.",      group: "Tickets",   defaults: { inApp: true,  email: true,  slack: false } },
  { key: "ticket_updated",    label: "Updates on my tickets",     description: "Status changes, priority changes, new comments.",      group: "Tickets",   defaults: { inApp: true,  email: false, slack: false } },
  { key: "ticket_resolved",   label: "My tickets resolved",       description: "When a ticket you reported or own is resolved.",       group: "Tickets",   defaults: { inApp: true,  email: true,  slack: false } },
  { key: "sla_breach_warning",label: "SLA at risk",               description: "When a ticket is approaching SLA breach.",             group: "SLA",       defaults: { inApp: true,  email: true,  slack: true  } },
  { key: "sla_breached",      label: "SLA breached",              description: "When a ticket has missed its SLA target.",             group: "SLA",       defaults: { inApp: true,  email: true,  slack: true  } },
  { key: "incident_created",  label: "New incident",              description: "When a new incident is declared in your org.",         group: "Incidents", defaults: { inApp: true,  email: true,  slack: true  } },
  { key: "incident_updated",  label: "Incident updates",          description: "Status changes on active incidents.",                  group: "Incidents", defaults: { inApp: true,  email: false, slack: true  } },
  { key: "approval_requested",label: "Approval requested",        description: "When you are asked to approve a request.",             group: "Approvals", defaults: { inApp: true,  email: true,  slack: false } },
  { key: "approval_decided",  label: "Approval decision",         description: "When an approval you requested is decided.",           group: "Approvals", defaults: { inApp: true,  email: true,  slack: false } },
  { key: "csat_received",     label: "CSAT response received",    description: "When a customer submits satisfaction feedback.",       group: "Other",     defaults: { inApp: true,  email: false, slack: false } },
  { key: "kb_comment",        label: "Knowledge base comment",    description: "Comments on articles you authored or follow.",         group: "Other",     defaults: { inApp: true,  email: false, slack: false } },
];

export type QuietHours = {
  enabled: boolean;
  start: string; // "22:00"
  end: string;   // "07:00"
  timezone: string;
};

export type NotificationPrefs = {
  matrix: Record<NotificationEventKey, Record<Channel, boolean>>;
  digest: {
    inApp: DigestFrequency;
    email: DigestFrequency;
    slack: DigestFrequency;
  };
  quietHours: QuietHours;
  mutedUntil?: string; // ISO timestamp; mute all
  emailAddress?: string;
  slackHandle?: string;
};

const KEY = (userId: string) => `lov.notifications.v1.${userId}`;

export function defaultPrefs(): NotificationPrefs {
  const matrix = {} as NotificationPrefs["matrix"];
  EVENT_DEFINITIONS.forEach((e) => { matrix[e.key] = { ...e.defaults }; });
  return {
    matrix,
    digest: { inApp: "realtime", email: "daily", slack: "realtime" },
    quietHours: { enabled: false, start: "22:00", end: "07:00", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  };
}

export function readPrefs(userId: string): NotificationPrefs {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw);
    const base = defaultPrefs();
    // merge to handle new event keys added later
    return {
      ...base,
      ...parsed,
      matrix: { ...base.matrix, ...(parsed.matrix ?? {}) },
      digest: { ...base.digest, ...(parsed.digest ?? {}) },
      quietHours: { ...base.quietHours, ...(parsed.quietHours ?? {}) },
    };
  } catch {
    return defaultPrefs();
  }
}

export function writePrefs(userId: string, prefs: NotificationPrefs) {
  localStorage.setItem(KEY(userId), JSON.stringify(prefs));
}

export const MUTE_PRESETS: { label: string; minutes: number }[] = [
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "4 hours", minutes: 240 },
  { label: "Until tomorrow", minutes: 60 * 12 },
  { label: "1 week", minutes: 60 * 24 * 7 },
];

export function isMuted(prefs: NotificationPrefs): boolean {
  if (!prefs.mutedUntil) return false;
  return new Date(prefs.mutedUntil).getTime() > Date.now();
}
