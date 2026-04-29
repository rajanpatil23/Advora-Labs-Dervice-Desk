import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Inbox as InboxIcon, Mail, MessageCircle, Smartphone, Twitter, Facebook, Instagram,
  MessageSquare, Phone, Star, Search, Reply, Archive, Forward, Ticket as TicketIcon,
  Paperclip, ChevronRight, Sparkles, Filter, RefreshCw, Trash2, Send,
} from "lucide-react";
import { inboxApi, CHANNEL_META, type Channel, type InboxMessage } from "@/lib/api/inbox";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Mail> = {
  Mail, MessageCircle, Smartphone, Twitter, Facebook, Instagram, MessageSquare, Phone,
};

type Filter = "all" | "unread" | "starred" | Channel;

export default function UnifiedInbox() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = ["owner","admin","manager","agent","resolver"].includes(role ?? "");
  const navigate = useNavigate();

  const [list, setList] = useState<InboxMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");

  const refresh = () => setList(inboxApi.list());
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    return list.filter((m) => {
      if (filter === "unread" && !m.unread) return false;
      if (filter === "starred" && !m.starred) return false;
      if (filter !== "all" && filter !== "unread" && filter !== "starred" && m.channel !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!m.from.toLowerCase().includes(q) &&
            !(m.subject ?? "").toLowerCase().includes(q) &&
            !m.body.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [list, filter, query]);

  const active = useMemo(() => filtered.find((m) => m.id === activeId) ?? filtered[0] ?? null, [filtered, activeId]);

  useEffect(() => {
    if (active && active.unread) inboxApi.markRead(active.id, false);
  }, [active?.id]);

  if (!allowed) return <Navigate to="/app" replace />;

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: list.length,
      unread: list.filter((m) => m.unread).length,
      starred: list.filter((m) => m.starred).length,
    };
    Object.keys(CHANNEL_META).forEach((ch) => {
      c[ch] = list.filter((m) => m.channel === (ch as Channel)).length;
    });
    return c;
  }, [list]);

  const handleStar = (id: string) => { inboxApi.toggleStar(id); refresh(); };
  const handleArchive = (id: string) => { inboxApi.remove(id); setActiveId(null); refresh(); toast.success("Archived"); };
  const handleConvert = (m: InboxMessage) => {
    const ticketId = `T-${Math.floor(Math.random() * 9000) + 1000}`;
    inboxApi.convertToTicket(m.id, ticketId);
    refresh();
    toast.success(`Ticket ${ticketId} created`, { action: { label: "Open", onClick: () => navigate("/app/tickets") } });
  };
  const handleSendReply = () => {
    if (!reply.trim() || !active) return;
    setReply("");
    toast.success(`Reply sent via ${CHANNEL_META[active.channel].label}`);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <header className="border-b bg-background px-6 py-4 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <InboxIcon className="h-5 w-5 text-primary" />
          <h1 className="font-display font-bold text-lg">Unified inbox</h1>
        </div>
        <Badge variant="outline" className="text-[10px]">{counts.unread} unread</Badge>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across channels…" className="h-8 pl-8 text-sm" />
          </div>
          <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-0 min-h-0">
        {/* Channel sidebar */}
        <aside className="col-span-2 border-r overflow-y-auto p-3 space-y-1">
          <FilterButton label="All messages" icon={InboxIcon} count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterButton label="Unread"       icon={Mail}      count={counts.unread} active={filter === "unread"} onClick={() => setFilter("unread")} />
          <FilterButton label="Starred"      icon={Star}      count={counts.starred} active={filter === "starred"} onClick={() => setFilter("starred")} />
          <Separator className="my-2" />
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1">Channels</div>
          {(Object.keys(CHANNEL_META) as Channel[]).map((ch) => {
            const meta = CHANNEL_META[ch];
            const Icon = ICONS[meta.icon] ?? Mail;
            return (
              <FilterButton key={ch} label={meta.label} icon={Icon} count={counts[ch] ?? 0} active={filter === ch} onClick={() => setFilter(ch)} />
            );
          })}
        </aside>

        {/* Message list */}
        <section className="col-span-4 border-r overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{filtered.length}</span>
            <span className="text-muted-foreground">messages</span>
          </div>
          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No messages</div>
            ) : (
              <div className="divide-y">
                {filtered.map((m) => {
                  const meta = CHANNEL_META[m.channel];
                  const Icon = ICONS[meta.icon] ?? Mail;
                  const isActive = active?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setActiveId(m.id)}
                      className={cn(
                        "w-full text-left px-3 py-3 transition-colors relative",
                        isActive ? "bg-primary/5" : "hover:bg-muted/40",
                      )}
                    >
                      {m.unread && <span className="absolute left-1 top-4 h-1.5 w-1.5 rounded-full bg-primary" />}
                      <div className="flex items-start gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-[11px]">{m.from.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("text-sm truncate", m.unread ? "font-semibold" : "font-medium")}>{m.from}</span>
                            <Badge variant="outline" className={cn("ml-auto text-[9px] h-4 px-1 gap-0.5", meta.color)}>
                              <Icon className="h-2.5 w-2.5" />
                              {meta.label}
                            </Badge>
                          </div>
                          {m.subject && (
                            <div className={cn("text-xs truncate mt-0.5", m.unread ? "font-medium" : "text-muted-foreground")}>{m.subject}</div>
                          )}
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{m.preview}</div>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                            <span>{new Date(m.receivedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            {m.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                            {m.attachments && <span className="flex items-center gap-0.5"><Paperclip className="h-2.5 w-2.5" /> {m.attachments}</span>}
                            {m.ticketId && <Badge variant="outline" className="h-4 text-[9px]">{m.ticketId}</Badge>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </section>

        {/* Conversation pane */}
        <section className="col-span-6 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a message to view
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-base truncate">{active.subject ?? `${CHANNEL_META[active.channel].label} from ${active.from}`}</h2>
                      <Badge variant="outline" className={cn("text-[10px]", CHANNEL_META[active.channel].color)}>
                        {CHANNEL_META[active.channel].label}
                      </Badge>
                      {active.sentiment && (
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          active.sentiment === "positive" && "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                          active.sentiment === "negative" && "bg-rose-500/15 text-rose-600 border-rose-500/30",
                          active.sentiment === "neutral"  && "bg-muted text-muted-foreground",
                        )}>{active.sentiment}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">{active.from}</span>
                      <span className="font-mono ml-1.5">{active.fromHandle}</span>
                      <span className="mx-1.5">·</span>
                      {new Date(active.receivedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleStar(active.id)}>
                      <Star className={cn("h-4 w-4", active.starred && "fill-amber-400 text-amber-400")} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(active.id)}>
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleConvert(active)} disabled={!!active.ticketId}>
                      <TicketIcon className="h-3.5 w-3.5 mr-1.5" />
                      {active.ticketId ?? "Convert to ticket"}
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 px-6 py-5">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>{active.from.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Card>
                      <CardContent className="pt-4 pb-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{active.body}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ScrollArea>

              <div className="border-t bg-muted/30 px-6 py-3 space-y-2">
                <Tabs defaultValue="reply">
                  <TabsList className="h-8">
                    <TabsTrigger value="reply" className="text-xs"><Reply className="h-3 w-3 mr-1" /> Reply</TabsTrigger>
                    <TabsTrigger value="forward" className="text-xs"><Forward className="h-3 w-3 mr-1" /> Forward</TabsTrigger>
                    <TabsTrigger value="note" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /> Internal note</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Reply via ${CHANNEL_META[active.channel].label}…`}
                  rows={3}
                  className="text-sm resize-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> AI suggestions available in composer
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setReply("")}>Discard</Button>
                    <Button size="sm" onClick={handleSendReply} disabled={!reply.trim()}>
                      <Send className="h-3.5 w-3.5 mr-1.5" /> Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterButton({
  label, icon: Icon, count, active, onClick,
}: { label: string; icon: typeof Mail; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1 text-left truncate">{label}</span>
      {count > 0 && <span className="font-mono tabular-nums opacity-70">{count}</span>}
    </button>
  );
}
