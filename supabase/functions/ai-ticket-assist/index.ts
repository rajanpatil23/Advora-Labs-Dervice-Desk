// Lovable AI-powered ticket assist: summarize thread, suggest reply, auto-categorize.
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type Mode = "summarize" | "suggest_reply" | "categorize";

interface ThreadMsg {
  role: "agent" | "requester" | "system";
  author?: string;
  body: string;
  internal?: boolean;
}

interface Body {
  mode: Mode;
  ticket: {
    title: string;
    number?: string;
    priority?: string;
    status?: string;
    category?: string;
    subcategory?: string;
    requesterName?: string;
    channel?: string;
  };
  messages: ThreadMsg[];
  tone?: "friendly" | "formal" | "concise" | "empathetic";
  categories?: string[]; // hint set
}

function buildThread(messages: ThreadMsg[]): string {
  return messages
    .filter((m) => !m.internal)
    .map((m) => `[${m.role.toUpperCase()}${m.author ? ` · ${m.author}` : ""}]\n${m.body}`)
    .join("\n\n---\n\n");
}

async function callGateway(payload: unknown, apiKey: string) {
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const text = await r.text();
    return { ok: false as const, status: r.status, text };
  }
  const data = await r.json();
  return { ok: true as const, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Body;
    const { mode, ticket, messages, tone = "friendly", categories } = body;
    const thread = buildThread(messages);
    const ticketMeta = `Title: ${ticket.title}\nRequester: ${ticket.requesterName ?? "—"}\nChannel: ${ticket.channel ?? "—"}\nPriority: ${ticket.priority ?? "—"}\nStatus: ${ticket.status ?? "—"}\nCurrent category: ${ticket.category ?? "—"} / ${ticket.subcategory ?? "—"}`;

    if (mode === "summarize") {
      const payload = {
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a senior support analyst. Summarize support ticket threads for an agent picking up the case. Be tight, factual, and skimmable. Markdown allowed.",
          },
          {
            role: "user",
            content: `Summarize this ticket. Output sections:\n**Issue**, **What's been tried**, **Latest state**, **Recommended next step**. Max ~120 words.\n\n${ticketMeta}\n\nThread:\n${thread}`,
          },
        ],
      };
      const res = await callGateway(payload, apiKey);
      if (!res.ok) return errorResponse(res.status, res.text);
      const summary = res.data.choices?.[0]?.message?.content ?? "";
      return json({ summary });
    }

    if (mode === "suggest_reply") {
      const payload = {
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You draft customer support replies. Match the requested tone. Address the customer by first name when known. Do not invent facts. If information is missing, ask one targeted clarifying question. Output ONLY the reply body, no preamble or sign-off line beyond a brief closing.",
          },
          {
            role: "user",
            content: `Tone: ${tone}\nAgent first-person voice. Plain text, ~80–140 words.\n\n${ticketMeta}\n\nThread so far:\n${thread}\n\nWrite the next reply now.`,
          },
        ],
      };
      const res = await callGateway(payload, apiKey);
      if (!res.ok) return errorResponse(res.status, res.text);
      const reply = res.data.choices?.[0]?.message?.content ?? "";
      return json({ reply });
    }

    if (mode === "categorize") {
      const cats = categories?.length
        ? categories
        : ["Access", "Hardware", "Software", "Network", "Account", "Billing", "Other"];
      const tools = [
        {
          type: "function",
          function: {
            name: "set_classification",
            description: "Classify this support ticket.",
            parameters: {
              type: "object",
              properties: {
                category: { type: "string", enum: cats },
                subcategory: { type: "string", description: "Short noun phrase, max 4 words." },
                priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "1–4 short kebab/lower-case tags.",
                },
                confidence: { type: "number", description: "0–1" },
                rationale: { type: "string", description: "1 sentence." },
              },
              required: ["category", "subcategory", "priority", "tags", "confidence", "rationale"],
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
              "You classify support tickets. Choose the single best category from the provided enum. Use the call exactly once.",
          },
          {
            role: "user",
            content: `${ticketMeta}\n\nThread:\n${thread}`,
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "set_classification" } },
      };
      const res = await callGateway(payload, apiKey);
      if (!res.ok) return errorResponse(res.status, res.text);
      const tc = res.data.choices?.[0]?.message?.tool_calls?.[0];
      const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
      if (!args) return json({ error: "no classification" }, 502);
      return json({ classification: args });
    }

    return json({ error: "unknown mode" }, 400);
  } catch (e) {
    console.error("ai-ticket-assist error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, text: string) {
  if (status === 429)
    return json({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
  if (status === 402)
    return json(
      { error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." },
      402,
    );
  console.error("Gateway error:", status, text);
  return json({ error: "AI gateway error" }, 500);
}
