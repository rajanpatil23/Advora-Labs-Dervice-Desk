// AI knowledge base search + answer with citations
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface ArticleIn {
  id: string;
  title: string;
  category?: string;
  excerpt: string;
  body: string;
}

interface Body {
  query: string;
  articles: ArticleIn[];
  includeAnswer?: boolean;
  topK?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { query, articles, includeAnswer = true, topK = 5 } = (await req.json()) as Body;
    if (!query?.trim()) return json({ error: "query required" }, 400);
    if (!articles?.length) return json({ matches: [], answer: null, deflectScore: 0 });

    // Cap article body to keep prompt small
    const trimmed = articles.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      excerpt: (a.excerpt ?? "").slice(0, 240),
      body: (a.body ?? "").slice(0, 1200),
    }));

    const docList = trimmed
      .map((a, i) => `[${i + 1}] id=${a.id} | ${a.title}${a.category ? ` (${a.category})` : ""}\n${a.excerpt}\n${a.body}`)
      .join("\n\n---\n\n");

    const tools = [
      {
        type: "function",
        function: {
          name: "emit_search",
          description: "Return ranked KB matches plus an optional grounded answer.",
          parameters: {
            type: "object",
            properties: {
              matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    score: { type: "number", description: "0..1 relevance" },
                    snippet: { type: "string", description: "Short quoted snippet from the article that addresses the query." },
                    why: { type: "string", description: "Why this article matches (1 sentence)." },
                  },
                  required: ["id", "score", "snippet", "why"],
                  additionalProperties: false,
                },
              },
              answer: {
                type: "string",
                description: "Grounded answer to the query in 2–4 sentences. Use ONLY facts from the articles. If insufficient, say so.",
              },
              answerable: { type: "boolean", description: "True if articles contain enough info to answer." },
              deflectScore: { type: "number", description: "0..1 likelihood the customer can self-serve from KB." },
              suggestedFollowups: {
                type: "array",
                items: { type: "string" },
                description: "1–3 follow-up questions the user might also ask.",
              },
            },
            required: ["matches", "answer", "answerable", "deflectScore", "suggestedFollowups"],
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
            "You are a knowledge base search engine. Rank the provided articles by semantic relevance to the user's query and produce a grounded answer using ONLY facts from those articles. Do not hallucinate. If no article is relevant, return matches=[] and answerable=false.",
        },
        {
          role: "user",
          content: `User query: ${query}\n\nReturn the top ${topK} matches.${includeAnswer ? "" : " Skip the answer."}\n\nArticles:\n\n${docList}`,
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "emit_search" } },
    };

    const r = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      if (r.status === 429) return json({ error: "Rate limit exceeded." }, 429);
      if (r.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const text = await r.text();
      console.error("Gateway error:", r.status, text);
      return json({ error: "AI gateway error" }, 500);
    }
    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
    if (!args) return json({ error: "no result" }, 502);
    return json(args);
  } catch (e) {
    console.error("ai-kb-search error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
