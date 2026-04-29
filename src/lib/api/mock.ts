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
  const pa = getPlatformAdmin(u.id);
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    avatar_color: u.avatar_color,
    initials: u.initials,
    platform_role: pa?.role ?? null,
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
  const orgId = mems.length === 0
    ? ""
    : current_org_id && mems.some((m) => m.org_id === current_org_id)
      ? current_org_id
      : mems[0].org_id;
  return {
    token: `mock.${u.id}.${Date.now()}`,
    user: toAuthUser(u),
    memberships: mems,
    current_org_id: orgId,
  };
}

function requirePlatform(min: PlatformRole | "any" = "any"): SeedUser {
  const s = readSession();
  if (!s) err(401, "Not authenticated");
  const u = getUser(s!.user_id);
  if (!u) err(401, "User not found");
  const pa = getPlatformAdmin(u!.id);
  if (!pa) err(403, "Platform access required");
  if (min !== "any" && pa!.role !== min) err(403, `Requires platform role: ${min}`);
  return u!;
}

function logAudit(actor_id: string, action: string, opts: { target_org_id?: string; target_user_id?: string; metadata?: Record<string, unknown> } = {}) {
  SEED_AUDIT_LOG.unshift({
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    actor_id,
    action,
    target_org_id: opts.target_org_id ?? null,
    target_user_id: opts.target_user_id ?? null,
    metadata: opts.metadata,
    created_at: new Date().toISOString(),
  });
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

  // ---------- Platform (SaaS operator) endpoints ----------
  if (route === "GET /platform/orgs") {
    requirePlatform();
    const result = SEED_ORGS.map((o) => {
      const memberCount = SEED_USERS.filter((u) => u.memberships.some((m) => m.org_id === o.id)).length;
      return { ...o, member_count: memberCount };
    });
    return json(result) as Promise<T>;
  }

  if (route === "POST /platform/orgs/suspend") {
    const actor = requirePlatform("super_admin");
    const { org_id, reason } = (body as { org_id: string; reason?: string }) ?? {};
    const org = SEED_ORGS.find((o) => o.id === org_id);
    if (!org) err(404, "Org not found");
    org!.status = "suspended";
    org!.suspended_at = new Date().toISOString();
    org!.suspended_reason = reason ?? null;
    logAudit(actor.id, "org.suspend", { target_org_id: org_id, metadata: { reason } });
    return json(org!) as Promise<T>;
  }

  if (route === "POST /platform/orgs/resume") {
    const actor = requirePlatform("super_admin");
    const { org_id } = (body as { org_id: string }) ?? {};
    const org = SEED_ORGS.find((o) => o.id === org_id);
    if (!org) err(404, "Org not found");
    org!.status = "active";
    org!.suspended_at = null;
    org!.suspended_reason = null;
    logAudit(actor.id, "org.resume", { target_org_id: org_id });
    return json(org!) as Promise<T>;
  }

  if (route === "GET /platform/admins") {
    requirePlatform();
    const result = SEED_PLATFORM_ADMINS.filter((p) => p.is_active).map((p) => {
      const u = getUser(p.user_id);
      return { ...p, email: u?.email ?? "", full_name: u?.full_name ?? "", initials: u?.initials ?? "", avatar_color: u?.avatar_color ?? "#888" };
    });
    return json(result) as Promise<T>;
  }

  if (route === "GET /platform/audit") {
    requirePlatform();
    const result = SEED_AUDIT_LOG.slice(0, 100).map((e) => {
      const actor = getUser(e.actor_id);
      const org = e.target_org_id ? getOrg(e.target_org_id) : null;
      return { ...e, actor_name: actor?.full_name ?? e.actor_id, actor_email: actor?.email ?? "", target_org_name: org?.name ?? null };
    });
    return json(result) as Promise<T>;
  }

  if (route === "GET /platform/stats") {
    requirePlatform();
    const total_orgs = SEED_ORGS.length;
    const active_orgs = SEED_ORGS.filter((o) => o.status === "active").length;
    const suspended_orgs = total_orgs - active_orgs;
    const total_users = SEED_USERS.filter((u) => u.memberships.length > 0).length;
    const total_memberships = SEED_USERS.reduce((acc, u) => acc + u.memberships.length, 0);
    const by_plan = SEED_ORGS.reduce<Record<string, number>>((acc, o) => { acc[o.plan] = (acc[o.plan] || 0) + 1; return acc; }, {});
    return json({ total_orgs, active_orgs, suspended_orgs, total_users, total_memberships, by_plan }) as Promise<T>;
  }

  if (route === "GET /health") {
    return json({ status: "ok", mode: "mock" }) as Promise<T>;
  }

  console.warn(`[mock] no handler for ${route}`);
  await delay(80);
  return (Array.isArray(body) ? [] : {}) as T;
}

export const mockSession = { read: readSession, write: writeSession };
