import { useState } from "react";
import { Sparkles, Wand2, Loader2, RefreshCw, Check, ChevronDown, FileText } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { aiAssist, type AssistTone } from "@/lib/api/aiAssist";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TONES: { value: AssistTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "concise", label: "Concise" },
  { value: "empathetic", label: "Empathetic" },
];

interface Classification {
  category: string;
  subcategory: string;
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  confidence: number;
  rationale: string;
}

export function AssistSuggestButton({
  ticket,
  requesterName,
  onSuggestion,
}: {
  ticket: Ticket;
  requesterName?: string;
  onSuggestion: (text: string) => void;
}) {
  const [tone, setTone] = useState<AssistTone>("friendly");
  const [busy, setBusy] = useState(false);

  const run = async (t: AssistTone) => {
    setTone(t);
    setBusy(true);
    try {
      const { reply } = await aiAssist.suggestReply(ticket, requesterName, t);
      if (!reply.trim()) throw new Error("Empty suggestion");
      onSuggestion(reply.trim());
      toast.success("AI draft inserted", { description: `Tone: ${t}` });
    } catch (e) {
      toast.error("AI suggest failed", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center">
      <button
        onClick={() => run(tone)}
        disabled={busy}
        className="text-[11px] text-primary hover:underline flex items-center gap-1 px-2 py-1 disabled:opacity-60"
        title="Draft a reply with AI"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        AI suggest
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="text-[11px] text-muted-foreground hover:text-foreground p-1"
            title="Choose tone"
            disabled={busy}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {TONES.map((t) => (
            <DropdownMenuItem key={t.value} onClick={() => run(t.value)}>
              <Wand2 className="h-3 w-3 mr-2" />
              <span className="flex-1">{t.label}</span>
              {t.value === tone && <Check className="h-3 w-3" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AssistInsightsPanel({
  ticket,
  requesterName,
}: {
  ticket: Ticket;
  requesterName?: string;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const { setPriority } = useAppStore();

  const runSummary = async () => {
    setSummaryBusy(true);
    try {
      const { summary } = await aiAssist.summarize(ticket, requesterName);
      setSummary(summary);
    } catch (e) {
      toast.error("Summarize failed", { description: (e as Error).message });
    } finally {
      setSummaryBusy(false);
    }
  };

  const runClassify = async () => {
    setClassifying(true);
    setClassification(null);
    try {
      const { classification } = await aiAssist.categorize(ticket, requesterName);
      setClassification(classification);
    } catch (e) {
      toast.error("Categorize failed", { description: (e as Error).message });
    } finally {
      setClassifying(false);
    }
  };

  const applyPriority = () => {
    if (!classification) return;
    setPriority(ticket.id, classification.priority);
    toast.success(`Priority set to ${classification.priority}`);
  };

  return (
    <div className="space-y-3">
      {/* Summarize */}
      <div className="rounded-lg border border-border bg-surface-2/40 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <FileText className="h-3 w-3 text-primary" /> Thread summary
          </div>
          <button
            onClick={runSummary}
            disabled={summaryBusy}
            className="text-[10px] text-primary hover:underline flex items-center gap-1 disabled:opacity-60"
          >
            {summaryBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : summary ? (
              <RefreshCw className="h-2.5 w-2.5" />
            ) : (
              <Sparkles className="h-2.5 w-2.5" />
            )}
            {summary ? "Refresh" : "Generate"}
          </button>
        </div>
        {summary ? (
          <div className="text-[11px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
            {summary}
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground italic">
            One-click recap of the conversation.
          </div>
        )}
      </div>

      {/* Categorize */}
      <div className="rounded-lg border border-border bg-surface-2/40 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <Wand2 className="h-3 w-3 text-primary" /> Auto-categorize
          </div>
          <button
            onClick={runClassify}
            disabled={classifying}
            className="text-[10px] text-primary hover:underline flex items-center gap-1 disabled:opacity-60"
          >
            {classifying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : classification ? (
              <RefreshCw className="h-2.5 w-2.5" />
            ) : (
              <Sparkles className="h-2.5 w-2.5" />
            )}
            {classification ? "Re-run" : "Analyze"}
          </button>
        </div>
        {classification ? (
          <div className="space-y-1.5">
            <Row label="Category">
              <span>{classification.category} / {classification.subcategory}</span>
            </Row>
            <Row label="Priority">
              <span className="capitalize">{classification.priority}</span>
              <button
                onClick={applyPriority}
                className="ml-2 text-[10px] text-primary hover:underline"
              >
                Apply
              </button>
            </Row>
            <Row label="Tags">
              <div className="flex flex-wrap gap-1">
                {classification.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </Row>
            <div className="text-[10px] text-muted-foreground italic pt-1">
              {classification.rationale}{" "}
              <span className="font-mono not-italic">
                · {Math.round(classification.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground italic">
            Suggest category, priority, and tags from the thread.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <div className={cn("flex-1 min-w-0 flex items-center flex-wrap")}>{children}</div>
    </div>
  );
}
