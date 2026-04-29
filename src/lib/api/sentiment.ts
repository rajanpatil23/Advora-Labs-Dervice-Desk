import { supabase } from "@/integrations/supabase/client";
import type { Ticket } from "@/lib/types";

export type SentimentLevel =
  | "very_negative" | "negative" | "neutral" | "positive" | "very_positive";

export interface ScoredMessage {
  id: string;
  sentiment: SentimentLevel;
  score: number;
  emotions: string[];
  urgencySignal: number;
}

export interface SentimentAnalysis {
  perMessage: ScoredMessage[];
  overall: {
    score: number;
    trend: "improving" | "declining" | "steady";
    riskLevel: "low" | "medium" | "high";
    summary: string;
    recommendedAction: string;
  };
}

export async function analyzeSentiment(ticket: Ticket): Promise<SentimentAnalysis> {
  const messages = (ticket.messages ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    role: m.authorRole === "agent" ? "agent" as const
        : m.authorRole === "requester" ? "requester" as const
        : "system" as const,
  }));
  const { data, error } = await supabase.functions.invoke("ai-sentiment", {
    body: { messages, ticketTitle: ticket.title },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as SentimentAnalysis;
}

export const sentimentStyles: Record<SentimentLevel, { label: string; cls: string; emoji: string }> = {
  very_negative: { label: "Very negative", cls: "bg-destructive/15 text-destructive border-destructive/30", emoji: "😡" },
  negative:      { label: "Negative",      cls: "bg-orange-500/15 text-orange-600 border-orange-500/30", emoji: "😟" },
  neutral:       { label: "Neutral",       cls: "bg-muted text-foreground border-border", emoji: "😐" },
  positive:      { label: "Positive",      cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", emoji: "🙂" },
  very_positive: { label: "Very positive", cls: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40", emoji: "😄" },
};

export function riskColor(level: "low" | "medium" | "high") {
  if (level === "high") return "text-destructive";
  if (level === "medium") return "text-amber-600";
  return "text-emerald-600";
}
