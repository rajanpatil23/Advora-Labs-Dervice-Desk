import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { analyzeSentiment, sentimentStyles, riskColor, type SentimentAnalysis } from "@/lib/api/sentiment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Search, Loader2, TrendingUp, TrendingDown, Minus,
  AlertTriangle, MessageCircle, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

export default function Sentiment() {
  const tickets = useAppStore(s => s.tickets);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [result, setResult] = useState<SentimentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setResult(null); }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets.slice(0, 100);
    return tickets.filter(t =>
      t.title.toLowerCase().includes(q) || t.number.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [tickets, search]);

  const selected = tickets.find(t => t.id === selectedId);
  const requesterMsgs = useMemo(
    () => selected?.messages.filter(m => m.authorRole === "requester") ?? [],
    [selected],
  );

  async function run() {
    if (!selected) return;
    setLoading(true);
    try {
      setResult(await analyzeSentiment(selected));
    } catch (e: any) {
      toast.error(e.message ?? "Sentiment analysis failed");
    } finally {
      setLoading(false);
    }
  }

  const TrendIcon = result?.overall.trend === "improving" ? TrendingUp
    : result?.overall.trend === "declining" ? TrendingDown : Minus;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Ticket list */}
      <Card className="w-80 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Customer mood
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto px-2 pb-2 space-y-1">
          {filtered.map(t => {
            const cm = t.messages.filter(m => m.authorRole === "requester").length;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                  selectedId === t.id ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
                  <Badge variant="outline" className="text-[10px]">{cm} msg</Badge>
                </div>
                <div className="line-clamp-1">{t.title}</div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Workbench */}
      <div className="flex-1 overflow-auto">
        {!selected ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-muted-foreground">Select a ticket</div>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{selected.number}</div>
                    <CardTitle className="text-xl">{selected.title}</CardTitle>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{selected.status}</Badge>
                      <Badge variant="outline" className="capitalize">{selected.priority}</Badge>
                      <Badge variant="secondary">{requesterMsgs.length} customer messages</Badge>
                    </div>
                  </div>
                  <Button onClick={run} disabled={loading || requesterMsgs.length === 0}>
                    {loading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
                      : <><Sparkles className="mr-2 h-4 w-4" /> Analyze mood</>}
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {!result && !loading && (
              <Card>
                <CardContent className="p-12 text-center text-sm text-muted-foreground">
                  Click "Analyze mood" to score sentiment, detect emotions, and get an action recommendation.
                </CardContent>
              </Card>
            )}

            {result && (
              <>
                {/* Overall summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Overall mood</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tabular-nums">
                          {result.overall.score.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 1.00</span>
                      </div>
                      <Progress
                        value={((result.overall.score + 1) / 2) * 100}
                        className="mt-2 h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Range −1.00 to +1.00</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3">
                      <TrendIcon className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="text-lg font-semibold capitalize">{result.overall.trend}</div>
                        <div className="text-xs text-muted-foreground">
                          across {result.perMessage.length} messages
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Risk level</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3">
                      <AlertTriangle className={`h-8 w-8 ${riskColor(result.overall.riskLevel)}`} />
                      <div>
                        <div className={`text-lg font-semibold capitalize ${riskColor(result.overall.riskLevel)}`}>
                          {result.overall.riskLevel}
                        </div>
                        <div className="text-xs text-muted-foreground">churn / escalation risk</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" /> AI summary & recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Summary</div>
                      <p className="text-sm">{result.overall.summary}</p>
                    </div>
                    <div className="rounded-md border bg-accent/30 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Recommended next action</div>
                      <p className="text-sm">{result.overall.recommendedAction}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Per-message breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Message-by-message</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {result.perMessage.map((sm, i) => {
                        const orig = requesterMsgs.find(m => m.id === sm.id);
                        const style = sentimentStyles[sm.sentiment];
                        return (
                          <div key={sm.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xl" aria-hidden>{style.emoji}</span>
                                <div>
                                  <div className="text-sm font-medium">
                                    Message #{i + 1} · {orig?.authorName ?? "Customer"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {orig?.createdAt ? new Date(orig.createdAt).toLocaleString() : ""}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className={style.cls}>{style.label}</Badge>
                                <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                                  score {sm.score.toFixed(2)} · urgency {Math.round(sm.urgencySignal * 100)}%
                                </div>
                              </div>
                            </div>
                            {orig && (
                              <p className="text-sm text-muted-foreground line-clamp-3 pl-9">
                                "{orig.body}"
                              </p>
                            )}
                            {sm.emotions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-9">
                                {sm.emotions.map(e => (
                                  <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
