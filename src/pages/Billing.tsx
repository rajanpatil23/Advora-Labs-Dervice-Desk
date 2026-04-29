import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CreditCard, Check, Sparkles, Download, AlertCircle, Loader2, Users, Zap, TrendingUp, Building2, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/lib/store";
import { billingApi, getPlan, PLANS, type BillingCycle, type OrgBilling, type PlanDef, type PlanTier } from "@/lib/api/billing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Billing() {
  const { hasRole, currentOrgId, currentMembership } = useAuth();
  const canManage = hasRole("owner", "admin");
  const orgAgents = useAppStore((s) => s.orgAgents);
  const [billing, setBilling] = useState<OrgBilling | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [upgradeFor, setUpgradeFor] = useState<PlanTier | null>(null);

  useEffect(() => {
    if (currentOrgId) setBilling(billingApi.get(currentOrgId));
  }, [currentOrgId]);

  if (!canManage) return <Navigate to="/app" replace />;
  if (!currentOrgId || !billing) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const plan = getPlan(billing.plan);
  const seatsUsed = orgAgents.length;
  const seatPct = Math.min(100, (seatsUsed / Math.max(billing.seats_purchased, 1)) * 100);
  const trialDaysLeft = billing.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(billing.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const onSelect = (tier: PlanTier) => {
    if (tier === billing.plan) { toast("You're already on this plan"); return; }
    if (tier === "free") {
      if (!confirm("Downgrade to Free? You'll lose access to paid features at the end of the current period.")) return;
      const next = billingApi.cancel(currentOrgId);
      setBilling(next);
      toast.success("Plan changed to Free");
      return;
    }
    setUpgradeFor(tier);
  };

  const confirmUpgrade = (tier: PlanTier, seats: number) => {
    const next = billingApi.changePlan(currentOrgId, tier, cycle, seats);
    setBilling(next);
    setUpgradeFor(null);
    toast.success(`Upgraded to ${getPlan(tier).name}`, { description: `Renews ${new Date(next.renews_at).toLocaleDateString()}.` });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
        <header>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5" /> Billing
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Plan & billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your subscription, seats, and invoices for {currentMembership?.org_name ?? "your workspace"}.</p>
        </header>

        {/* Current plan card */}
        <section className="panel-elev p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
                <div className="font-display font-bold text-xl mt-0.5 flex items-center gap-2">
                  {plan.name}
                  {billing.plan === "free" && trialDaysLeft > 0 && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                      Trial · {trialDaysLeft}d left
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{plan.tagline}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Renews</div>
              <div className="font-display font-semibold">{new Date(billing.renews_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
              <div className="text-xs text-muted-foreground capitalize mt-0.5">{billing.cycle} billing</div>
            </div>
          </div>

          {/* Stat row */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBlock icon={Users} label="Seats" value={`${seatsUsed} / ${billing.seats_purchased}`} sub={
              <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", seatPct > 90 ? "bg-destructive" : seatPct > 70 ? "bg-warning" : "bg-gradient-primary")} style={{ width: `${seatPct}%` }} />
              </div>
            } />
            <StatBlock icon={TrendingUp} label="Monthly cost" value={
              billing.plan === "free" ? "Free" : `$${(billing.cycle === "annual" ? plan.priceAnnual : plan.priceMonthly) * billing.seats_purchased}`
            } sub={<span className="text-xs text-muted-foreground">per month</span>} />
            <StatBlock icon={CreditCard} label="Payment method" value={
              billing.payment_method ? `${billing.payment_method.brand} •••• ${billing.payment_method.last4}` : "None on file"
            } sub={billing.payment_method ? <span className="text-xs text-muted-foreground">Expires {billing.payment_method.exp}</span> : <button className="text-xs text-primary hover:underline">Add card</button>} />
          </div>

          {seatPct >= 100 && (
            <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0" />
              <span>You've reached your seat limit. Upgrade or buy more seats to invite more teammates.</span>
            </div>
          )}
        </section>

        {/* Plan selector */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display font-bold text-lg">Choose a plan</h2>
              <p className="text-sm text-muted-foreground">All plans include unlimited end-users (requesters).</p>
            </div>
            <div className="inline-flex items-center bg-surface border border-border rounded-full p-0.5 text-xs font-medium">
              {(["monthly", "annual"] as BillingCycle[]).map((c) => (
                <button key={c} onClick={() => setCycle(c)} className={cn(
                  "px-3 py-1.5 rounded-full capitalize transition-colors",
                  cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}>
                  {c}{c === "annual" && <span className="ml-1 text-[10px] opacity-80">−20%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map((p) => (
              <PlanCard
                key={p.tier}
                plan={p}
                cycle={cycle}
                isCurrent={p.tier === billing.plan}
                onSelect={() => onSelect(p.tier)}
              />
            ))}
          </div>
        </section>

        {/* Invoices */}
        <section className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="font-display font-semibold">Invoice history</div>
            <span className="text-xs text-muted-foreground">{billing.invoices.length} total</span>
          </div>
          {billing.invoices.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No invoices yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-2.5">Invoice</th>
                  <th className="text-left font-medium px-5 py-2.5">Period</th>
                  <th className="text-left font-medium px-5 py-2.5">Status</th>
                  <th className="text-right font-medium px-5 py-2.5">Amount</th>
                  <th className="text-right font-medium px-5 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {billing.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-2/30">
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs">{inv.number}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(inv.issued_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {new Date(inv.period_start).toLocaleDateString()} → {new Date(inv.period_end).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-[11px] font-medium capitalize px-2 py-0.5 rounded-full border",
                        inv.status === "paid" ? "bg-success/10 text-success border-success/30"
                          : inv.status === "open" ? "bg-warning/10 text-warning border-warning/30"
                          : "bg-muted text-muted-foreground border-border"
                      )}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">${inv.amount.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => toast("PDF download coming soon")} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Download className="h-3 w-3" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3 w-3" /> Need a custom contract, MSA, or invoicing in your currency?{" "}
          <a className="text-primary hover:underline" href="mailto:sales@connecttly.io">Contact sales</a>
        </p>
      </div>

      {upgradeFor && (
        <UpgradeModal
          tier={upgradeFor}
          cycle={cycle}
          currentSeats={Math.max(seatsUsed, getPlan(upgradeFor).includedSeats)}
          onClose={() => setUpgradeFor(null)}
          onConfirm={(seats) => confirmUpgrade(upgradeFor, seats)}
        />
      )}
    </div>
  );
}

// ---------- Plan card ----------
function PlanCard({ plan, cycle, isCurrent, onSelect }: { plan: PlanDef; cycle: BillingCycle; isCurrent: boolean; onSelect: () => void }) {
  const price = cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
  return (
    <div className={cn(
      "relative rounded-2xl border p-5 flex flex-col bg-surface transition-all",
      plan.highlight ? "border-primary shadow-glow" : "border-border",
      isCurrent && "ring-2 ring-primary/30"
    )}>
      {plan.highlight && (
        <span className="absolute -top-2.5 left-5 text-[10px] font-bold uppercase tracking-wider bg-gradient-primary text-primary-foreground px-2 py-0.5 rounded-full">
          Most popular
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className="font-display font-bold text-lg">{plan.name}</div>
        {isCurrent && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">Current</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display font-bold text-3xl">${price}</span>
        <span className="text-xs text-muted-foreground">/agent · mo</span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {plan.tier === "free" ? "Forever free" : `Includes ${plan.includedSeats} seats`}
      </div>

      <ul className="mt-4 space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs">
            <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={cn(
          "mt-5 h-10 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
          isCurrent
            ? "bg-surface-2 text-muted-foreground cursor-default"
            : plan.highlight
              ? "bg-gradient-primary text-primary-foreground hover:shadow-glow"
              : "bg-surface-2 hover:bg-primary hover:text-primary-foreground"
        )}
      >
        {isCurrent ? "Current plan" : plan.tier === "free" ? "Downgrade" : <>Choose {plan.name} <Zap className="h-3.5 w-3.5" /></>}
      </button>
    </div>
  );
}

// ---------- Upgrade modal ----------
function UpgradeModal({ tier, cycle, currentSeats, onClose, onConfirm }: {
  tier: PlanTier; cycle: BillingCycle; currentSeats: number; onClose: () => void; onConfirm: (seats: number) => void;
}) {
  const plan = getPlan(tier);
  const [seats, setSeats] = useState(currentSeats);
  const [busy, setBusy] = useState(false);
  const unit = cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
  const total = useMemo(() => seats * unit * (cycle === "annual" ? 12 : 1), [seats, unit, cycle]);

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Upgrade</div>
            <div className="font-display font-bold text-lg">{plan.name} · {cycle}</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-2 text-muted-foreground"><X className="h-4 w-4 mx-auto" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Seats</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSeats((s) => Math.max(plan.includedSeats, s - 1))} className="h-10 w-10 rounded-xl bg-surface-2 hover:bg-surface text-lg font-semibold">−</button>
              <input type="number" min={plan.includedSeats} value={seats} onChange={(e) => setSeats(Math.max(plan.includedSeats, Number(e.target.value) || plan.includedSeats))} className="flex-1 h-10 text-center bg-background border border-border rounded-xl text-sm tabular-nums" />
              <button onClick={() => setSeats((s) => s + 1)} className="h-10 w-10 rounded-xl bg-surface-2 hover:bg-surface text-lg font-semibold">+</button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Min {plan.includedSeats} seats included with this plan.</p>
          </div>

          <div className="rounded-xl bg-background border border-border p-4 space-y-2 text-sm">
            <Row label={`${plan.name} · ${seats} seats`} value={`$${unit}/seat/mo`} />
            <Row label="Billing cycle" value={cycle === "annual" ? "Yearly (−20%)" : "Monthly"} />
            <div className="border-t border-border pt-2 flex items-center justify-between font-display font-bold">
              <span>Total {cycle === "annual" ? "today" : "per month"}</span>
              <span className="text-xl">${total.toLocaleString()}</span>
            </div>
          </div>

          <button
            disabled={busy}
            onClick={() => { setBusy(true); setTimeout(() => onConfirm(seats), 600); }}
            className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm & pay <CreditCard className="h-4 w-4" /></>}
          </button>
          <p className="text-[11px] text-center text-muted-foreground">
            Test mode - no real charge. Connect Lovable Payments to accept live cards.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatBlock({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-background border border-border p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 font-display font-bold text-lg">{value}</div>
      {sub}
    </div>
  );
}
