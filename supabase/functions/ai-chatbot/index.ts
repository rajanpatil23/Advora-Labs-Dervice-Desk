// AI chatbot for live chat: greet, suggest answer, decide handoff
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface ChatTurn {
  role: "visitor" | "agent" | "bot" | "system";
  body: string;
}
interface KbDoc { id: string; title: string; excerpt: string }

interface Body {
  mode: "auto_reply" | "greet";
  visitor?: { name?: string; page?: string };
  history: ChatTurn[];
  kbArticles?: KbDoc[];
  brandName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { mode, visitor, history, kbArticles = [], brandName = "our team" } = (await req.json()) as Body;

    if (mode === "greet") {
      const payload = {
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You write short, warm chat greetings for a website visitor. 1 sentence, max 20 words. Mention the page if useful.",
          },
          {
            role: "user",
            content: `Brand: ${brandName}\nVisitor name: ${visitor?.name ?? "there"}\nPage: ${visitor?.page ?? "/"}`,
          },
        ],
      };
      const r = await fetch(GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return aiError(r);
      const data = await r.json();
      return json({ reply: (data.choices?.[0]?.message?.content ?? "").trim() });
    }

    // auto_reply
    const turns = history.slice(-12)
      .map((t, i) => `[${i + 1}] ${t.role.toUpperCase()}: ${t.body}`)
      .join("\n");
    const kb = kbArticles.length
      ? `\n\nKnowledge base snippets you may ground in (cite by number if used):\n${
          kbArticles.map((a, i) => `[${i + 1}] ${a.title}\n${a.excerpt.slice(0, 400)}`).join("\n\n")
        }`
      : "";

    const tools = [
      {
        type: "function",
        function: {
          name: "emit_bot_reply",
          description: "Decide what the chatbot should do next.",
          parameters: {
            type: "object",
            properties: {
              reply: { type: "string", description: "What the bot should say (1–3 sentences). Friendly, concrete." },
              confidence: { type: "number", description: "0–1 how confident the bot is in its answer." },
              shouldHandoff: { type: "boolean", description: "True if a human agent should take over." },
              handoffReason: { type: "string", description: "Brief reason for handoff, empty if not handing off." },
              groundedArticles: { type: "array", items: { type: "integer" }, description: "1-based KB snippet indices used. Empty if none." },
              suggestedQuickReplies: { type: "array", items: { type: "string" }, description: "0–3 short follow-up options the visitor might tap." },
            },
            required: ["reply", "confidence", "shouldHandoff", "handoffReason", "groundedArticles", "suggestedQuickReplies"],
            additionalProperties: false,
          },
        },
      },
    ];

    const payload = {
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful website chatbot. Answer using ONLY the provided KB snippets. If the visitor needs account-specific help, asks to speak to a human, expresses anger, or you cannot answer confidently from KB, set shouldHandoff=true. Keep replies concise.",
        },
        {
          role: "user",
          content: `Brand: ${brandName}\nVisitor name: ${visitor?.name ?? "—"}\nPage: ${visitor?.page ?? "—"}\n\nConversation so far:\n${turns}${kb}\n\nWhat should the bot say next?`,
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "emit_bot_reply" } },
    };

    const r = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return aiError(r);
    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
    if (!args) return json({ error: "no result" }, 502);
    return json(args);
  } catch (e) {
    console.error("ai-chatbot error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function aiError(r: Response) {
  if (r.status === 429) return json({ error: "Rate limit exceeded." }, 429);
  if (r.status === 402) return json({ error: "AI credits exhausted." }, 402);
  console.error("Gateway error:", r.status, await r.text());
  return json({ error: "AI gateway error" }, 500);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
