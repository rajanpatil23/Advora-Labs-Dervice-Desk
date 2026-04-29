import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { authApi, type AuthUser, type Membership, type AppRole } from "@/lib/api/auth";
import { tokenStore } from "@/lib/api/client";

export type { AppRole };

interface AuthCtx {
  user: AuthUser | null;
  profile: AuthUser | null; // alias for backwards compat with existing components
  memberships: Membership[];
  currentOrgId: string | null;
  currentRole: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  hasRole: (...roles: AppRole[]) => boolean;
  // Called by Login / SignUp pages after a successful auth call
  setSessionUser: (user: AuthUser) => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [me, mems] = await Promise.all([authApi.me(), authApi.memberships()]);
      setUser(me);
      setMemberships(mems);
    } catch {
      setUser(null);
      setMemberships([]);
      tokenStore.clear();
    }
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const setSessionUser = useCallback((u: AuthUser) => {
    setUser(u);
    setMemberships([
      {
        id: `mem_${u.id}`,
        org_id: u.org_id,
        org_name: u.org_name,
        role: u.role,
        team_id: u.team_id,
        team_name: u.team_name,
        is_active: true,
      },
    ]);
  }, []);

  const refresh = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  const signOut = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    tokenStore.clear();
    setUser(null);
    setMemberships([]);
  }, []);

  const switchOrg = useCallback(async (_orgId: string) => {
    // Single-org demo; refresh to keep API parity.
    await refresh();
  }, [refresh]);

  const currentOrgId = user?.org_id ?? memberships[0]?.org_id ?? null;
  const currentRole =
    memberships.find((m) => m.org_id === currentOrgId)?.role ?? user?.role ?? null;

  const hasRole = useCallback(
    (...roles: AppRole[]) => (currentRole ? roles.includes(currentRole) : false),
    [currentRole],
  );

  return (
    <Ctx.Provider
      value={{
        user,
        profile: user,
        memberships,
        currentOrgId,
        currentRole,
        loading,
        refresh,
        signOut,
        switchOrg,
        hasRole,
        setSessionUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
