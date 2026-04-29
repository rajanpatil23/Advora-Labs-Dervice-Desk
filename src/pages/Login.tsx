import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import { SEED_USERS } from "@/lib/api/seedUsers";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname?: string } } };
  const redirect = loc.state?.from?.pathname || "/app";
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const session = await authApi.login(email, password);
      setSession(session);
      toast.success(`Welcome back, ${session.user.full_name}`);
      nav(redirect, { replace: true });
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
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-sidebar text-sidebar-foreground overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-80 pointer-events-none" />
        <div className="relative flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-sidebar-accent-foreground text-lg">Connecttly</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/60">Support OS</div>
          </div>
        </div>
        <div className="relative space-y-6 max-w-md">
          <h1 className="font-display font-bold text-4xl xl:text-5xl leading-tight text-sidebar-accent-foreground">
            The agent workspace your team will <span className="gradient-text">actually love</span>.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg">Modern service desk: SLAs, incidents, and a focused workflow.</p>
        </div>
        <div className="relative text-xs text-sidebar-foreground/50">© Connecttly 2026</div>
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-12">
        <div className="max-w-md w-full mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sign in</div>
          <h2 className="mt-1 font-display font-bold text-3xl">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm"
              />
            </div>
            <button
              disabled={busy}
              className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow transition-shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              No account? <Link to="/signup" className="text-primary hover:underline">Create one</Link>
            </p>
          </form>

          {/* Demo accounts */}
          <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/40 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Demo accounts (password: demo)</div>
            <div className="grid grid-cols-1 gap-1.5">
              {SEED_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => quickFill(u.email)}
                  className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md hover:bg-surface-2 transition-colors text-left"
                >
                  <span className="font-mono">{u.email}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{u.memberships.map(m => m.role).join(" / ")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
