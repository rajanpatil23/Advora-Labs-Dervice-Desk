import { useMemo, useState } from "react";
import { Sparkles, Loader2, RefreshCw, Check, BookOpen, Wand2, MessageSquare, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Ticket } from "@/lib/types";
import { aiAssist, type AssistTone } from "@/lib/api/aiAssist";
import { useOrgArticles } from "@/lib/store";

const TONES: { value: AssistTone; label: string; hint: string }[] = [
  { value: "friendly", label: "Friendly", hint: "Warm, approachable" },
  { value: "formal", label: "Formal", hint: "Professional, B2B" },
  { value: "concise", label: "Concise", hint: "Direct, brief" },
  { value: "empathetic", label: "Empathetic", hint: "Acknowledge feelings" },
];

interface Draft {
  label: string;
  body: string;
  groundedArticles: number[];
  asksClarifyingQuestion: boolean;
}

interface Props {
  ticket: Ticket;
  requesterName?: string;
  agentName?: string;
  onUse: (text: string) => void;
}

/**
 * Picks KB articles that look relevant to this ticket using simple keyword overlap.
 * Returns top N (default 4) shaped for the AI gateway.
 */
function selectRelevantArticles(
  ticket: Ticket,
  articles: ReturnType<typeof useOrgArticles>,
  n = 4,
) {
  const haystack = `${ticket.title} ${ticket.category ?? ""} ${ticket.subcategory ?? ""} ${ticket.tags?.join(" ") ?? ""} ${ticket.messages
    .filter((m) => !m.isInternal)
    .slice(-3)
    .map((m) => m.body)
    .join(" ")}`.toLowerCase();
  const tokens = new Set(
    haystack
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3),
  );

  const scored = articles.map((a) => {
    const blob = `${a.title} ${a.category} ${a.excerpt}`.toLowerCase();
    let score = 0;
    tokens.forEach((tok) => {
      if (blob.includes(tok)) score += 1;
    });
    if (a.category && ticket.category && a.category.toLowerCase() === ticket.category.toLowerCase()) score += 3;
    return { a, score };
  });

  return scored
    .sort((x, y) => y.score - x.score)
    .filter((s) => s.score > 0)
    .slice(0, n)
    .map((s) => ({ title: s.a.title, excerpt: s.a.excerpt, ref: s.a }));
}

export function ReplyDraftsDialog({ ticket, requesterName, agentName, onUse }: Props) {
  const articles = useOrgArticles();
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<AssistTone>("friendly");
  const [count, setCount] = useState<2 | 3 | 4>(3);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [active, setActive] = useState(0);

  const grounded = useMemo(() => selectRelevantArticles(ticket, articles, 4), [ticket, articles]);

  const generate = async () => {
    setBusy(true);
    try {
      const { drafts: result } = await aiAssist.suggestDrafts(ticket, {
        requesterName,
        agentName,
        tone,
        variantCount: count,
        kbArticles: grounded.map((g) => ({ title: g.title, excerpt: g.excerpt })),
        customInstructions: instructions || undefined,
      });
      setDrafts(result);
      setActive(0);
      toast.success(`${result.length} drafts ready`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const useDraft = (d: Draft) => {
    onUse(d.body);
    setOpen(false);
    toast.success("Draft inserted into composer");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDrafts([]); }}>
      <DialogTrigger asChild>
        <button
          className="h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 bg-gradient-primary/10 hover:bg-gradient-primary/20 text-primary border border-primary/20 transition-colors"
          title="Generate AI reply variations"
        >
          <Sparkles className="h-3 w-3" /> AI drafts
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI reply drafts
            <Badge variant="outline" className="ml-2 text-[10px] font-normal">{ticket.number}</Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Generate multiple grounded variations. Pick one, edit, and send.
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-[280px_1fr] flex-1 min-h-0">
          {/* Controls */}
          <div className="border-r p-4 space-y-4 bg-muted/20 overflow-y-auto">
            <div>
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as AssistTone)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col items-start py-0.5">
                        <span className="text-sm">{t.label}</span>
                        <span className="text-[10px] text-muted-foreground">{t.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Number of drafts</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n as 2 | 3 | 4)}
                    className={cn(
                      "h-9 rounded-md text-sm font-semibold border transition",
                      count === n ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Custom instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Offer a 10% discount, mention our 24/7 support…"
                rows={3}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5"><BookOpen className="h-3 w-3" /> Grounding context</Label>
                <span className="text-[10px] text-muted-foreground">{grounded.length} article{grounded.length === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-1 space-y-1">
                {grounded.length === 0 && <p className="text-[11px] text-muted-foreground italic">No matching KB articles found. Drafts will rely on the conversation only.</p>}
                {grounded.map((g, i) => (
                  <div key={g.ref.id} className="text-[11px] p-1.5 rounded border bg-card">
                    <span className="text-muted-foreground mr-1">[{i + 1}]</span>
                    <span className="font-medium">{g.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={generate} disabled={busy} className="w-full">
              {busy ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating…</>
              ) : drafts.length > 0 ? (
                <><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate</>
              ) : (
                <><Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate drafts</>
              )}
            </Button>
          </div>

          {/* Drafts */}
          <div className="flex flex-col min-h-0">
            {drafts.length === 0 && !busy && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-sm text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No drafts yet</p>
                <p className="text-xs mt-1 max-w-xs">Adjust the controls on the left, then click <strong>Generate drafts</strong> to see {count} variations.</p>
              </div>
            )}

            {busy && drafts.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Loader2 className="h-7 w-7 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Crafting {count} {tone} variations…</p>
              </div>
            )}

            {drafts.length > 0 && (
              <>
                {/* Tabs */}
                <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
                  {drafts.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5",
                        active === i ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground",
                      )}
                    >
                      <span className="opacity-60">#{i + 1}</span>
                      {d.label}
                      {d.asksClarifyingQuestion && <span className="text-[9px] opacity-70">(?)</span>}
                    </button>
                  ))}
                </div>

                <ScrollArea className="flex-1 p-5">
                  {(() => {
                    const d = drafts[active];
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">{d.label}</Badge>
                          {d.asksClarifyingQuestion && <Badge variant="outline" className="text-amber-600 border-amber-500/40">Asks a clarifying question</Badge>}
                          {d.groundedArticles.length > 0 && (
                            <Badge variant="outline" className="text-primary border-primary/40">
                              <BookOpen className="h-3 w-3 mr-1" />
                              Grounded in {d.groundedArticles.length} article{d.groundedArticles.length === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>

                        <Textarea
                          value={d.body}
                          onChange={(e) => {
                            const next = [...drafts];
                            next[active] = { ...d, body: e.target.value };
                            setDrafts(next);
                          }}
                          rows={12}
                          className="text-sm leading-relaxed font-sans"
                        />

                        {d.groundedArticles.length > 0 && (
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              <BookOpen className="h-3 w-3" /> Sources
                            </div>
                            <ul className="space-y-1">
                              {d.groundedArticles.map((idx) => {
                                const src = grounded[idx - 1];
                                if (!src) return null;
                                return (
                                  <li key={idx} className="text-xs flex items-center gap-1.5">
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium">{src.title}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </ScrollArea>

                <div className="flex items-center justify-between gap-2 p-3 border-t bg-muted/20">
                  <div className="text-[11px] text-muted-foreground">
                    Edits are kept locally. Inserting will replace the composer text.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => useDraft(drafts[active])}>
                      <Check className="h-4 w-4 mr-1" /> Use this draft
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
