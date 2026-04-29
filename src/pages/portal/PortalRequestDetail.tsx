import { useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle2, Clock, Loader2, X } from "lucide-react";
import { useAppStore, findUser } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PortalRequestDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { tickets, addMessage, setStatus } = useAppStore();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const ticket = useMemo(() => tickets.find((t) => t.id === id), [tickets, id]);

  if (!ticket) return <Navigate to="/portal/requests" replace />;
  if (ticket.requesterId !== user?.id) {
    // Requesters can only view their own tickets
    return <Navigate to="/portal/requests" replace />;
  }

  // Public messages only — never show internal notes to requesters
  const visibleMessages = ticket.messages.filter((m) => !m.isInternal);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      addMessage(ticket.id, reply.trim(), false);
      setReply("");
      toast.success("Reply sent");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setStatus(ticket.id, "closed");
    toast.success("Request cancelled");
  };

  const isClosed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <Link to="/portal/requests" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> All requests
      </Link>

      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{ticket.number}</span>
          <span>·</span>
          <span>{ticket.category}</span>
          <span>·</span>
          <span>Submitted {timeAgo(ticket.createdAt)}</span>
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl">{ticket.title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusChip status={ticket.status} />
          <PriorityChip priority={ticket.priority} />
        </div>
      </header>

      {/* Status timeline */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <Timeline status={ticket.status} />
      </section>

      {/* Original description */}
      {ticket.description && (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Your description</div>
          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
        </section>
      )}

      {/* Conversation */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Conversation</h2>
        {visibleMessages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            No replies yet. We'll notify you when an agent responds.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMessages.map((m) => {
              const author = findUser(m.authorId);
              const mine = m.authorId === user?.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-3",
                    mine && "flex-row-reverse"
                  )}
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                    style={{ background: author?.avatarColor ?? "#94a3b8" }}
                  >
                    {author?.initials ?? "?"}
                  </div>
                  <div className={cn("flex-1 max-w-[80%]", mine && "items-end")}>
                    <div className={cn("flex items-center gap-2 text-[11px] text-muted-foreground mb-1", mine && "justify-end")}>
                      <span className="font-medium text-foreground">{mine ? "You" : (author?.name ?? "Agent")}</span>
                      <span>·</span>
                      <span>{timeAgo(m.createdAt)}</span>
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                        mine ? "bg-gradient-primary text-primary-foreground rounded-tr-sm" : "bg-surface border border-border rounded-tl-sm"
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply box */}
        {!isClosed ? (
          <form onSubmit={send} className="rounded-2xl border border-border bg-surface p-3 space-y-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Add a reply…"
              className="w-full px-3 py-2 bg-transparent outline-none text-sm resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={cancel}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Cancel request
              </button>
              <button
                type="submit"
                disabled={busy || !reply.trim()}
                className="h-9 px-4 rounded-full bg-foreground text-background text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send reply
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5 text-center">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
            <div className="font-semibold">This request is {ticket.status}</div>
            <p className="text-xs text-muted-foreground mt-1">Need more help? <Link to="/portal/new" className="text-primary hover:underline">Start a new request</Link>.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Timeline({ status }: { status: string }) {
  const steps = [
    { id: "new", label: "Submitted" },
    { id: "in_progress", label: "In progress" },
    { id: "resolved", label: "Resolved" },
  ];
  const order = ["new", "open", "in_progress", "on_hold", "resolved", "closed"];
  const idx = order.indexOf(status);
  const stepIndex = status === "resolved" || status === "closed" ? 2 : status === "in_progress" || status === "on_hold" ? 1 : 0;

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < stepIndex || (i === 2 && idx >= 4);
        const current = i === stepIndex && idx < 4;
        return (
          <div key={s.id} className="flex-1 flex items-center gap-2">
            <div className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
              done ? "bg-success text-success-foreground" : current ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
            )}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1">
              <div className={cn("text-[11px] font-medium", done || current ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
            </div>
            {i < steps.length - 1 && <div className={cn("h-px flex-1 -mx-1", done ? "bg-success" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    new: { cls: "bg-info/10 text-info", label: "Submitted" },
    open: { cls: "bg-info/10 text-info", label: "Open" },
    in_progress: { cls: "bg-primary/10 text-primary", label: "In progress" },
    on_hold: { cls: "bg-warning/10 text-warning", label: "On hold" },
    resolved: { cls: "bg-success/10 text-success", label: "Resolved" },
    closed: { cls: "bg-muted text-muted-foreground", label: "Closed" },
  };
  const m = map[status] ?? { cls: "bg-muted text-muted-foreground", label: status };
  return <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded", m.cls)}>{m.label}</span>;
}

function PriorityChip({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    critical: "bg-destructive/10 text-destructive",
    high: "bg-amber-500/10 text-amber-600",
    medium: "bg-sky-500/10 text-sky-600",
    low: "bg-muted text-muted-foreground",
  };
  return <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded capitalize", map[priority])}>{priority} priority</span>;
}
