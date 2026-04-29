// Seeded multi-tenant data: 3 organizations + users with cross-org memberships,
// PLUS a separate platform-staff layer (super_admin / support / billing_admin).

export type AppRole = "owner" | "admin" | "manager" | "agent" | "resolver" | "requester";
export type PlatformRole = "super_admin" | "support" | "billing_admin";
export type OrgStatus = "active" | "suspended";

export interface SeedOrg {
  id: string;
  name: string;
  slug: string;
  industry: string;
  domain: string;
}

export interface SeedTeam {
  id: string;
  org_id: string;
  name: string;
}

export interface SeedMembership {
  org_id: string;
  role: AppRole;
  team_id: string | null;
}

export interface SeedUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  avatar_color: string;
  initials: string;
  memberships: SeedMembership[]; // first one is the default
}

// ---- Orgs ----
export interface SeedOrgFull extends SeedOrg {
  status: OrgStatus;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  created_at: string;
  plan: "free" | "pro" | "enterprise";
}

export const SEED_ORGS: SeedOrgFull[] = [
  { id: "org_acme",    name: "Acme Cloud",        slug: "acme",    industry: "SaaS / Tech",   domain: "acme.com",    status: "active", created_at: "2024-09-12", plan: "enterprise" },
  { id: "org_globex",  name: "Globex Industries", slug: "globex",  industry: "Manufacturing", domain: "globex.com",  status: "active", created_at: "2025-01-04", plan: "pro" },
  { id: "org_initech", name: "Initech Health",    slug: "initech", industry: "Healthcare",    domain: "initech.com", status: "active", created_at: "2025-06-22", plan: "pro" },
];

// ---- Teams (per org) ----
export const SEED_TEAMS: SeedTeam[] = [
  // Acme
  { id: "team_acme_support", org_id: "org_acme",    name: "Customer Support" },
  { id: "team_acme_eng",     org_id: "org_acme",    name: "Engineering" },
  { id: "team_acme_sec",     org_id: "org_acme",    name: "Security" },
  // Globex
  { id: "team_globex_ops",   org_id: "org_globex",  name: "Plant Operations" },
  { id: "team_globex_it",    org_id: "org_globex",  name: "IT Support" },
  // Initech
  { id: "team_initech_clin", org_id: "org_initech", name: "Clinical Apps" },
  { id: "team_initech_help", org_id: "org_initech", name: "Help Desk" },
];

// ---- Users (with cross-org memberships) ----
// Password for everyone: "demo"
export const SEED_USERS: SeedUser[] = [
  {
    id: "u_admin",
    email: "admin@demo.com",
    password: "demo",
    full_name: "Alex Admin",
    avatar_color: "#6366f1",
    initials: "AA",
    memberships: [
      { org_id: "org_acme",   role: "owner", team_id: "team_acme_support" },
      { org_id: "org_globex", role: "admin", team_id: "team_globex_it" },
    ],
  },
  {
    id: "u_manager",
    email: "manager@demo.com",
    password: "demo",
    full_name: "Morgan Manager",
    avatar_color: "#f97316",
    initials: "MM",
    memberships: [
      { org_id: "org_acme",    role: "manager", team_id: "team_acme_support" },
      { org_id: "org_initech", role: "manager", team_id: "team_initech_help" },
    ],
  },
  {
    id: "u_agent",
    email: "agent@demo.com",
    password: "demo",
    full_name: "Avery Agent",
    avatar_color: "#22c55e",
    initials: "AG",
    memberships: [
      { org_id: "org_acme", role: "agent", team_id: "team_acme_support" },
    ],
  },
  {
    id: "u_resolver",
    email: "resolver@demo.com",
    password: "demo",
    full_name: "Riley Resolver",
    avatar_color: "#0ea5e9",
    initials: "RR",
    memberships: [
      { org_id: "org_globex",  role: "resolver", team_id: "team_globex_ops" },
      { org_id: "org_initech", role: "resolver", team_id: "team_initech_clin" },
    ],
  },
  {
    id: "u_requester",
    email: "requester@demo.com",
    password: "demo",
    full_name: "Quinn Requester",
    avatar_color: "#ec4899",
    initials: "QR",
    memberships: [
      { org_id: "org_acme", role: "requester", team_id: null },
    ],
  },
];

export function getOrg(id: string) {
  return SEED_ORGS.find((o) => o.id === id);
}
export function getTeam(id: string) {
  return SEED_TEAMS.find((t) => t.id === id);
}
