// Client wrapper for the ai-ticket-assist edge function.
import { supabase } from "@/integrations/supabase/client";
import type { Ticket } from "@/lib/types";

export type AssistTone = "friendly" | "formal" | "concise" | "empathetic";

function ticketPayload(ticket: Ticket, requesterName?: string) {
  return {
    title: ticket.title,
    number: ticket.number,
    priority: ticket.priority,
    status: ticket.status,
    category: ticket.category,
    subcategory: ticket.subcategory,
    requesterName,
    channel: ticket.channel,
  };
}

function messagesPayload(ticket: Ticket) {
  return ticket.messages.map((m) => ({
    role: m.authorRole,
    author: m.authorName,
    body: m.body,
    internal: m.isInternal,
  }));
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-ticket-assist", { body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const aiAssist = {
  summarize: (ticket: Ticket, requesterName?: string) =>
    invoke<{ summary: string }>({
      mode: "summarize",
      ticket: ticketPayload(ticket, requesterName),
      messages: messagesPayload(ticket),
    }),

  suggestReply: (ticket: Ticket, requesterName?: string, tone: AssistTone = "friendly") =>
    invoke<{ reply: string }>({
      mode: "suggest_reply",
      ticket: ticketPayload(ticket, requesterName),
      messages: messagesPayload(ticket),
      tone,
    }),

  categorize: (ticket: Ticket, requesterName?: string, categories?: string[]) =>
    invoke<{
      classification: {
        category: string;
        subcategory: string;
        priority: "low" | "medium" | "high" | "critical";
        tags: string[];
        confidence: number;
        rationale: string;
      };
    }>({
      mode: "categorize",
      ticket: ticketPayload(ticket, requesterName),
      messages: messagesPayload(ticket),
      categories,
    }),
};
