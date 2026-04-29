import { apiCall, tokenStore } from "./client";
import type { AppRole, PlatformRole } from "./seedUsers";

export type { AppRole, PlatformRole };

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_color: string;
  initials: string;
  platform_role: PlatformRole | null;
}

export interface Membership {
  id: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  org_industry: string;
  role: AppRole;
  team_id: string | null;
  team_name: string | null;
  is_active: boolean;
}

export interface Session {
  token: string;
  user: AuthUser;
  memberships: Membership[];
  current_org_id: string;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const session = await apiCall<Session>({
      method: "POST",
      path: "/auth/login",
      body: { email, password },
    });
    tokenStore.set(session.token);
    return session;
  },

  signup: async (email: string, password: string, full_name: string, org_name: string) => {
    const session = await apiCall<Session>({
      method: "POST",
      path: "/auth/signup",
      body: { email, password, full_name, org_name },
    });
    tokenStore.set(session.token);
    return session;
  },

  logout: async () => {
    try { await apiCall<void>({ method: "POST", path: "/auth/logout", auth: true }); } catch { /* ignore */ }
    tokenStore.clear();
  },

  me: () => apiCall<AuthUser>({ method: "GET", path: "/auth/me", auth: true }),

  memberships: () => apiCall<Membership[]>({ method: "GET", path: "/auth/memberships", auth: true }),

  switchOrg: (org_id: string) =>
    apiCall<{ current_org_id: string }>({
      method: "POST",
      path: "/auth/switch-org",
      body: { org_id },
      auth: true,
    }),
};
