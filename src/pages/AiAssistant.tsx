import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import {
  summarizeThread, suggestDrafts, categorizeTicket,
  type Tone, type DraftReply, type Classification, type ThreadMsg,
} from "@/lib/api/aiAssist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Search, Copy, RefreshCw, FileText, Tags, MessageSquareText,
  Loader2, HelpCircle, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { Ticket, Message } from "@/lib/types";

const TONES: Tone[] = ["friendly", "formal", "concise", "empathetic"];

function toThreadMessages(msgs: Message[]): ThreadMsg[] {
  return msgs.map(m => ({
    role: m.kind === "agent" ? "agent" : m.kind === "requester" ? "requester" : "system",
    author: m.author,
    body: m.body,
    internal: m.internal,
  }));
}

export default function AiAssistant() {
  const tickets = useAppStore(s => s.tickets);
  const articles = useAppStore(s => s.articles);
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [tone, setTone] = useState<Tone>("friendly");
  const [variantCount, setVariantCount] = useState(3);
  const [customInstructions, setCustomInstructions] = useState("");

  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [drafts, setDrafts] = useState<DraftReply[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  const [classification, setClassification] = useState<Classification | null>(null);
  const [classifyLoading, setClassifyLoading] = useState(false);

  useEffect(() => {
    setSummary(""); setDrafts([]); setClassification(null);
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets.slice(0, 100);
    return tickets.filter(t =>
      t.title.toLowerCase().includes(q) || t.number.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [tickets, search]);

  const selected = tickets.find(t => t.id === selectedId);

  function buildBase() {
    if (!selected) return null;
    return {
      ticket: {
        title: selected.title,
        number: selected.number,
        priority: selected.priority,
        status: selected.status,
        category: selected.category,
        subcategory: selected.subcategory,
        channel: selected.channel,
      },
      messages: toThreadMessages(selected.messages),
      tone,
      agentName: user?.email ?? "the agent",
      customInstructions: customInstructions || undefined,
    };
  }

  async function runSummary() {
    const base = buildBase();
    if (!base) return;
    setSummaryLoading(true);
    try {
      setSummary(await summarizeThread(base));
    } catch (e: any) {
      toast.error(e.message ?? "Summary failed");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function runDrafts() {
    const base = buildBase();
    if (!base) return;
    setDraftsLoading(true);
    try {
      const kbArticles = articles.slice(0, 4).map(a => ({
        title: a.title,
        excerpt: a.body.slice(0, 400),
      }));
      const result = await suggestDrafts({ ...base, variantCount, kbArticles });
      setDrafts(result);
    } catch (e: any) {
      toast.error(e.message ?? "Draft generation failed");
    } finally {
      setDraftsLoading(false);
    }
  }

  async function runCategorize() {
    const base = buildBase();
    if (!base) return;
    setClassifyLoading(true);
    try {
      setClassification(await categorizeTicket(base));
    } catch (e: any) {
      toast.error(e.message ?? "Classification failed");
    } finally {
      setClassifyLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Ticket picker */}
      <Card className="w-80 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Assistant
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
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                selectedId === t.id ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>
              </div>
              <div className="line-clamp-1">{t.title}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No tickets</div>
          )}
        </CardContent>
      </Card>

      {/* Workbench */}
      <div className="flex-1 overflow-auto">
        {!selected ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-muted-foreground">Pick a ticket to start</div>
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
                      <Badge variant="secondary">{selected.messages.length} messages</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tone</label>
                  <Select value={tone} onValueChange={v => setTone(v as Tone)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Draft variants</label>
                  <Select value={String(variantCount)} onValueChange={v => setVariantCount(Number(v))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} drafts</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Extra instructions</label>
                  <Input
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    placeholder="e.g. mention our 24h SLA"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="drafts">
              <TabsList>
                <TabsTrigger value="drafts">
                  <MessageSquareText className="mr-2 h-4 w-4" /> Reply drafts
                </TabsTrigger>
                <TabsTrigger value="summary">
                  <FileText className="mr-2 h-4 w-4" /> Summary
                </TabsTrigger>
                <TabsTrigger value="classify">
                  <Tags className="mr-2 h-4 w-4" /> Classify
                </TabsTrigger>
              </TabsList>

              <TabsContent value="drafts" className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Button onClick={runDrafts} disabled={draftsLoading}>
                    {draftsLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
                      : <><Sparkles className="mr-2 h-4 w-4" /> Generate {variantCount} drafts</>}
                  </Button>
                  {drafts.length > 0 && (
                    <Button variant="outline" onClick={runDrafts} disabled={draftsLoading} size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    Grounded on {Math.min(articles.length, 4)} KB articles
                  </span>
                </div>

                {drafts.length === 0 && !draftsLoading && (
                  <Card>
                    <CardContent className="p-12 text-center text-sm text-muted-foreground">
                      No drafts yet. Click "Generate" to get {variantCount} different angles.
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {drafts.map((d, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{d.label}</CardTitle>
                          <div className="flex items-center gap-1">
                            {d.asksClarifyingQuestion && (
                              <Badge variant="outline" className="text-[10px]">
                                <HelpCircle className="mr-1 h-3 w-3" /> Asks question
                              </Badge>
                            )}
                            {d.groundedArticles.length > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                <BookOpen className="mr-1 h-3 w-3" /> KB {d.groundedArticles.join(", ")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Textarea
                          value={d.body}
                          onChange={e => {
                            const next = [...drafts];
                            next[i] = { ...d, body: e.target.value };
                            setDrafts(next);
                          }}
                          rows={8}
                          className="text-sm"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(d.body);
                              toast.success("Copied to clipboard");
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" /> Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="summary" className="mt-4 space-y-3">
                <Button onClick={runSummary} disabled={summaryLoading}>
                  {summaryLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing…</>
                    : <><Sparkles className="mr-2 h-4 w-4" /> Summarize thread</>}
                </Button>
                <Card>
                  <CardContent className="p-4 min-h-[200px]">
                    {summary ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{summary}</pre>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-12">
                        Generate a concise summary of the entire ticket history.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="classify" className="mt-4 space-y-3">
                <Button onClick={runCategorize} disabled={classifyLoading}>
                  {classifyLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Classifying…</>
                    : <><Tags className="mr-2 h-4 w-4" /> Suggest classification</>}
                </Button>
                {classification ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Category" value={classification.category} />
                        <Field label="Subcategory" value={classification.subcategory} />
                        <Field label="Priority" value={classification.priority} />
                        <Field label="Confidence" value={`${Math.round(classification.confidence * 100)}%`} />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Tags</div>
                        <div className="flex flex-wrap gap-1.5">
                          {classification.tags.map(t => (
                            <Badge key={t} variant="secondary">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Rationale</div>
                        <p className="text-sm">{classification.rationale}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center text-sm text-muted-foreground">
                      Get an AI suggestion for category, priority, and tags.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-medium capitalize">{value}</div>
    </div>
  );
}
