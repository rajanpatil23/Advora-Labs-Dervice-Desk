import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Mail, Lock, User, Building2 } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import advoraLogo from "@/assets/advora-logo-dark.png";

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
      nav("/onboarding", { replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const inputBase = "w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm";

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden text-white" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%) 0%, hsl(221 83% 45%) 100%)" }}>
        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden ring-1 ring-white/20">
            <img src={advoraLogo} alt="Advora" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-tight">Advora Service Desk</div>
            <div className="text-xs text-white/75">Agent-first ticketing for modern teams</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-lg">
          <h1 className="font-display font-bold text-4xl xl:text-5xl leading-[1.1] text-white">
            Spin up your support workspace in seconds.
          </h1>
          <p className="text-white/80 text-base leading-relaxed">
            Tickets, incidents, SLAs, omnichannel inbox and a knowledge base — all in one focused workspace your agents will actually love.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 p-4">
              <div className="text-2xl font-display font-bold text-white">5 min</div>
              <div className="text-[11px] text-white/70 mt-0.5">Setup</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 p-4">
              <div className="text-2xl font-display font-bold text-white">Free</div>
              <div className="text-[11px] text-white/70 mt-0.5">To start</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 p-4">
              <div className="text-2xl font-display font-bold text-white">∞</div>
              <div className="text-[11px] text-white/70 mt-0.5">Tickets</div>
            </div>
          </div>
        </div>

        <div className="relative text-xs text-white/70">© 2026 Advora Labs · Pune, IN</div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col justify-center p-6 sm:p-12 bg-background">
        <div className="max-w-md w-full mx-auto">
          <h2 className="font-display font-bold text-3xl text-foreground">Create your workspace</h2>
          <p className="text-sm text-muted-foreground mt-2">You'll be the owner of a brand-new organization.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full name</label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Aarav Sharma" className={inputBase} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Organization name</label>
              <div className="relative mt-1.5">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." className={inputBase} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Work email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.in" className={inputBase} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="password" required minLength={4} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputBase} />
              </div>
            </div>
            <button
              disabled={busy}
              className="w-full h-11 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-95"
              style={{ background: "linear-gradient(135deg, hsl(217 91% 55%) 0%, hsl(221 83% 45%) 100%)" }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create workspace <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
