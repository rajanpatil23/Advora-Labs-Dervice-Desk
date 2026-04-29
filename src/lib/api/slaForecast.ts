// SLA breach prediction & forecasting
import type { Ticket } from "@/lib/types";

export interface BreachPrediction {
  ticketId: string;
  number: string;
  title: string;
  priority: string;
  assigneeId?: string;
  type: "response" | "resolution";
  dueAt: string;
  minutesRemaining: number;
  riskScore: number; // 0-100
  level: "safe" | "watch" | "at_risk" | "imminent" | "breached";
  reasons: string[];
}

export interface ForecastBucket {
  label: string; // e.g. "Next 1h"
  windowEndIso: string;
  predicted: number; // tickets predicted to breach in this window
  imminent: number; // already imminent/breached overlap
}

export interface ForecastSummary {
  total: number;
  breached: number;
  imminent: number;
  atRisk: number;
  watch: number;
  safe: number;
  buckets: ForecastBucket[];
  byPriority: Record<string, number>;
  byAssignee: Record<string, number>;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 1.0, high: 0.85, medium: 0.6, low: 0.4,
};

const STATUS_RISK: Record<string, number> = {
  new: 1.0, open: 0.9, in_progress: 0.55, on_hold: 0.85,
  resolved: 0, closed: 0,
};

function minutesBetween(a: string, b: string) {
  return (new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

function classify(score: number, minsLeft: number): BreachPrediction["level"] {
  if (minsLeft < 0) return "breached";
  if (minsLeft <= 30 || score >= 85) return "imminent";
  if (score >= 65) return "at_risk";
  if (score >= 40) return "watch";
  return "safe";
}

export function predictTicket(t: Ticket, now = new Date()): BreachPrediction[] {
  const out: BreachPrediction[] = [];
  if (t.status === "closed" || t.status === "resolved") return out;

  const isOpen = !["resolved", "closed"].includes(t.status);
  const checks: { type: "response" | "resolution"; dueAt?: string; alreadyMet: boolean }[] = [
    { type: "response", dueAt: t.responseDueAt, alreadyMet: !!t.firstResponseAt },
    { type: "resolution", dueAt: t.dueAt, alreadyMet: !!t.resolvedAt },
  ];

  for (const c of checks) {
    if (!c.dueAt || c.alreadyMet) continue;
    const minsLeft = minutesBetween(c.dueAt, now.toISOString());
    const reasons: string[] = [];

    // base risk: how close to deadline (1 day window)
    const proximity = Math.max(0, Math.min(1, 1 - minsLeft / (24 * 60)));
    let score = proximity * 70;
    if (proximity > 0.5) reasons.push("Less than 12h to deadline");

    // priority boost
    const pw = PRIORITY_WEIGHT[t.priority] ?? 0.5;
    score += pw * 15;
    if (pw >= 0.85) reasons.push(`${t.priority} priority`);

    // status risk
    const sr = STATUS_RISK[t.status] ?? 0.5;
    score += sr * 10;
    if (t.status === "new" || t.status === "open") reasons.push("Not yet picked up");
    if (t.status === "on_hold") reasons.push("On hold but clock still running");

    // unassigned
    if (!t.assigneeId && isOpen) {
      score += 8;
      reasons.push("Unassigned");
    }

    // already breached
    if (minsLeft < 0) {
      score = 100;
      reasons.unshift(`${c.type === "response" ? "Response" : "Resolution"} SLA breached`);
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    out.push({
      ticketId: t.id,
      number: t.number,
      title: t.title,
      priority: t.priority,
      assigneeId: t.assigneeId,
      type: c.type,
      dueAt: c.dueAt,
      minutesRemaining: Math.round(minsLeft),
      riskScore: score,
      level: classify(score, minsLeft),
      reasons,
    });
  }
  return out;
}

export function predictAll(tickets: Ticket[], now = new Date()): BreachPrediction[] {
  return tickets.flatMap(t => predictTicket(t, now))
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function summarize(predictions: BreachPrediction[], now = new Date()): ForecastSummary {
  const buckets: ForecastBucket[] = [
    { label: "Next 1h", windowEndIso: new Date(now.getTime() + 60 * 60_000).toISOString(), predicted: 0, imminent: 0 },
    { label: "1–4h", windowEndIso: new Date(now.getTime() + 4 * 60 * 60_000).toISOString(), predicted: 0, imminent: 0 },
    { label: "4–12h", windowEndIso: new Date(now.getTime() + 12 * 60 * 60_000).toISOString(), predicted: 0, imminent: 0 },
    { label: "12–24h", windowEndIso: new Date(now.getTime() + 24 * 60 * 60_000).toISOString(), predicted: 0, imminent: 0 },
  ];

  const summary: ForecastSummary = {
    total: predictions.length,
    breached: 0, imminent: 0, atRisk: 0, watch: 0, safe: 0,
    buckets, byPriority: {}, byAssignee: {},
  };

  for (const p of predictions) {
    summary[
      p.level === "at_risk" ? "atRisk" : p.level === "breached" ? "breached"
        : p.level === "imminent" ? "imminent" : p.level === "watch" ? "watch" : "safe"
    ]++;

    if (p.level !== "safe") {
      summary.byPriority[p.priority] = (summary.byPriority[p.priority] ?? 0) + 1;
      const k = p.assigneeId ?? "Unassigned";
      summary.byAssignee[k] = (summary.byAssignee[k] ?? 0) + 1;
    }

    // bucket only if predicted to breach (at_risk+) and not yet breached
    if (p.minutesRemaining >= 0 && (p.level === "at_risk" || p.level === "imminent")) {
      const m = p.minutesRemaining;
      const idx = m <= 60 ? 0 : m <= 240 ? 1 : m <= 720 ? 2 : m <= 1440 ? 3 : -1;
      if (idx >= 0) {
        buckets[idx].predicted++;
        if (p.level === "imminent") buckets[idx].imminent++;
      }
    }
  }
  return summary;
}

export const levelStyles: Record<BreachPrediction["level"], { label: string; cls: string }> = {
  breached: { label: "Breached", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  imminent: { label: "Imminent", cls: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  at_risk: { label: "At risk", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  watch: { label: "Watch", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  safe: { label: "Safe", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
};
