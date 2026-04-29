import { supabase } from "@/integrations/supabase/client";
import type { KbArticle } from "@/lib/types";

export interface KbMatch {
  id: string;
  score: number;
  snippet: string;
  why: string;
}

export interface KbSearchResult {
  matches: KbMatch[];
  answer: string;
  answerable: boolean;
  deflectScore: number;
  suggestedFollowups: string[];
}

export async function searchKnowledgeBase(
  query: string,
  articles: KbArticle[],
  opts: { includeAnswer?: boolean; topK?: number } = {},
): Promise<KbSearchResult> {
  const { data, error } = await supabase.functions.invoke("ai-kb-search", {
    body: {
      query,
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        category: a.category,
        excerpt: a.excerpt,
        body: a.body,
      })),
      includeAnswer: opts.includeAnswer ?? true,
      topK: opts.topK ?? 5,
    },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as KbSearchResult;
}

// Deflection log (saved searches that closed without ticket creation)
export interface DeflectionEvent {
  id: string;
  query: string;
  bestArticleId?: string;
  deflectScore: number;
  outcome: "deflected" | "ticket_created";
  occurredAt: string;
}

const LOG_KEY = "kb_deflection_log_v1";

export function logDeflection(e: Omit<DeflectionEvent, "id" | "occurredAt">) {
  const all = listDeflections();
  all.unshift({
    ...e,
    id: `dfl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    occurredAt: new Date().toISOString(),
  });
  localStorage.setItem(LOG_KEY, JSON.stringify(all.slice(0, 200)));
}

export function listDeflections(): DeflectionEvent[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
}

export function deflectionStats(events: DeflectionEvent[]) {
  const total = events.length;
  const deflected = events.filter(e => e.outcome === "deflected").length;
  const rate = total ? deflected / total : 0;
  return { total, deflected, rate };
}
