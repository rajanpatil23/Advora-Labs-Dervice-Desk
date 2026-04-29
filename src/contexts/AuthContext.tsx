import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "agent" | "resolver" | "requester";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  current_org_id: string | null;
}

export interface Membership {
  id: string;
  org_id: string;
  role: AppRole;
  team_id: string | null;
  is_active: boolean;
  org?: { id: string; name: string; slug: string };
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  currentOrgId: string | null;
  currentRole: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  hasRole: (...roles: AppRole[]) => boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: mems }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("memberships")
        .select("id, org_id, role, team_id, is_active, org:organizations(id, name, slug)")
        .eq("user_id", uid)
        .eq("is_active", true),
    ]);
    setProfile(prof as Profile | null);
    setMemberships((mems || []) as unknown as Membership[]);
  }, []);

  const refresh = useCallback(async () => {
    if (user) await loadUserData(user.id);
  }, [user, loadUserData]);

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer DB calls to avoid deadlocks inside the auth callback
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        setProfile(null);
        setMemberships([]);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadUserData(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMemberships([]);
  }, []);

  const switchOrg = useCallback(
    async (orgId: string) => {
      const { error } = await supabase.rpc("switch_org", { _org_id: orgId });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const currentOrgId = profile?.current_org_id ?? memberships[0]?.org_id ?? null;
  const currentRole = memberships.find((m) => m.org_id === currentOrgId)?.role ?? null;

  const hasRole = useCallback(
    (...roles: AppRole[]) => (currentRole ? roles.includes(currentRole) : false),
    [currentRole]
  );

  return (
    <Ctx.Provider
      value={{
        session,
        user,
        profile,
        memberships,
        currentOrgId,
        currentRole,
        loading,
        refresh,
        signOut,
        switchOrg,
        hasRole,
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
