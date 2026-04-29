import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SignUp() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const session = await authApi.signup(email, password, fullName, orgName);
      setSession(session);
      toast.success("Workspace created");
      nav("/app", { replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Sign up failed");
    } finally {
      setBusy(false);
    }
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
            Spin up your <span className="gradient-text">support workspace</span> in seconds.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg">Tickets, incidents, SLAs and a knowledge base — all in one focused workspace.</p>
        </div>
        <div className="relative text-xs text-sidebar-foreground/50">© Connecttly 2026</div>
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-12">
        <div className="max-w-md w-full mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Get started</div>
          <h2 className="mt-1 font-display font-bold text-3xl">Create your workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">You'll be the owner of a brand-new organization.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full name</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Organization name</label>
              <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Work email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input type="password" required minLength={4} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm" />
            </div>
            <button disabled={busy} className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow transition-shadow flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create workspace <ArrowRight className="h-4 w-4" /></>}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
