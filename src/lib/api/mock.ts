/**
 * Mock backend that resolves API requests in-browser.
 * Mirrors the contract documented in API_CONTRACT.md.
 */

import type { ApiRequest } from "./client";
import {
  SEED_USERS, SEED_ORGS, SEED_PLATFORM_ADMINS, SEED_AUDIT_LOG,
  getOrg, getTeam, getPlatformAdmin, getUser,
  type SeedUser, type PlatformRole, type SeedAuditEntry,
} from "./seedUsers";
import type { AuthUser, Membership, Session } from "./auth";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const json = async <T>(data: T): Promise<T> => {
  await delay(120 + Math.random() * 120);
  return data;
};

const err = (status: number, message: string): never => {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  throw e;
};

// --- session storage -----------------------------------------------------
const SESSION_KEY = "connecttly.auth.session";

interface MockSession {
  token: string;
  user_id: string;
  current_org_id: string;
}

function readSession(): MockSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function writeSession(s: MockSession | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

function toAuthUser(u: SeedUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    avatar_color: u.avatar_color,
    initials: u.initials,
  };
}

function membershipsFor(u: SeedUser): Membership[] {
  return u.memberships.map((m) => {
    const org = getOrg(m.org_id)!;
    const team = m.team_id ? getTeam(m.team_id) : null;
    return {
      id: `mem_${u.id}_${m.org_id}`,
      org_id: m.org_id,
      org_name: org.name,
      org_slug: org.slug,
      org_industry: org.industry,
      role: m.role,
      team_id: m.team_id,
      team_name: team?.name ?? null,
      is_active: true,
    };
  });
}

function buildSession(u: SeedUser, current_org_id?: string): Session {
  const mems = membershipsFor(u);
  const orgId = current_org_id && mems.some((m) => m.org_id === current_org_id)
    ? current_org_id
    : mems[0].org_id;
  return {
    token: `mock.${u.id}.${Date.now()}`,
    user: toAuthUser(u),
    memberships: mems,
    current_org_id: orgId,
  };
}

// --- handlers ------------------------------------------------------------
export async function mockHandlers<T>(req: ApiRequest): Promise<T> {
  const { method, path, body } = req;
  const route = `${method} ${path}`;

  // ---------- Auth ----------
  if (route === "POST /auth/login") {
    const { email, password } = (body as { email: string; password: string }) ?? {};
    const user = SEED_USERS.find((u) => u.email === email && u.password === password);
    if (!user) err(401, "Invalid email or password");
    const session = buildSession(user!);
    writeSession({ token: session.token, user_id: user!.id, current_org_id: session.current_org_id });
    return json(session) as Promise<T>;
  }

  if (route === "POST /auth/signup") {
    const { email, password, full_name, org_name } = (body as { email: string; password: string; full_name: string; org_name?: string }) ?? {};
    if (SEED_USERS.some((u) => u.email === email)) err(409, "Email already registered");
    const newOrgId = `org_${Date.now()}`;
    const newOrgName = org_name?.trim() || `${(full_name || email.split("@")[0])}'s workspace`;
    SEED_ORGS.push({
      id: newOrgId,
      name: newOrgName,
      slug: newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      industry: "Custom",
      domain: email.split("@")[1] ?? "example.com",
      status: "active",
      created_at: new Date().toISOString().slice(0, 10),
      plan: "free",
    });
    const newUser: SeedUser = {
      id: `u_${Date.now()}`,
      email,
      password: password ?? "demo",
      full_name: full_name || email.split("@")[0],
      avatar_color: "#6366f1",
      initials: (full_name || email).slice(0, 2).toUpperCase(),
      memberships: [{ org_id: newOrgId, role: "owner", team_id: null }],
    };
    SEED_USERS.push(newUser);
    const session = buildSession(newUser);
    writeSession({ token: session.token, user_id: newUser.id, current_org_id: session.current_org_id });
    return json(session) as Promise<T>;
  }

  if (route === "POST /auth/logout") {
    writeSession(null);
    return json(undefined) as Promise<T>;
  }

  if (route === "GET /auth/me") {
    const s = readSession();
    if (!s) err(401, "Not authenticated");
    const u = SEED_USERS.find((x) => x.id === s!.user_id);
    if (!u) err(401, "User not found");
    return json(toAuthUser(u!)) as Promise<T>;
  }

  if (route === "GET /auth/memberships") {
    const s = readSession();
    if (!s) err(401, "Not authenticated");
    const u = SEED_USERS.find((x) => x.id === s!.user_id);
    if (!u) err(401, "User not found");
    return json(membershipsFor(u!)) as Promise<T>;
  }

  if (route === "POST /auth/switch-org") {
    const s = readSession();
    if (!s) err(401, "Not authenticated");
    const { org_id } = (body as { org_id: string }) ?? {};
    const u = SEED_USERS.find((x) => x.id === s!.user_id);
    if (!u || !u.memberships.some((m) => m.org_id === org_id)) err(403, "Not a member of that org");
    writeSession({ ...s!, current_org_id: org_id });
    return json({ current_org_id: org_id }) as Promise<T>;
  }

  if (route === "GET /health") {
    return json({ status: "ok", mode: "mock" }) as Promise<T>;
  }

  console.warn(`[mock] no handler for ${route}`);
  await delay(80);
  return (Array.isArray(body) ? [] : {}) as T;
}

export const mockSession = { read: readSession, write: writeSession };
