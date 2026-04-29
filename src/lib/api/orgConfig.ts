/**
 * Org configuration & onboarding state.
 * Persisted to localStorage keyed by org_id (mock layer).
 * The real backend would store these on the organizations / org_settings tables.
 */

export interface BusinessHours {
  timezone: string;
  workdays: number[]; // 0=Sun..6=Sat
  start: string; // "09:00"
  end: string;   // "18:00"
}

export interface SlaDefaults {
  priority: "low" | "medium" | "high" | "urgent";
  response_minutes: number;
  resolve_minutes: number;
}

export interface PendingInvite {
  email: string;
  role: "admin" | "manager" | "agent" | "resolver" | "requester";
}

export interface OrgConfig {
  org_id: string;
  // step 1 — profile
  display_name: string;
  industry: string;
  size: string;
  logo_url: string | null;
  primary_color: string;
  // step 2 — invites
  pending_invites: PendingInvite[];
  // step 3 — categories
  categories: string[];
  // step 4 — SLA
  sla_defaults: SlaDefaults[];
  // step 5 — business hours
  business_hours: BusinessHours;
  // lifecycle
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = (orgId: string) => `connecttly.org_config.${orgId}`;

const DEFAULT_SLA: SlaDefaults[] = [
  { priority: "urgent", response_minutes: 15, resolve_minutes: 240 },
  { priority: "high",   response_minutes: 60, resolve_minutes: 480 },
  { priority: "medium", response_minutes: 240, resolve_minutes: 1440 },
  { priority: "low",    response_minutes: 480, resolve_minutes: 2880 },
];

const DEFAULT_HOURS: BusinessHours = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  workdays: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "18:00",
};

const DEFAULT_CATEGORIES = [
  "Hardware",
  "Software",
  "Network & Connectivity",
  "Account & Access",
  "Email & Collaboration",
  "Other",
];

export function defaultConfig(orgId: string, orgName = ""): OrgConfig {
  const now = new Date().toISOString();
  return {
    org_id: orgId,
    display_name: orgName,
    industry: "Technology",
    size: "11-50",
    logo_url: null,
    primary_color: "#6366f1",
    pending_invites: [],
    categories: [...DEFAULT_CATEGORIES],
    sla_defaults: DEFAULT_SLA.map((s) => ({ ...s })),
    business_hours: { ...DEFAULT_HOURS },
    onboarding_completed_at: null,
    created_at: now,
    updated_at: now,
  };
}

export const orgConfigApi = {
  get(orgId: string, fallbackName = ""): OrgConfig {
    try {
      const raw = localStorage.getItem(KEY(orgId));
      if (raw) return JSON.parse(raw) as OrgConfig;
    } catch { /* ignore */ }
    const cfg = defaultConfig(orgId, fallbackName);
    localStorage.setItem(KEY(orgId), JSON.stringify(cfg));
    return cfg;
  },

  save(orgId: string, patch: Partial<OrgConfig>): OrgConfig {
    const current = orgConfigApi.get(orgId);
    const next: OrgConfig = { ...current, ...patch, org_id: orgId, updated_at: new Date().toISOString() };
    localStorage.setItem(KEY(orgId), JSON.stringify(next));
    return next;
  },

  complete(orgId: string): OrgConfig {
    return orgConfigApi.save(orgId, { onboarding_completed_at: new Date().toISOString() });
  },

  reset(orgId: string) {
    localStorage.removeItem(KEY(orgId));
  },

  isOnboarded(orgId: string): boolean {
    return !!orgConfigApi.get(orgId).onboarding_completed_at;
  },
};
