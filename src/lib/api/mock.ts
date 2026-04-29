/**
 * Mock backend that resolves API requests against in-memory + localStorage data.
 * Mirrors the contract documented in API_CONTRACT.md exactly.
 */

import type { ApiRequest } from "./client";
import { SEED_USERS, DEMO_ORG, type AuthUser, type AppRole } from "./seedUsers";

// --- helpers -------------------------------------------------------------
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const json = async <T>(data: T): Promise<T> => {
  await delay(150 + Math.random() * 150);
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
  user: AuthUser;
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

// --- handlers ------------------------------------------------------------
export async function mockHandlers<T>(req: ApiRequest): Promise<T> {
  const { method, path, body } = req;
  const route = `${method} ${path}`;

  // ---------- Auth ----------
  if (route === "POST /auth/login") {
    const { email, password } = (body as { email: string; password: string }) ?? {};
    const user = SEED_USERS.find((u) => u.email === email && u.password === password);
    if (!user) err(401, "Invalid email or password");
    const { password: _pw, ...safeUser } = user!;
    const session: MockSession = {
      token: `mock.${user!.id}.${Date.now()}`,
      user: safeUser,
    };
    writeSession(session);
    return json(session) as Promise<T>;
  }

  if (route === "POST /auth/signup") {
    const { email, password, full_name } = (body as { email: string; password: string; full_name: string }) ?? {};
    if (SEED_USERS.some((u) => u.email === email)) err(409, "Email already registered");
    const newUser: AuthUser = {
      id: `u_${Date.now()}`,
      email,
      full_name: full_name || email.split("@")[0],
      avatar_color: "#6366f1",
      initials: (full_name || email).slice(0, 2).toUpperCase(),
      role: "admin", // first signup becomes admin of a new org
      org_id: `org_${Date.now()}`,
      org_name: `${full_name || email.split("@")[0]}'s workspace`,
      team_id: null,
      team_name: null,
    };
    void password; // not validated in mock
    const session: MockSession = { token: `mock.${newUser.id}.${Date.now()}`, user: newUser };
    writeSession(session);
    return json(session) as Promise<T>;
  }

  if (route === "POST /auth/logout") {
    writeSession(null);
    return json(undefined) as Promise<T>;
  }

  if (route === "GET /auth/me") {
    const s = readSession();
    if (!s) err(401, "Not authenticated");
    return json(s!.user) as Promise<T>;
  }

  if (route === "GET /auth/memberships") {
    const s = readSession();
    if (!s) err(401, "Not authenticated");
    return json([
      {
        id: `mem_${s!.user.id}`,
        org_id: s!.user.org_id,
        org_name: s!.user.org_name,
        role: s!.user.role as AppRole,
        team_id: s!.user.team_id,
        team_name: s!.user.team_name,
        is_active: true,
      },
    ]) as Promise<T>;
  }

  // ---------- Echo / health ----------
  if (route === "GET /health") {
    return json({ status: "ok", mode: "mock" }) as Promise<T>;
  }

  // ---------- Catch-all ----------
  // Tickets, incidents, requests, KB, SLA, agents, users, logs are still served
  // directly via Zustand store (src/lib/store.ts) for now. When the local AI agent
  // implements the backend, those pages can swap to apiCall() one by one.
  console.warn(`[mock] no handler for ${route} — returning empty result`);
  await delay(100);
  return (Array.isArray(body) ? [] : {}) as T;
}

// Expose for AuthContext bootstrapping
export const mockSession = { read: readSession, write: writeSession };
export { DEMO_ORG };
