// Seeded demo accounts for the dummy auth.
// In production these will be replaced by real users from the backend.

export type AppRole = "admin" | "manager" | "agent" | "resolver" | "requester";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_color: string;
  initials: string;
  role: AppRole;
  org_id: string;
  org_name: string;
  team_id: string | null;
  team_name: string | null;
}

export const DEMO_ORG = { id: "org_acme", name: "Acme Cloud", slug: "acme" };

// Password for ALL demo accounts: "demo"
export const SEED_USERS: (AuthUser & { password: string })[] = [
  {
    id: "u_admin",
    email: "admin@demo.com",
    password: "demo",
    full_name: "Alex Admin",
    avatar_color: "#6366f1",
    initials: "AA",
    role: "admin",
    org_id: DEMO_ORG.id,
    org_name: DEMO_ORG.name,
    team_id: "team_ops",
    team_name: "Operations",
  },
  {
    id: "u_manager",
    email: "manager@demo.com",
    password: "demo",
    full_name: "Morgan Manager",
    avatar_color: "#f97316",
    initials: "MM",
    role: "manager",
    org_id: DEMO_ORG.id,
    org_name: DEMO_ORG.name,
    team_id: "team_support",
    team_name: "Support",
  },
  {
    id: "u_agent",
    email: "agent@demo.com",
    password: "demo",
    full_name: "Avery Agent",
    avatar_color: "#22c55e",
    initials: "AG",
    role: "agent",
    org_id: DEMO_ORG.id,
    org_name: DEMO_ORG.name,
    team_id: "team_support",
    team_name: "Support",
  },
  {
    id: "u_resolver",
    email: "resolver@demo.com",
    password: "demo",
    full_name: "Riley Resolver",
    avatar_color: "#0ea5e9",
    initials: "RR",
    role: "resolver",
    org_id: DEMO_ORG.id,
    org_name: DEMO_ORG.name,
    team_id: "team_eng",
    team_name: "Engineering",
  },
  {
    id: "u_requester",
    email: "requester@demo.com",
    password: "demo",
    full_name: "Quinn Requester",
    avatar_color: "#ec4899",
    initials: "QR",
    role: "requester",
    org_id: DEMO_ORG.id,
    org_name: DEMO_ORG.name,
    team_id: null,
    team_name: null,
  },
];
