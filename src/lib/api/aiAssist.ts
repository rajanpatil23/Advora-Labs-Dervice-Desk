import { supabase } from "@/integrations/supabase/client";
import type { Ticket } from "@/lib/types";

export type Tone = "friendly" | "formal" | "concise" | "empathetic";
export type AssistTone = Tone;

export interface ThreadMsg {
  role: "agent" | "requester" | "system";
  author?: string;
  body: string;
  internal?: boolean;
}

export interface AssistTicketCtx {
  title: string;
  number?: string;
  priority?: string;
  status?: string;
  category?: string;
  subcategory?: string;
  requesterName?: string;
  channel?: string;
}

export interface DraftReply {
  label: string;
  body: string;
  groundedArticles: number[];
  asksClarifyingQuestion: boolean;
}

export interface Classification {
  category: string;
  subcategory: string;
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  confidence: number;
  rationale: string;
}

interface BasePayload {
  ticket: AssistTicketCtx;
  messages: ThreadMsg[];
  tone?: Tone;
  agentName?: string;
  customInstructions?: string;
  categories?: string[];
  kbArticles?: { title: string; excerpt: string }[];
  variantCount?: number;
}

async function call(mode: string, payload: BasePayload) {
  const { data, error } = await supabase.functions.invoke("ai-ticket-assist", {
    body: { mode, ...payload },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export async function summarizeThread(p: BasePayload): Promise<string> {
  const data = await call("summarize", p);
  return (data as any).summary ?? "";
}

export async function suggestDrafts(p: BasePayload): Promise<DraftReply[]> {
  const data = await call("suggest_drafts", p);
  return (data as any).drafts ?? [];
}

export async function suggestSingleReply(p: BasePayload): Promise<string> {
  const data = await call("suggest_reply", p);
  return (data as any).reply ?? "";
}

export async function categorizeTicket(p: BasePayload): Promise<Classification> {
  const data = await call("categorize", p);
  return (data as any).classification;
}

// ---------- Backwards-compatible namespace API used by existing components ----------

export function ticketToThread(t: Ticket): ThreadMsg[] {
  return (t.messages ?? []).map((m) => ({
    role: m.authorRole === "agent" ? "agent" : m.authorRole === "requester" ? "requester" : "system",
    author: m.authorName,
    body: m.body,
    internal: m.isInternal,
  }));
}

function ctxFromTicket(t: Ticket, requesterName?: string): AssistTicketCtx {
  return {
    title: t.title,
    number: t.number,
    priority: t.priority,
    status: t.status,
    category: t.category,
    subcategory: t.subcategory,
    requesterName,
    channel: t.channel,
  };
}

export const aiAssist = {
  async suggestReply(ticket: Ticket, requesterName?: string, tone: Tone = "friendly") {
    const reply = await suggestSingleReply({
      ticket: ctxFromTicket(ticket, requesterName),
      messages: ticketToThread(ticket),
      tone,
    });
    return { reply };
  },

  async suggestDrafts(
    ticket: Ticket,
    opts: {
      requesterName?: string;
      agentName?: string;
      tone?: Tone;
      variantCount?: number;
      kbArticles?: { title: string; excerpt: string }[];
      customInstructions?: string;
    },
  ) {
    const drafts = await suggestDrafts({
      ticket: ctxFromTicket(ticket, opts.requesterName),
      messages: ticketToThread(ticket),
      tone: opts.tone ?? "friendly",
      agentName: opts.agentName,
      variantCount: opts.variantCount,
      kbArticles: opts.kbArticles,
      customInstructions: opts.customInstructions,
    });
    return { drafts };
  },

  async summarize(ticket: Ticket, requesterName?: string) {
    const summary = await summarizeThread({
      ticket: ctxFromTicket(ticket, requesterName),
      messages: ticketToThread(ticket),
    });
    return { summary };
  },

  async categorize(ticket: Ticket, requesterName?: string, categories?: string[]) {
    const classification = await categorizeTicket({
      ticket: ctxFromTicket(ticket, requesterName),
      messages: ticketToThread(ticket),
      categories,
    });
    return { classification };
  },
};
