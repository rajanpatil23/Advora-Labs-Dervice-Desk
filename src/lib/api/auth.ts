import { apiCall, tokenStore } from "./client";
import type { AuthUser, AppRole } from "./seedUsers";

export type { AuthUser, AppRole };

export interface Membership {
  id: string;
  org_id: string;
  org_name: string;
  role: AppRole;
  team_id: string | null;
  team_name: string | null;
  is_active: boolean;
}

export interface Session {
  token: string;
  user: AuthUser;
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

  signup: async (email: string, password: string, full_name: string) => {
    const session = await apiCall<Session>({
      method: "POST",
      path: "/auth/signup",
      body: { email, password, full_name },
    });
    tokenStore.set(session.token);
    return session;
  },

  logout: async () => {
    await apiCall<void>({ method: "POST", path: "/auth/logout", auth: true });
    tokenStore.clear();
  },

  me: () => apiCall<AuthUser>({ method: "GET", path: "/auth/me", auth: true }),

  memberships: () =>
    apiCall<Membership[]>({ method: "GET", path: "/auth/memberships", auth: true }),
};
