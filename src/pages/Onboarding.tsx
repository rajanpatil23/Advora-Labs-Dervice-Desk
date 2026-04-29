import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Loader2, Check, ArrowRight, ArrowLeft, Building2, Users, Tag, Timer, Clock,
  Plus, X, Upload,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { orgConfigApi, type OrgConfig, type PendingInvite, type SlaDefaults } from "@/lib/api/orgConfig";
import { tenantRoleHome } from "@/lib/roleRoutes";
import { toast } from "sonner";

type StepKey = "profile" | "invites" | "categories" | "sla" | "hours";

const STEPS: { key: StepKey; title: string; subtitle: string; icon: typeof Building2 }[] = [
  { key: "profile",    title: "Workspace profile",  subtitle: "Tell us about your organization",       icon: Building2 },
  { key: "invites",    title: "Invite your team",   subtitle: "Add agents, managers, and admins",      icon: Users },
  { key: "categories", title: "Ticket categories",  subtitle: "What kind of work do you handle?",      icon: Tag },
  { key: "sla",        title: "SLA targets",        subtitle: "Set response & resolution defaults",    icon: Timer },
  { key: "hours",      title: "Business hours",     subtitle: "When does your team operate?",          icon: Clock },
];

const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Education", "Manufacturing", "Retail", "Government", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const ROLE_OPTIONS: PendingInvite["role"][] = ["admin", "manager", "agent", "resolver", "requester"];

