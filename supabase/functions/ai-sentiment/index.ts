// Sentiment analysis edge function using Lovable AI
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash-lite";

interface MsgIn {
  id: string;
  body: string;
  role: "agent" | "requester" | "system";
}

interface Body {
  messages: MsgIn[];
  ticketTitle?: string;
}

interface ScoredMessage {
  id: string;
  sentiment: "very_negative" | "negative" | "neutral" | "positive" | "very_positive";
  score: number; // -1..1
  emotions: string[];
  urgencySignal: number; // 0..1
}

interface AnalysisResult {
  perMessage: ScoredMessage[];
  overall: {
    score: number;
    trend: "improving" | "declining" | "steady";
    riskLevel: "low" | "medium" | "high";
    summary: string;
    recommendedAction: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { messages, ticketTitle } = (await req.json()) as Body;
    const requesterMsgs = messages.filter((m) => m.role === "requester");
    if (requesterMsgs.length === 0) {
      return json({
        perMessage: [],
        overall: {
          score: 0, trend: "steady", riskLevel: "low",
          summary: "No customer messages to analyze.",
          recommendedAction: "Wait for the customer to respond.",
        },
      } as AnalysisResult);
    }

    const numbered = requesterMsgs
      .map((m, i) => `[${i + 1}] (id=${m.id})\n${m.body}`)
      .join("\n\n---\n\n");

    const tools = [
      {
        type: "function",
        function: {
          name: "emit_sentiment",
          description: "Return per-message and overall sentiment analysis.",
          parameters: {
            type: "object",
            properties: {
              perMessage: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    sentiment: {
                      type: "string",
                      enum: ["very_negative", "negative", "neutral", "positive", "very_positive"],
                    },
                    score: { type: "number", description: "-1 (very negative) to 1 (very positive)" },
                    emotions: {
                      type: "array",
                      items: { type: "string" },
                      description: "1–3 short emotion labels (frustrated, confused, grateful, etc.)",
                    },
                    urgencySignal: { type: "number", description: "0–1 perceived urgency from tone" },
                  },
                  required: ["id", "sentiment", "score", "emotions", "urgencySignal"],
                  additionalProperties: false,
                },
              },
              overall: {
                type: "object",
                properties: {
                  score: { type: "number", description: "-1..1, weighted toward most recent messages" },
                  trend: { type: "string", enum: ["improving", "declining", "steady"] },
                  riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                  summary: { type: "string", description: "1–2 sentences on the customer's mood." },
                  recommendedAction: {
                    type: "string",
                    description: "Concrete next step the agent should take (1 sentence).",
                  },
                },
                required: ["score", "trend", "riskLevel", "summary", "recommendedAction"],
                additionalProperties: false,
              },
            },
            required: ["perMessage", "overall"],
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
            "You are a customer-support sentiment analyst. Analyze ONLY the customer's (requester's) messages. Score each message and weight the overall mood toward more recent ones. Detect frustration escalation. Be calibrated — most neutral messages are NOT negative.",
        },
        {
          role: "user",
          content: `Ticket title: ${ticketTitle ?? "—"}\n\nCustomer messages, oldest first:\n\n${numbered}`,
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "emit_sentiment" } },
    };

    const r = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      if (r.status === 429) return json({ error: "Rate limit exceeded. Try again shortly." }, 429);
      if (r.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const text = await r.text();
      console.error("Gateway error:", r.status, text);
      return json({ error: "AI gateway error" }, 500);
    }
    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
    if (!args) return json({ error: "no result" }, 502);
    return json(args as AnalysisResult);
  } catch (e) {
    console.error("ai-sentiment error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
