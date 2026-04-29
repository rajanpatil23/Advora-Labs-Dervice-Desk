import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribe, listSessions, getSession, appendMessage, markRead,
  assignAgent, endSession, setTags, seedIfEmpty, chatStats, startSession,
  type ChatSession, type ChatMessage,
} from "@/lib/api/liveChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle, Send, UserPlus, X, Globe, Monitor, Smartphone, Tablet,
  Plus, CheckCheck, Tag as TagIcon, Star,
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
    return subscribe(refresh);
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
  const [input, setInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session.unread) markRead(session.id);
  }, [session.id, session.unread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages.length]);

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
    maybeAutoReply();
  }

  function take() {
    assignAgent(session.id, currentUser.id, currentUser.name);
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

  const Device = deviceIcon(session.visitor.device);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{session.visitor.name}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Device className="h-3 w-3" />{session.visitor.device ?? "—"}</span>
              <span>·</span>
              <span>{session.visitor.country ?? "—"}</span>
              <span>·</span>
              <span className="font-mono">{session.visitor.page}</span>
              {session.visitor.email && <><span>·</span><span>{session.visitor.email}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{session.status}</Badge>
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

      <div className="border-t p-3">
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
          <Button onClick={send} disabled={!input.trim() || session.status === "ended"}>
            <Send className="h-4 w-4" />
          </Button>
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
  const isAgent = msg.sender === "agent" || msg.sender === "bot";
  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
        isAgent ? "bg-primary text-primary-foreground" : "bg-muted"
      }`}>
        {msg.authorName && (
          <div className={`text-[10px] font-medium mb-0.5 ${isAgent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {msg.authorName}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
        <div className={`text-[10px] mt-1 ${isAgent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
  "Got it — let me try that now.",
  "Perfect. Anything else I should know?",
  "Where do I find that setting?",
];
function pickReply() { return REPLIES[Math.floor(Math.random() * REPLIES.length)]; }
