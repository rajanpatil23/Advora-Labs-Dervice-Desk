import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  searchKnowledgeBase, logDeflection, listDeflections, deflectionStats,
  type KbSearchResult,
} from "@/lib/api/kbSearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Search, BookOpen, ThumbsUp, ThumbsDown, Loader2, Lightbulb,
  TrendingUp, MessageCircleQuestion, Plus, ExternalLink, History,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SAMPLE_QUERIES = [
  "How do I reset my password?",
  "VPN won't connect on macOS",
  "Cancel my subscription",
  "Two-factor authentication isn't working",
];

export default function KbAiSearch() {
  const articles = useAppStore(s => s.articles);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<KbSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(() => listDeflections());

  async function run(q: string = query) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await searchKnowledgeBase(q, articles);
      setResult(r);
      setQuery(q);
    } catch (e: any) {
      toast.error(e.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function recordOutcome(outcome: "deflected" | "ticket_created") {
    if (!result) return;
    logDeflection({
      query,
      bestArticleId: result.matches[0]?.id,
      deflectScore: result.deflectScore,
      outcome,
    });
    setHistory(listDeflections());
    toast.success(outcome === "deflected" ? "Marked as deflected ✨" : "Logged as escalated to ticket");
    if (outcome === "ticket_created") navigate("/portal/new");
  }

  const stats = useMemo(() => deflectionStats(history), [history]);
  const articleById = useMemo(
    () => new Map(articles.map(a => [a.id, a])),
    [articles],
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6" /> AI Knowledge search
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semantic search across {articles.length} articles · grounded answers · deflection tracking
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total searches" value={stats.total} icon={Search} />
        <StatCard label="Deflected" value={stats.deflected} icon={ThumbsUp} />
        <StatCard
          label="Deflection rate"
          value={`${Math.round(stats.rate * 100)}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") run(); }}
                placeholder="Ask a question or describe your issue…"
                className="pl-10 h-11 text-base"
              />
            </div>
            <Button onClick={() => run()} disabled={loading || !query.trim()} size="lg">
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…</>
                : <><Sparkles className="mr-2 h-4 w-4" /> Ask</>}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Try:</span>
            {SAMPLE_QUERIES.map(q => (
              <button
                key={q}
                onClick={() => { setQuery(q); run(q); }}
                className="px-2.5 py-1 rounded-full text-xs border hover:bg-accent transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!result && !loading && history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" /> Recent searches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {history.slice(0, 8).map(h => (
                <button
                  key={h.id}
                  onClick={() => { setQuery(h.query); run(h.query); }}
                  className="w-full text-left p-3 hover:bg-accent/50 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{h.query}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.occurredAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={h.outcome === "deflected" ? "secondary" : "outline"}>
                    {h.outcome === "deflected" ? "Deflected" : "Escalated"}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Answer */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  AI Answer
                </CardTitle>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Deflect score</div>
                  <div className="text-sm font-semibold tabular-nums">
                    {Math.round(result.deflectScore * 100)}%
                  </div>
                </div>
              </div>
              <Progress value={result.deflectScore * 100} className="h-1.5 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {result.answerable ? (
                <p className="text-sm leading-relaxed">{result.answer}</p>
              ) : (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium text-amber-600">Insufficient KB coverage</p>
                  <p className="mt-1 text-muted-foreground">{result.answer}</p>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">Was this helpful?</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => recordOutcome("deflected")}>
                    <ThumbsUp className="mr-2 h-4 w-4" /> Yes, this answers it
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => recordOutcome("ticket_created")}>
                    <ThumbsDown className="mr-2 h-4 w-4" /> Need to open a ticket
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Top matches ({result.matches.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {result.matches.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No relevant articles in the knowledge base. Consider creating one.
                </div>
              ) : (
                <div className="divide-y">
                  {result.matches.map((m, i) => {
                    const a = articleById.get(m.id);
                    return (
                      <div key={m.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">#{i + 1}</Badge>
                              {a?.category && <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>}
                              <span className="text-xs text-muted-foreground tabular-nums">
                                relevance {Math.round(m.score * 100)}%
                              </span>
                            </div>
                            <h3 className="font-medium">
                              {a?.title ?? "Unknown article"}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              "{m.snippet}"
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              <span className="font-medium">Why: </span>{m.why}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/portal/kb/${m.id}`)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-ups */}
          {result.suggestedFollowups.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircleQuestion className="h-4 w-4" /> People also ask
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedFollowups.map(q => (
                    <button
                      key={q}
                      onClick={() => { setQuery(q); run(q); }}
                      className="px-3 py-1.5 rounded-full text-xs border hover:bg-accent transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon,
}: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-lg p-2 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
