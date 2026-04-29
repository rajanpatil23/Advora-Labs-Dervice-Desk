import { supabase } from "@/integrations/supabase/client";

export type Tone = "friendly" | "formal" | "concise" | "empathetic";

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
