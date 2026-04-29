/**
 * Billing state per org (mock layer; persisted in localStorage).
 * The real backend would store these on org_subscriptions / invoices tables,
 * synced from Stripe/Paddle webhooks.
 */

export type PlanTier = "free" | "starter" | "growth" | "enterprise";
export type BillingCycle = "monthly" | "annual";

export interface PlanDef {
  tier: PlanTier;
  name: string;
  tagline: string;
  priceMonthly: number; // USD per agent / month
  priceAnnual: number;  // USD per agent / month, billed annually
  includedSeats: number;
  features: string[];
  highlight?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    tier: "free",
    name: "Free",
    tagline: "For trying things out",
    priceMonthly: 0,
    priceAnnual: 0,
    includedSeats: 3,
    features: [
      "Up to 3 agents",
      "Email & portal channels",
      "Basic SLA tracking",
      "Knowledge base (5 articles)",
      "Community support",
    ],
  },
  {
    tier: "starter",
    name: "Starter",
    tagline: "Small support teams",
    priceMonthly: 19,
    priceAnnual: 15,
    includedSeats: 5,
    features: [
      "Everything in Free",
      "Unlimited tickets",
      "Custom SLAs & business hours",
      "Service catalog & approvals",
      "Email support",
    ],
  },
  {
    tier: "growth",
    name: "Growth",
    tagline: "Scaling IT operations",
    priceMonthly: 49,
    priceAnnual: 39,
    includedSeats: 15,
    features: [
      "Everything in Starter",
      "Incident & problem management",
      "Advanced analytics & reports",
      "Custom roles & permissions",
      "Priority support · 99.9% SLA",
    ],
    highlight: true,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    tagline: "Mission-critical teams",
    priceMonthly: 99,
    priceAnnual: 79,
    includedSeats: 50,
    features: [
      "Everything in Growth",
      "SSO (SAML/OIDC) & SCIM",
      "Audit logs & data residency",
      "Sandbox environments",
      "Dedicated CSM · 24×7 support",
    ],
  },
];

export interface Invoice {
  id: string;
  number: string;
  amount: number; // USD
  currency: "USD";
  status: "paid" | "open" | "void";
  period_start: string;
  period_end: string;
  issued_at: string;
  pdf_url?: string;
}

export interface OrgBilling {
  org_id: string;
  plan: PlanTier;
  cycle: BillingCycle;
  seats_purchased: number;
  trial_ends_at: string | null;
  renews_at: string;
  payment_method: { brand: string; last4: string; exp: string } | null;
  invoices: Invoice[];
  updated_at: string;
}

const KEY = (orgId: string) => `connecttly.billing.${orgId}`;

export function getPlan(tier: PlanTier): PlanDef {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0];
}

export function defaultBilling(orgId: string): OrgBilling {
  const now = new Date();
  const trialEnd = new Date(now); trialEnd.setDate(trialEnd.getDate() + 14);
  const renews = new Date(now); renews.setMonth(renews.getMonth() + 1);
  // Seed two paid invoices for visual realism
  const inv = (n: number, monthsAgo: number, amount: number): Invoice => {
    const issued = new Date(now); issued.setMonth(issued.getMonth() - monthsAgo);
    const start = new Date(issued); start.setMonth(start.getMonth() - 1);
    return {
      id: `inv_${monthsAgo}`,
      number: `INV-${1000 + n}`,
      amount, currency: "USD",
      status: "paid",
      period_start: start.toISOString(),
      period_end: issued.toISOString(),
      issued_at: issued.toISOString(),
    };
  };
  return {
    org_id: orgId,
    plan: "free",
    cycle: "monthly",
    seats_purchased: 3,
    trial_ends_at: trialEnd.toISOString(),
    renews_at: renews.toISOString(),
    payment_method: null,
    invoices: [inv(2, 1, 0), inv(1, 2, 0)],
    updated_at: now.toISOString(),
  };
}

export const billingApi = {
  get(orgId: string): OrgBilling {
    try {
      const raw = localStorage.getItem(KEY(orgId));
      if (raw) return JSON.parse(raw) as OrgBilling;
    } catch { /* ignore */ }
    const b = defaultBilling(orgId);
    localStorage.setItem(KEY(orgId), JSON.stringify(b));
    return b;
  },

  save(orgId: string, patch: Partial<OrgBilling>): OrgBilling {
    const cur = billingApi.get(orgId);
    const next = { ...cur, ...patch, org_id: orgId, updated_at: new Date().toISOString() };
    localStorage.setItem(KEY(orgId), JSON.stringify(next));
    return next;
  },

  changePlan(orgId: string, tier: PlanTier, cycle: BillingCycle, seats: number): OrgBilling {
    const cur = billingApi.get(orgId);
    const plan = getPlan(tier);
    const unit = cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
    const total = Math.max(plan.includedSeats, seats) * unit;

    const issuedAt = new Date();
    const periodEnd = new Date(issuedAt);
    if (cycle === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const invoices = [...cur.invoices];
    if (tier !== "free") {
      invoices.unshift({
        id: `inv_${Date.now()}`,
        number: `INV-${1000 + cur.invoices.length + 1}`,
        amount: total,
        currency: "USD",
        status: "paid",
        period_start: issuedAt.toISOString(),
        period_end: periodEnd.toISOString(),
        issued_at: issuedAt.toISOString(),
      });
    }

    return billingApi.save(orgId, {
      plan: tier,
      cycle,
      seats_purchased: Math.max(plan.includedSeats, seats),
      trial_ends_at: tier === "free" ? cur.trial_ends_at : null,
      renews_at: periodEnd.toISOString(),
      payment_method: tier === "free" ? cur.payment_method : (cur.payment_method ?? { brand: "Visa", last4: "4242", exp: "12/27" }),
      invoices,
    });
  },

  cancel(orgId: string): OrgBilling {
    return billingApi.changePlan(orgId, "free", "monthly", 3);
  },
};
