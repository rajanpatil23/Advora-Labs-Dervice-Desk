import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, X, Send, Sparkles, Bot, User, Minimize2, RotateCcw, Loader2, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { portalChat, type ChatSession, type ChatMessage } from "@/lib/api/portalChat";

const TYPING_DELAY = [600, 1400] as const;
const HANDOFF_DELAY = 2400;

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "system") {
    return (
      <div className="text-center text-[11px] text-muted-foreground py-1.5">
        <span className="px-2.5 py-1 rounded-full bg-muted/60">{msg.body}</span>
      </div>
    );
  }
  const isUser = msg.role === "user";
  const isBot = msg.role === "bot";

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white shadow",
          isBot ? "bg-gradient-to-br from-primary to-primary/70" : "bg-emerald-500",
        )}>
          {isBot ? <Sparkles className="h-3.5 w-3.5" /> : msg.authorName?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div className={cn("max-w-[80%]", isUser && "items-end flex flex-col")}>
        {!isUser && msg.authorName && (
          <div className="text-[10px] font-semibold text-muted-foreground mb-0.5 ml-0.5">{msg.authorName}</div>
        )}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md",
          )}
        >
          {msg.body}
        </div>
        {msg.articles && msg.articles.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {msg.articles.map((a) => (
              <Link
                key={a.id}
                to="/portal/kb"
                className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-card hover:bg-accent/50 transition text-xs"
              >
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium truncate">{a.title}</span>
              </Link>
            ))}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground mt-0.5 px-1">{timeAgo(msg.at)}</div>
      </div>
      {isUser && (
        <div className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
          <User className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

export function PortalChatWidget() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ChatSession>(() => portalChat.get());
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const focusedRef = useRef(false);

  // Subscribe to cross-tab/in-process updates
  useEffect(() => {
    const handler = (e: Event) => setSession((e as CustomEvent<ChatSession>).detail);
    window.addEventListener("portal-chat-updated", handler);
    return () => window.removeEventListener("portal-chat-updated", handler);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.messages.length, typing, open]);

  // Focus tracking
  useEffect(() => {
    focusedRef.current = open;
    if (open) {
      const updated = portalChat.markRead();
      setSession(updated);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Simulate agent assignment after a queue delay
  useEffect(() => {
    if (session.status !== "queued") return;
    const timer = setTimeout(() => {
      const updated = portalChat.assignAgent(focusedRef.current);
      setSession(updated);
    }, HANDOFF_DELAY);
    return () => clearTimeout(timer);
  }, [session.status]);

  const send = (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;
    setInput("");
    const updated = portalChat.sendUser(text);
    setSession(updated);

    // Compute reply with simulated typing
    setTyping(true);
    const delay = TYPING_DELAY[0] + Math.random() * (TYPING_DELAY[1] - TYPING_DELAY[0]);
    setTimeout(() => {
      const { reply, sessionPatch } = portalChat.computeReply(text);
      if (reply) {
        const next = portalChat.applyReply(reply, sessionPatch, focusedRef.current);
        setSession(next);
      }
      setTyping(false);
    }, delay);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    const fresh = portalChat.reset();
    setSession(fresh);
  };

  const lastMsg = session.messages[session.messages.length - 1];
  const lastSuggestions = useMemo(
    () => (lastMsg?.role === "bot" ? lastMsg.suggestions ?? [] : []),
    [lastMsg],
  );

  // Header subtitle
  const headerSubtitle = useMemo(() => {
    if (session.status === "with_agent") return `Chatting with ${session.agentName}`;
    if (session.status === "queued") return `Connecting you to an agent…`;
    if (session.status === "ended") return "Chat ended";
    return "Powered by AI assistant";
  }, [session]);

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-transform group"
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
          {session.unread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background">
              {session.unread > 9 ? "9+" : session.unread}
            </span>
          )}
          <span className="absolute right-full mr-3 px-2.5 py-1 rounded-md bg-foreground text-background text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat with us
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-5 sm:right-5 z-50 sm:w-[380px] h-[80vh] sm:h-[600px] sm:max-h-[80vh] bg-background border border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 80% 30%, white, transparent 50%)" }} />
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {session.status === "with_agent" ? (
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white/30 shadow"
                    style={{ background: session.agentAvatarColor }}
                  >
                    {session.agentInitials}
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border-2 border-white/30">
                    {session.status === "queued" ? <Users className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold leading-tight truncate">
                    {session.status === "with_agent" ? session.agentName : "Help & Support"}
                  </div>
                  <div className="text-[11px] text-primary-foreground/85 flex items-center gap-1.5 truncate">
                    {session.status === "with_agent" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    {headerSubtitle}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={reset} className="h-8 w-8 rounded-md hover:bg-white/15 flex items-center justify-center" title="Reset chat">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-md hover:bg-white/15 flex items-center justify-center sm:hidden" title="Close">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-md hover:bg-white/15 flex items-center justify-center hidden sm:flex" title="Minimize">
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Queue banner */}
          {session.status === "queued" && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              You're in queue · position {session.queuePosition ?? 1} · typical wait under 2 minutes
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-background to-muted/20">
            {session.messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {typing && (
              <div className="flex gap-2 items-end">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-white shrink-0",
                  session.status === "with_agent" ? "bg-emerald-500" : "bg-gradient-to-br from-primary to-primary/70",
                )}>
                  {session.status === "with_agent" ? (
                    <span className="text-[10px] font-bold">{session.agentInitials}</span>
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="bg-muted px-3 py-2.5 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick reply chips */}
          {!typing && lastSuggestions.length > 0 && session.status !== "ended" && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {lastSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-2.5 py-1 rounded-full bg-card border text-[11px] font-medium text-foreground hover:bg-accent transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="border-t bg-background p-2.5">
            {session.status === "ended" ? (
              <Button onClick={reset} className="w-full" size="sm">
                <RotateCcw className="h-4 w-4 mr-1.5" /> Start a new chat
              </Button>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder={session.status === "queued" ? "Waiting for an agent…" : "Type a message…"}
                  className="flex-1 resize-none rounded-xl border bg-muted/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:bg-background transition max-h-32"
                  style={{ minHeight: "38px" }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim()}
                  className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition shrink-0"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground text-center mt-1.5">
              {session.status === "with_agent" ? "You're chatting live with an agent" : "Press Enter to send · Shift+Enter for newline"}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
