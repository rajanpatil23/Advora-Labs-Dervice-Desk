import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, ChevronDown } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import { SEED_USERS, SEED_PLATFORM_ADMINS } from "@/lib/api/seedUsers";
import { postLoginRedirect } from "@/lib/roleRoutes";
import { toast } from "sonner";
import advoraLogo from "@/assets/advora-logo-dark.png";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname?: string } } };
  const redirect = loc.state?.from?.pathname || "/app";
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showDemos, setShowDemos] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const session = await authApi.login(email, password);
      setSession(session);
      toast.success(`Welcome back, ${session.user.full_name}`);
      const tenantRole = session.memberships.find((m) => m.org_id === session.current_org_id)?.role ?? null;
      const dest = postLoginRedirect({
        platformRole: session.user.platform_role,
        hasMemberships: session.memberships.length > 0,
        tenantRole,
        fallback: redirect,
      });
      nav(dest, { replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const quickFill = (e: string) => {
    setEmail(e);
    setPassword("demo");
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="brand-canvas relative hidden lg:flex flex-col justify-between p-10 overflow-hidden text-white">
        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center overflow-hidden ring-1 ring-white/30 shadow-sm">
            <img src={advoraLogo} alt="Advora" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-tight">Advora Service Desk</div>
            <div className="text-xs text-white/75">Agent-first ticketing for modern teams</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-lg">
          <h1 className="font-display font-bold text-4xl xl:text-5xl leading-[1.1] text-white">
            Run support for every team in your org - from one console.
          </h1>
          <p className="text-white/80 text-base leading-relaxed">
            SLA tracking, incident command, omnichannel inbox, knowledge base, and AI-powered routing - all in one focused workspace.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 p-4">
              <div className="text-2xl font-display font-bold text-white">12+</div>
              <div className="text-[11px] text-white/70 mt-0.5">Channels</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 p-4">
              <div className="text-2xl font-display font-bold text-white">99.9%</div>
              <div className="text-[11px] text-white/70 mt-0.5">SLA uptime</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 p-4">
              <div className="text-2xl font-display font-bold text-white">2k+</div>
              <div className="text-[11px] text-white/70 mt-0.5">Tickets/day</div>
            </div>
          </div>
        </div>

        <div className="relative text-xs text-white/70">© 2026 Advora Labs · Pune, IN</div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col justify-center p-6 sm:p-12 bg-background">
        <div className="max-w-md w-full mx-auto">
          <h2 className="font-display font-bold text-3xl text-foreground">Sign in to your workspace</h2>
          <p className="text-sm text-muted-foreground mt-2">Welcome back. Enter your credentials to continue.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="you@company.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link to="/login" className="text-xs text-primary hover:underline">Forgot?</Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              disabled={busy}
              className="brand-button w-full h-11 rounded-xl text-primary-foreground font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          {/* Demo accounts (collapsible) */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowDemos((s) => !s)}
              className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px]">?</span>
              Evaluating Advora? Try a demo account
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDemos ? "rotate-180" : ""}`} />
            </button>
            {showDemos && (
              <div className="mt-2 rounded-xl border border-dashed border-border bg-surface/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Password: demo</div>
                <div className="grid grid-cols-1 gap-1">
                  {SEED_USERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => quickFill(u.email)}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md hover:bg-surface-2 transition-colors text-left"
                    >
                      <span className="font-mono">{u.email}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{
                        SEED_PLATFORM_ADMINS.find(p => p.user_id === u.id)?.role
                        || u.memberships.map(m => m.role).join(" / ")
                        || "-"
                      }</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            New to Advora? <Link to="/signup" className="text-primary font-medium hover:underline">Create a workspace</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
