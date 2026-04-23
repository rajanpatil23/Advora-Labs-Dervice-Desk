import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, Zap, Users } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("maya@connecttly.io");
  const [password, setPassword] = useState("demo");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav("/app");
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* Left: brand panel */}
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
          <p className="text-sidebar-foreground/70 text-lg">A modern service desk built for speed: rich SLAs, incident command, and a focused split-screen workflow.</p>
          <div className="space-y-3 pt-4">
            {[
              { icon: Zap, t: "Resolve faster", d: "AI suggestions, keyboard‑first workflow." },
              { icon: ShieldCheck, t: "Stay on top of SLAs", d: "Live timers and breach alerts." },
              { icon: Users, t: "One workspace for everyone", d: "Tickets, incidents, requests in sync." },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border">
                <div className="h-8 w-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-sidebar-accent-foreground">{f.t}</div>
                  <div className="text-xs text-sidebar-foreground/60">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-sidebar-foreground/50">© Connecttly 2025 · Internal portfolio demo</div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col justify-center p-6 sm:p-12">
        <div className="max-w-md w-full mx-auto">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
            <div className="font-display font-bold">Connecttly Support OS</div>
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sign in</div>
          <h2 className="mt-1 font-display font-bold text-3xl">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Use the demo account or your credentials.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm transition-all" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <button type="button" className="text-xs text-primary hover:underline">Forgot?</button>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm transition-all" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Sign in as</label>
              <select className="mt-1 w-full h-11 px-3 rounded-xl bg-surface border border-border outline-none text-sm">
                <option>Admin</option>
                <option>Support Manager</option>
                <option>Support Agent</option>
                <option>Viewer</option>
                <option>Requester</option>
              </select>
            </div>
            <button className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow transition-shadow flex items-center justify-center gap-2 group">
              Continue <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <Link to="/app" className="block text-center text-xs text-muted-foreground hover:text-foreground">Continue with demo mode →</Link>
          </form>
        </div>
      </div>
    </div>
  );
}
