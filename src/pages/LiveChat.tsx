import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/lib/store";
import {
  subscribe, listSessions, getSession, appendMessage, markRead,
  assignAgent, endSession, setTags, seedIfEmpty, chatStats, startSession,
  type ChatSession, type ChatMessage,
} from "@/lib/api/liveChat";
import { chatbotAutoReply, chatbotGreet, type BotReply } from "@/lib/api/aiChatbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle, Send, UserPlus, X, Globe, Monitor, Smartphone, Tablet,
  Plus, CheckCheck, Tag as TagIcon, Star, Bot, Sparkles, Loader2, Wand2,
} from "lucide-react";
import { toast } from "sonner";

export default function LiveChat() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "queued" | "active" | "mine">("all");

  useEffect(() => {
    seedIfEmpty();
    const refresh = () => setSessions(listSessions());
    refresh();
    const unsub = subscribe(refresh);
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (!selectedId && sessions.length > 0) setSelectedId(sessions[0].id);
  }, [sessions, selectedId]);

  const stats = useMemo(() => chatStats(sessions), [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (filter === "queued") return s.status === "queued";
      if (filter === "active") return s.status === "active";
      if (filter === "mine") return s.assignedAgentId === user?.id;
      return true;
    });
  }, [sessions, filter, user?.id]);

  const selected = selectedId ? sessions.find(s => s.id === selectedId) : undefined;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      <Card className="w-80 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Live chat
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { startSession(); toast.success("Demo chat started"); }}
              title="Simulate new visitor"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center text-xs">
            <Stat n={stats.queued} label="Queued" tone="amber" />
            <Stat n={stats.active} label="Active" tone="emerald" />
            <Stat n={stats.unread} label="Unread" tone="primary" />
          </div>
          <div className="flex gap-1 mt-2">
            {(["all", "queued", "active", "mine"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-2 py-1 rounded text-xs capitalize transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto px-2 pb-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No chats</div>
          ) : (
            filtered.map(s => <SessionRow key={s.id} session={s} active={s.id === selectedId} onClick={() => setSelectedId(s.id)} />)
          )}
        </CardContent>
      </Card>

      <div className="flex-1 min-w-0">
        {!selected ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-muted-foreground">Select a chat to start</div>
          </Card>
        ) : (
          <ChatThread
            session={selected}
            currentUser={{ id: user?.id ?? "agent", name: user?.email ?? "You" }}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: "amber" | "emerald" | "primary" }) {
  const cls = {
    amber: "text-amber-600 bg-amber-500/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    primary: "text-primary bg-primary/10",
  }[tone];
  return (
    <div className={`rounded-md py-1 ${cls}`}>
      <div className="font-semibold tabular-nums">{n}</div>
      <div className="text-[10px] opacity-80">{label}</div>
    </div>
  );
}

function deviceIcon(d?: string) {
  if (d === "mobile") return Smartphone;
  if (d === "tablet") return Tablet;
  return Monitor;
}

function SessionRow({ session: s, active, onClick }: { session: ChatSession; active: boolean; onClick: () => void }) {
  const last = s.messages[s.messages.length - 1];
  const Device = deviceIcon(s.visitor.device);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md px-3 py-2 transition-colors ${active ? "bg-accent" : "hover:bg-accent/50"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate">{s.visitor.name}</span>
        {s.unread > 0 && <Badge className="h-5 px-1.5">{s.unread}</Badge>}
      </div>
      <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
        <Device className="h-3 w-3" />
        <Globe className="h-3 w-3" />
        <span className="truncate">{s.visitor.page}</span>
      </div>
      <div className="text-xs text-muted-foreground truncate mt-1">
        <Badge variant="outline" className="text-[10px] mr-1.5 capitalize">{s.status}</Badge>
        {last?.body}
      </div>
    </button>
  );
}

