import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { authApi, type AuthUser, type Membership, type AppRole, type PlatformRole, type Session } from "@/lib/api/auth";
import { tokenStore } from "@/lib/api/client";

export type { AppRole, PlatformRole, AuthUser, Membership };

interface AuthCtx {
  user: AuthUser | null;
  profile: AuthUser | null; // alias
  memberships: Membership[];
  currentOrgId: string | null;
  currentMembership: Membership | null;
  currentRole: AppRole | null;
  platformRole: PlatformRole | null;
  isPlatformAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  hasRole: (...roles: AppRole[]) => boolean;
  setSession: (s: Session) => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

const CURRENT_ORG_KEY = "connecttly.auth.current_org";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(localStorage.getItem(CURRENT_ORG_KEY));
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [me, mems] = await Promise.all([authApi.me(), authApi.memberships()]);
      setUser(me);
      setMemberships(mems);
      const stored = localStorage.getItem(CURRENT_ORG_KEY);
      const next = stored && mems.some((m) => m.org_id === stored) ? stored : mems[0]?.org_id ?? null;
      setCurrentOrgId(next);
      if (next) localStorage.setItem(CURRENT_ORG_KEY, next);
    } catch {
      setUser(null);
      setMemberships([]);
      setCurrentOrgId(null);
      tokenStore.clear();
      localStorage.removeItem(CURRENT_ORG_KEY);
    }
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const setSession = useCallback((s: Session) => {
    setUser(s.user);
    setMemberships(s.memberships);
    setCurrentOrgId(s.current_org_id);
    localStorage.setItem(CURRENT_ORG_KEY, s.current_org_id);
  }, []);

  const refresh = useCallback(async () => { await loadAll(); }, [loadAll]);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setMemberships([]);
    setCurrentOrgId(null);
    localStorage.removeItem(CURRENT_ORG_KEY);
  }, []);

  const switchOrg = useCallback(async (orgId: string) => {
    if (!memberships.some((m) => m.org_id === orgId)) throw new Error("Not a member of that workspace");
    await authApi.switchOrg(orgId);
    setCurrentOrgId(orgId);
    localStorage.setItem(CURRENT_ORG_KEY, orgId);
  }, [memberships]);

  const currentMembership = memberships.find((m) => m.org_id === currentOrgId) ?? null;
  const currentRole = currentMembership?.role ?? null;
  const platformRole = user?.platform_role ?? null;
  const isPlatformAdmin = !!platformRole;

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
        currentMembership,
        currentRole,
        platformRole,
        isPlatformAdmin,
        loading,
        refresh,
        signOut,
        switchOrg,
        hasRole,
        setSession,
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
