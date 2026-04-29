import { supabase } from "@/integrations/supabase/client";
import type { ChatSession } from "@/lib/api/liveChat";
import type { KbArticle } from "@/lib/types";

export interface BotReply {
  reply: string;
  confidence: number;
  shouldHandoff: boolean;
  handoffReason: string;
  groundedArticles: number[];
  suggestedQuickReplies: string[];
}

export async function chatbotGreet(opts: {
  visitor?: { name?: string; page?: string };
  brandName?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-chatbot", {
    body: { mode: "greet", visitor: opts.visitor, history: [], brandName: opts.brandName },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as { reply: string }).reply;
}

export async function chatbotAutoReply(opts: {
  session: ChatSession;
  kbArticles?: KbArticle[];
  brandName?: string;
}): Promise<BotReply> {
  const history = opts.session.messages.map(m => ({
    role: m.sender === "agent" ? "agent" as const
        : m.sender === "bot" ? "bot" as const
        : m.sender === "system" ? "system" as const
        : "visitor" as const,
    body: m.body,
  }));
  const { data, error } = await supabase.functions.invoke("ai-chatbot", {
    body: {
      mode: "auto_reply",
      visitor: { name: opts.session.visitor.name, page: opts.session.visitor.page },
      history,
      kbArticles: (opts.kbArticles ?? []).slice(0, 5).map(a => ({
        id: a.id, title: a.title, excerpt: a.excerpt,
      })),
      brandName: opts.brandName,
    },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as BotReply;
}