function ChatThread({
  session, currentUser,
}: {
  session: ChatSession;
  currentUser: { id: string; name: string };
}) {
  const articles = useAppStore(s => s.articles);
  const [input, setInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [autopilot, setAutopilot] = useState(false);
  const [botSuggestion, setBotSuggestion] = useState<BotReply | null>(null);
  const [botBusy, setBotBusy] = useState(false);
  const lastVisitorMsgIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session.unread) markRead(session.id);
  }, [session.id, session.unread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages.length]);

  // reset suggestion when switching sessions
  useEffect(() => {
    setBotSuggestion(null);
    lastVisitorMsgIdRef.current = null;
  }, [session.id]);

  const lastVisitorMsg = useMemo(() => {
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].sender === "visitor") return session.messages[i];
    }
    return null;
  }, [session.messages]);

  // Autopilot: when a new visitor message arrives and autopilot is on, ask bot to reply
  useEffect(() => {
    if (!autopilot || !lastVisitorMsg) return;
    if (session.status === "ended") return;
    if (lastVisitorMsgIdRef.current === lastVisitorMsg.id) return;
    lastVisitorMsgIdRef.current = lastVisitorMsg.id;
    runBot(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilot, lastVisitorMsg?.id, session.status]);

  async function runBot(autoSend: boolean) {
    setBotBusy(true);
    try {
      const reply = await chatbotAutoReply({ session, kbArticles: articles });
      setBotSuggestion(reply);
      if (autoSend && !reply.shouldHandoff) {
        appendMessage(session.id, { sender: "bot", authorName: "AI assistant", body: reply.reply });
        setBotSuggestion(null);
      }
      if (reply.shouldHandoff && session.status !== "active") {
        toast.warning("Bot recommends human handoff", { description: reply.handoffReason });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Bot failed");
    } finally {
      setBotBusy(false);
    }
  }

  async function greet() {
    setBotBusy(true);
    try {
      const reply = await chatbotGreet({ visitor: session.visitor });
      appendMessage(session.id, { sender: "bot", authorName: "AI assistant", body: reply });
    } catch (e: any) {
      toast.error(e.message ?? "Greeting failed");
    } finally {
      setBotBusy(false);
    }
  }

  // Visitor auto-reply demo: 30% chance after agent sends
  function maybeAutoReply() {
    if (Math.random() < 0.4) {
      setTimeout(() => {
        appendMessage(session.id, {
          sender: "visitor",
          authorName: session.visitor.name,
          body: pickReply(),
        });
      }, 1200 + Math.random() * 1500);
    }
  }

  function send() {
    if (!input.trim()) return;
    appendMessage(session.id, { sender: "agent", authorName: currentUser.name, body: input.trim() });
    setInput("");
    setBotSuggestion(null);
    maybeAutoReply();
  }

  function take() {
    assignAgent(session.id, currentUser.id, currentUser.name);
    setAutopilot(false);
    toast.success("You took this chat");
  }

  function close() {
    endSession(session.id);
    toast.success("Chat ended");
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || session.tags.includes(t)) return;
    setTags(session.id, [...session.tags, t]);
    setTagInput("");
  }

  function useSuggestion() {
    if (!botSuggestion) return;
    setInput(botSuggestion.reply);
    setBotSuggestion(null);
  }

  const Device = deviceIcon(session.visitor.device);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{session.visitor.name}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Device className="h-3 w-3" />{session.visitor.device ?? "-"}</span>
              <span>·</span>
              <span>{session.visitor.country ?? "-"}</span>
              <span>·</span>
              <span className="font-mono">{session.visitor.page}</span>
              {session.visitor.email && <><span>·</span><span>{session.visitor.email}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{session.status}</Badge>
            <Button
              size="sm"
              variant={autopilot ? "default" : "outline"}
              onClick={() => {
                setAutopilot(a => !a);
                toast.success(`Bot autopilot ${!autopilot ? "ON" : "OFF"}`);
              }}
              disabled={session.status === "ended"}
              title="Bot replies automatically when visitor messages"
            >
              <Bot className="mr-2 h-4 w-4" /> Autopilot {autopilot ? "on" : "off"}
            </Button>
            {session.messages.filter(m => m.sender !== "system").length === 0 && session.status !== "ended" && (
              <Button size="sm" variant="outline" onClick={greet} disabled={botBusy}>
                <Wand2 className="mr-2 h-4 w-4" /> AI greet
              </Button>
            )}
            {session.status === "queued" && (
              <Button size="sm" onClick={take}><UserPlus className="mr-2 h-4 w-4" /> Take chat</Button>
            )}
            {session.status === "active" && (
              <Button size="sm" variant="outline" onClick={close}><X className="mr-2 h-4 w-4" /> End</Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <TagIcon className="h-3 w-3 text-muted-foreground" />
          {session.tags.map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] gap-1">
              {t}
              <button onClick={() => setTags(session.id, session.tags.filter(x => x !== t))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag…"
            className="h-6 w-32 text-xs"
          />
          {session.rating && (
            <span className="ml-auto flex items-center gap-1 text-xs">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < (session.rating ?? 0) ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
              ))}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent ref={scrollRef as any} className="flex-1 overflow-auto p-4 space-y-3">
        {session.messages.map(m => <Bubble key={m.id} msg={m} />)}
      </CardContent>

      <div className="border-t p-3 space-y-2">
        {botSuggestion && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3 w-3" /> Bot suggestion
                <Badge variant="outline" className="text-[10px]">
                  conf {Math.round(botSuggestion.confidence * 100)}%
                </Badge>
                {botSuggestion.shouldHandoff && (
                  <Badge variant="destructive" className="text-[10px]">Recommends handoff</Badge>
                )}
              </span>
              <button onClick={() => setBotSuggestion(null)}>
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-sm">{botSuggestion.reply}</p>
            {botSuggestion.handoffReason && (
              <p className="text-xs text-muted-foreground italic">{botSuggestion.handoffReason}</p>
            )}
            {botSuggestion.suggestedQuickReplies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {botSuggestion.suggestedQuickReplies.map(q => (
                  <span key={q} className="text-[10px] px-2 py-0.5 rounded-full bg-background border">{q}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={useSuggestion}>Use as draft</Button>
              <Button
                size="sm"
                onClick={() => {
                  appendMessage(session.id, { sender: "bot", authorName: "AI assistant", body: botSuggestion.reply });
                  setBotSuggestion(null);
                }}
              >
                Send as bot
              </Button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={session.status === "ended" ? "Chat has ended" : "Type a reply… (Enter to send)"}
            disabled={session.status === "ended"}
            rows={2}
            className="resize-none"
          />
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => runBot(false)}
              disabled={botBusy || session.status === "ended" || session.messages.length === 0}
              title="Ask AI for a reply suggestion"
            >
              {botBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
            <Button onClick={send} disabled={!input.trim() || session.status === "ended"} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.sender === "system") {
    return (
      <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground py-1">
        <CheckCheck className="h-3 w-3" />
        {msg.body}
      </div>
    );
  }
  const isOutbound = msg.sender === "agent" || msg.sender === "bot";
  const isBot = msg.sender === "bot";
  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
        isBot ? "bg-accent border border-primary/30 text-foreground"
        : isOutbound ? "bg-primary text-primary-foreground"
        : "bg-muted"
      }`}>
        {msg.authorName && (
          <div className={`text-[10px] font-medium mb-0.5 flex items-center gap-1 ${
            isBot ? "text-primary" : isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}>
            {isBot && <Bot className="h-3 w-3" />}
            {msg.authorName}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
        <div className={`text-[10px] mt-1 ${
          isBot ? "text-muted-foreground" : isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"
        }`}>
          {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

const REPLIES = [
  "Thanks, that helps!",
  "Hmm, still seeing the same issue.",
  "Could you share a link to the docs?",
  "Got it - let me try that now.",
  "Perfect. Anything else I should know?",
  "Where do I find that setting?",
];
function pickReply() { return REPLIES[Math.floor(Math.random() * REPLIES.length)]; }
