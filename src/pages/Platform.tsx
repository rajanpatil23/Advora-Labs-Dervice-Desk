import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Shield, ScrollText, BarChart3, LogOut, Sparkles, AlertOctagon, CheckCircle2, Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { platformApi, type PlatformOrg, type PlatformAdminRow, type AuditEntry, type PlatformStats } from "@/lib/api/platform";
import { toast } from "sonner";

type Tab = "overview" | "tenants" | "admins" | "audit";

export default function Platform() {
  const nav = useNavigate();
  const { user, isPlatformAdmin, platformRole, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<PlatformOrg[]>([]);
  const [admins, setAdmins] = useState<PlatformAdminRow[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  // Redirect non-platform users away
  useEffect(() => {
    if (!loading && !isPlatformAdmin) nav("/app", { replace: true });
  }, [loading, isPlatformAdmin, nav]);

  const loadAll = async () => {
    try {
      const [s, o, a, l] = await Promise.all([
        platformApi.stats(),
        platformApi.listOrgs(),
        platformApi.listAdmins(),
        platformApi.listAudit(),
      ]);
      setStats(s); setOrgs(o); setAdmins(a); setAudit(l);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => { if (isPlatformAdmin) loadAll(); /* eslint-disable-next-line */ }, [isPlatformAdmin]);

  const isSuper = platformRole === "super_admin";

  const suspend = async (org: PlatformOrg) => {
    if (!isSuper) return toast.error("Only super_admins can suspend tenants");
    const reason = window.prompt(`Reason for suspending ${org.name}?`, "Non-payment");
    if (reason === null) return;
    setBusy(true);
    try {
      await platformApi.suspendOrg(org.id, reason);
      toast.success(`${org.name} suspended`);
      await loadAll();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const resume = async (org: PlatformOrg) => {
    if (!isSuper) return toast.error("Only super_admins can resume tenants");
    setBusy(true);
    try {
      await platformApi.resumeOrg(org.id);
      toast.success(`${org.name} resumed`);
      await loadAll();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    nav("/login");
  };

  if (loading || !isPlatformAdmin) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredOrgs = orgs.filter(o =>
    !query || o.name.toLowerCase().includes(query.toLowerCase()) || o.domain.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[244px] flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center h-16 border-b border-sidebar-border px-4 gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <div className="font-display font-bold text-sidebar-accent-foreground tracking-tight truncate">Platform</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 truncate">SaaS Operator</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <NavBtn icon={BarChart3} label="Overview"   active={tab==="overview"} onClick={()=>setTab("overview")} />
          <NavBtn icon={Building2} label="Tenants"    active={tab==="tenants"}  onClick={()=>setTab("tenants")} badge={String(orgs.length)} />
          <NavBtn icon={Shield}    label="Platform admins" active={tab==="admins"}  onClick={()=>setTab("admins")} badge={String(admins.length)} />
          <NavBtn icon={ScrollText} label="Audit log" active={tab==="audit"}    onClick={()=>setTab("audit")} />
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          {user && (
            <div className="text-xs">
              <div className="font-medium text-sidebar-accent-foreground truncate">{user.full_name}</div>
              <div className="text-sidebar-foreground/60 truncate uppercase tracking-wider text-[10px]">{platformRole}</div>
            </div>
          )}
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto space-y-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Platform console
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1 capitalize">{tab}</h1>
          </div>

          {tab === "overview" && stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Total tenants" value={stats.total_orgs} />
              <Stat label="Active" value={stats.active_orgs} tone="ok" />
              <Stat label="Suspended" value={stats.suspended_orgs} tone={stats.suspended_orgs > 0 ? "warn" : undefined} />
              <Stat label="Total members" value={stats.total_memberships} />
              <div className="panel p-5 col-span-2 lg:col-span-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Tenants by plan</div>
                <div className="mt-3 flex gap-3 flex-wrap">
                  {Object.entries(stats.by_plan).map(([plan, n]) => (
                    <div key={plan} className="px-3 py-2 rounded-lg bg-surface-2 text-sm">
                      <span className="capitalize font-semibold">{plan}</span> · <span className="tabular-nums">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "tenants" && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search tenants..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm" />
              </div>
              <div className="panel divide-y divide-border">
                {filteredOrgs.map((o) => (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="h-10 w-10 rounded-lg bg-surface-2 flex items-center justify-center font-display font-bold uppercase">
                      {o.name.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate">{o.name}</div>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${o.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}`}>{o.status}</span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface-2 capitalize">{o.plan}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {o.domain} · {o.industry} · {o.member_count} members · created {o.created_at}
                      </div>
                      {o.suspended_reason && (
                        <div className="text-xs text-destructive mt-1">Suspended: {o.suspended_reason}</div>
                      )}
                    </div>
                    {o.status === "active" ? (
                      <button disabled={busy || !isSuper} onClick={() => suspend(o)}
                        className="h-9 px-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 disabled:opacity-40">
                        Suspend
                      </button>
                    ) : (
                      <button disabled={busy || !isSuper} onClick={() => resume(o)}
                        className="h-9 px-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-40">
                        Resume
                      </button>
                    )}
                  </div>
                ))}
                {filteredOrgs.length === 0 && (
                  <div className="px-5 py-10 text-center text-sm text-muted-foreground">No tenants found.</div>
                )}
              </div>
            </div>
          )}

          {tab === "admins" && (
            <div className="panel divide-y divide-border">
              {admins.map((a) => (
                <div key={a.user_id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: a.avatar_color }}>
                    {a.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">{a.role}</span>
                </div>
              ))}
              {!isSuper && (
                <div className="px-5 py-3 text-xs text-muted-foreground">Only super_admins can grant or revoke platform roles.</div>
              )}
            </div>
          )}

          {tab === "audit" && (
            <div className="panel divide-y divide-border max-h-[70vh] overflow-y-auto">
              {audit.map((e) => (
                <div key={e.id} className="px-5 py-3 text-sm flex gap-3 items-start">
                  <div className="h-7 w-7 rounded-md bg-surface-2 flex items-center justify-center shrink-0">
                    {e.action.startsWith("org.suspend") ? <AlertOctagon className="h-3.5 w-3.5 text-destructive" /> :
                     e.action.startsWith("org.resume") ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> :
                     <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div><span className="font-medium">{e.actor_name}</span> <span className="text-muted-foreground">·</span> <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded">{e.action}</code>{e.target_org_name && <> on <span className="font-medium">{e.target_org_name}</span></>}</div>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">{JSON.stringify(e.metadata)}</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 tabular-nums">{new Date(e.created_at).toLocaleString()}</div>
                </div>
              ))}
              {audit.length === 0 && <div className="px-5 py-10 text-center text-sm text-muted-foreground">No audit entries yet.</div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavBtn({ icon: Icon, label, active, onClick, badge }: { icon: typeof Building2; label: string; active: boolean; onClick: () => void; badge?: string }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent/60"}`}>
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-sidebar-primary/15 text-sidebar-primary">{badge}</span>}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-destructive" : "text-foreground";
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-3xl font-display font-bold mt-1 tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