export default function Onboarding() {
  const nav = useNavigate();
  const { user, currentMembership, currentOrgId, currentRole, loading, signOut } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [cfg, setCfg] = useState<OrgConfig | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentOrgId) return;
    setCfg(orgConfigApi.get(currentOrgId, currentMembership?.org_name ?? ""));
  }, [currentOrgId, currentMembership?.org_name]);

  if (loading || !cfg) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!user) { nav("/login", { replace: true }); return null; }
  if (!currentOrgId) {
    return (
      <CenteredCard>
        <div className="font-display font-bold text-xl">No workspace yet</div>
        <p className="text-sm text-muted-foreground">Create or join an organization to continue.</p>
        <button onClick={() => nav("/signup")} className="mt-2 w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm">Create workspace</button>
      </CenteredCard>
    );
  }
  // Only owners/admins should be running this wizard.
  if (currentRole && !["owner", "admin"].includes(currentRole)) {
    nav(tenantRoleHome(currentRole), { replace: true });
    return null;
  }

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const update = (patch: Partial<OrgConfig>) => setCfg((c) => (c ? { ...c, ...patch } : c));

  const next = () => {
    if (!cfg) return;
    orgConfigApi.save(cfg.org_id, cfg);
    if (isLast) finish();
    else setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));

  const finish = async () => {
    if (!cfg) return;
    setBusy(true);
    try {
      orgConfigApi.complete(cfg.org_id);
      toast.success("Workspace ready 🎉");
      nav(tenantRoleHome(currentRole), { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    if (!cfg) return;
    orgConfigApi.complete(cfg.org_id);
    toast("Onboarding skipped — you can configure later in Settings.");
    nav(tenantRoleHome(currentRole), { replace: true });
  };

  return (
    <div className="min-h-screen bg-background mesh-bg">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-10 bg-background/70">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-bold text-sm leading-none">Connecttly</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">Onboarding</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{user.email}</span>
            <button onClick={async () => { await signOut(); nav("/login"); }} className="hover:text-foreground">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-[260px_1fr] gap-10">
        {/* Stepper */}
        <aside>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Setup · {stepIdx + 1} of {STEPS.length}</div>
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <li key={s.key}>
                  <button
                    onClick={() => i <= stepIdx && setStepIdx(i)}
                    disabled={i > stepIdx}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active ? "bg-primary/10 border border-primary/30" : done ? "hover:bg-surface" : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <span className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold ${
                      done ? "bg-primary text-primary-foreground" : active ? "bg-primary/15 text-primary" : "bg-surface text-muted-foreground"
                    }`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.subtitle}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
          <button onClick={skip} className="mt-6 text-xs text-muted-foreground hover:text-foreground">Skip for now</button>
        </aside>

        {/* Content */}
        <section className="bg-surface border border-border rounded-2xl shadow-elegant p-8 min-h-[520px] flex flex-col">
          <div className="mb-6">
            <h1 className="font-display font-bold text-2xl">{step.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{step.subtitle}</p>
          </div>

          <div className="flex-1">
            {step.key === "profile"    && <StepProfile cfg={cfg} update={update} />}
            {step.key === "invites"    && <StepInvites cfg={cfg} update={update} />}
            {step.key === "categories" && <StepCategories cfg={cfg} update={update} />}
            {step.key === "sla"        && <StepSla cfg={cfg} update={update} />}
            {step.key === "hours"      && <StepHours cfg={cfg} update={update} />}
          </div>

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
            <button
              onClick={back}
              disabled={stepIdx === 0}
              className="h-10 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Step {stepIdx + 1} / {STEPS.length}</span>
              <button
                onClick={next}
                disabled={busy}
                className="h-10 px-5 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow flex items-center gap-2 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isLast ? <>Finish setup <Check className="h-4 w-4" /></> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ---------- Steps ----------
function StepProfile({ cfg, update }: { cfg: OrgConfig; update: (p: Partial<OrgConfig>) => void }) {
  return (
    <div className="space-y-5 max-w-xl">
      <Field label="Workspace name">
        <input value={cfg.display_name} onChange={(e) => update({ display_name: e.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Industry">
          <select value={cfg.industry} onChange={(e) => update({ industry: e.target.value })} className={inputCls}>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Team size">
          <select value={cfg.size} onChange={(e) => update({ size: e.target.value })} className={inputCls}>
            {SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
        <Field label="Brand color (HEX)">
          <input value={cfg.primary_color} onChange={(e) => update({ primary_color: e.target.value })} className={inputCls} />
        </Field>
        <div className="h-11 w-16 rounded-xl border border-border" style={{ background: cfg.primary_color }} />
      </div>
      <Field label="Logo (optional)">
        <div className="h-24 rounded-xl border border-dashed border-border bg-background/40 flex items-center justify-center text-xs text-muted-foreground">
          <Upload className="h-4 w-4 mr-2" /> Upload coming soon
        </div>
      </Field>
    </div>
  );
}

function StepInvites({ cfg, update }: { cfg: OrgConfig; update: (p: Partial<OrgConfig>) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PendingInvite["role"]>("agent");

  const add = () => {
    const e = email.trim().toLowerCase();
    if (!e || !/.+@.+\..+/.test(e)) { toast.error("Enter a valid email"); return; }
    if (cfg.pending_invites.some((p) => p.email === e)) { toast.error("Already added"); return; }
    update({ pending_invites: [...cfg.pending_invites, { email: e, role }] });
    setEmail("");
  };
  const remove = (e: string) => update({ pending_invites: cfg.pending_invites.filter((p) => p.email !== e) });

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="teammate@company.com"
          className={`${inputCls} flex-1`}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as PendingInvite["role"])} className={`${inputCls} w-40`}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={add} className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add</button>
      </div>

      {cfg.pending_invites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No invites queued. Add teammates above — invites will be sent when you finish setup.
        </div>
      ) : (
        <ul className="rounded-xl border border-border divide-y divide-border bg-background/40">
          {cfg.pending_invites.map((p) => (
            <li key={p.email} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{p.email}</div>
                <div className="text-xs text-muted-foreground capitalize">{p.role}</div>
              </div>
              <button onClick={() => remove(p.email)} className="text-muted-foreground hover:text-destructive p-1.5"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">You can always invite more people later from <span className="text-foreground">Users → Invite</span>.</p>
    </div>
  );
}

function StepCategories({ cfg, update }: { cfg: OrgConfig; update: (p: Partial<OrgConfig>) => void }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (!v) return;
    if (cfg.categories.includes(v)) { toast.error("Already added"); return; }
    update({ categories: [...cfg.categories, v] });
    setVal("");
  };
  const remove = (c: string) => update({ categories: cfg.categories.filter((x) => x !== c) });
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex gap-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="e.g. VPN access" className={`${inputCls} flex-1`} />
        <button onClick={add} className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {cfg.categories.map((c) => (
          <span key={c} className="inline-flex items-center gap-2 h-8 pl-3 pr-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium">
            {c}
            <button onClick={() => remove(c)} className="h-6 w-6 rounded-full hover:bg-destructive/15 hover:text-destructive flex items-center justify-center"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Categories help route tickets and power your service catalog.</p>
    </div>
  );
}

function StepSla({ cfg, update }: { cfg: OrgConfig; update: (p: Partial<OrgConfig>) => void }) {
  const setRow = (i: number, patch: Partial<SlaDefaults>) => {
    const next = cfg.sla_defaults.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    update({ sla_defaults: next });
  };
  const fmt = (m: number) => m >= 60 ? `${(m / 60).toFixed(m % 60 === 0 ? 0 : 1)}h` : `${m}m`;
  return (
    <div className="space-y-3 max-w-2xl">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <div>Priority</div><div>First response</div><div>Resolution</div><div className="text-right">Preview</div>
      </div>
      {cfg.sla_defaults.map((row, i) => (
        <div key={row.priority} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center bg-background/40 border border-border rounded-xl px-3 py-2.5">
          <div className="text-sm font-medium capitalize flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${row.priority === "urgent" ? "bg-destructive" : row.priority === "high" ? "bg-warning" : row.priority === "medium" ? "bg-primary" : "bg-muted-foreground"}`} />
            {row.priority}
          </div>
          <NumInput value={row.response_minutes} onChange={(v) => setRow(i, { response_minutes: v })} suffix="min" />
          <NumInput value={row.resolve_minutes}  onChange={(v) => setRow(i, { resolve_minutes: v })}  suffix="min" />
          <div className="text-xs text-muted-foreground text-right">{fmt(row.response_minutes)} / {fmt(row.resolve_minutes)}</div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">SLAs only count during business hours (next step).</p>
    </div>
  );
}

function StepHours({ cfg, update }: { cfg: OrgConfig; update: (p: Partial<OrgConfig>) => void }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toggleDay = (d: number) => {
    const next = cfg.business_hours.workdays.includes(d)
      ? cfg.business_hours.workdays.filter((x) => x !== d)
      : [...cfg.business_hours.workdays, d].sort();
    update({ business_hours: { ...cfg.business_hours, workdays: next } });
  };
  const tzList = useMemo(() => {
    try { return (Intl as any).supportedValuesOf?.("timeZone") ?? [cfg.business_hours.timezone]; }
    catch { return [cfg.business_hours.timezone]; }
  }, [cfg.business_hours.timezone]);

  return (
    <div className="space-y-5 max-w-xl">
      <Field label="Time zone">
        <select value={cfg.business_hours.timezone} onChange={(e) => update({ business_hours: { ...cfg.business_hours, timezone: e.target.value } })} className={inputCls}>
          {tzList.slice(0, 200).map((tz: string) => <option key={tz}>{tz}</option>)}
        </select>
      </Field>
      <Field label="Working days">
        <div className="flex gap-2">
          {days.map((d, i) => {
            const on = cfg.business_hours.workdays.includes(i);
            return (
              <button key={d} type="button" onClick={() => toggleDay(i)}
                className={`h-10 w-12 rounded-xl text-xs font-semibold border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>
                {d}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start"><input type="time" value={cfg.business_hours.start} onChange={(e) => update({ business_hours: { ...cfg.business_hours, start: e.target.value } })} className={inputCls} /></Field>
        <Field label="End"><input type="time" value={cfg.business_hours.end} onChange={(e) => update({ business_hours: { ...cfg.business_hours, end: e.target.value } })} className={inputCls} /></Field>
      </div>
    </div>
  );
}

// ---------- helpers ----------
const inputCls = "w-full h-11 px-3.5 rounded-xl bg-background border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function NumInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className={`${inputCls} pr-12`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background mesh-bg p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-elegant text-center space-y-4">{children}</div>
    </div>
  );
}
