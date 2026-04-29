import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, MessageSquare, UserPlus, CheckCircle2, ArrowUpDown,
  Clock, Filter, RefreshCw, AtSign, Tag, Sparkles, Search,
} from "lucide-react";
import { useAppStore, useCurrentOrgUser, findUser, findAgent } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/common/Chips";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { extractMentionHandles, toHandle } from "@/lib/mentions";
import type { ActivityEvent, Ticket } from "@/lib/types";

type FeedItem = {
  id: string;
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  type: ActivityEvent["type"] | "mention";
  text: string;
  by: string;
  at: string;
};

const TYPE_META: Record<FeedItem["type"], { label: string; icon: typeof Activity; tone: string }> = {
  created:   { label: "Created",      icon: Sparkles,       tone: "text-primary" },
  status:    { label: "Status",       icon: ArrowUpDown,    tone: "text-foreground/80" },
  assigned:  { label: "Assigned",     icon: UserPlus,       tone: "text-primary" },
  comment:   { label: "Comment",      icon: MessageSquare,  tone: "text-foreground/80" },
  priority:  { label: "Priority",     icon: AlertTriangle,  tone: "text-warning" },
  sla:       { label: "SLA",          icon: Clock,          tone: "text-destructive" },
  tag:       { label: "Tag",          icon: Tag,            tone: "text-muted-foreground" },
  resolved:  { label: "Resolved",     icon: CheckCircle2,   tone: "text-success" },
  mention:   { label: "Mention",      icon: AtSign,         tone: "text-primary" },
};

const FILTERS: { key: "all" | "mine" | "mentions" | "sla" | "incidents"; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "mine", label: "On my tickets" },
  { key: "mentions", label: "Mentioning me" },
  { key: "sla", label: "SLA & priority" },
  { key: "incidents", label: "Resolved" },
];

function buildFeed(tickets: Ticket[], myHandle?: string, myId?: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const t of tickets) {
    for (const ev of t.activity) {
      items.push({
        id: `${t.id}:${ev.id}`,
        ticketId: t.id,
        ticketNumber: t.number,
        ticketTitle: t.title,
        type: ev.type,
        text: ev.text,
        by: ev.by,
        at: ev.at,
      });
    }
    // Synthesize mention items from messages
    for (const m of t.messages) {
      const handles = extractMentionHandles(m.body);
      if (handles.length === 0) continue;
      const youMentioned = !!myHandle && handles.includes(myHandle);
      items.push({
        id: `${t.id}:msg:${m.id}:mention`,
        ticketId: t.id,
        ticketNumber: t.number,
        ticketTitle: t.title,
        type: "mention",
        text: youMentioned
          ? `${m.authorName} mentioned you`
          : `${m.authorName} mentioned ${handles.map((h) => "@" + h).join(", ")}`,
        by: m.authorName,
        at: m.createdAt,
      });
    }
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export default function ActivityFeed() {
  const tickets = useAppStore((s) => s.tickets);
  const me = useCurrentOrgUser();
  const myHandle = me ? toHandle(me.name) : undefined;
  const nav = useNavigate();
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const feed = useMemo(() => buildFeed(tickets, myHandle, me?.id), [tickets, myHandle, me?.id]);

  const filtered = useMemo(() => {
    let list = feed;
    if (filter === "mine" && me) list = list.filter((it) => {
      const t = tickets.find((x) => x.id === it.ticketId);
      return t?.assigneeId === me.id || t?.requesterId === me.id;
    });
    if (filter === "mentions") {
      list = list.filter((it) => it.type === "mention" && it.text.includes("you"));
    }
    if (filter === "sla") list = list.filter((it) => it.type === "sla" || it.type === "priority");
    if (filter === "incidents") list = list.filter((it) => it.type === "resolved");
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((it) =>
        it.text.toLowerCase().includes(q) ||
        it.ticketNumber.toLowerCase().includes(q) ||
        it.ticketTitle.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 200);
  }, [feed, filter, query, tickets, me?.id]);

  // Group by day
  const groups = useMemo(() => {
    const out: Record<string, FeedItem[]> = {};
    for (const it of filtered) {
      const d = new Date(it.at);
      const key = d.toDateString();
      (out[key] ??= []).push(it);
    }
    return out;
  }, [filtered]);

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 pt-6 pb-3 border-b border-border bg-surface/40 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight">Activity feed</h1>
            <p className="text-sm text-muted-foreground">
              Real-time stream of changes across your tickets and incidents.
            </p>
          </div>
          <div className="ml-auto relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search activity…"
              className="h-9 pl-8 pr-3 w-64 rounded-lg bg-surface border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-[12px]"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" /> Live
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {Object.keys(groups).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Activity className="h-10 w-10 opacity-40 mb-2" />
            <div className="text-sm">No activity matches.</div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-4 space-y-6">
            {Object.entries(groups).map(([day, items]) => (
              <div key={day}>
                <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl py-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                    {dayLabel(day)}
                  </div>
                </div>
                <div className="relative pl-5">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {items.map((it) => {
                    const meta = TYPE_META[it.type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={it.id}
                        onClick={() => nav(`/app/tickets?id=${it.ticketId}`)}
                        className="group relative w-full text-left py-2.5 pr-2 hover:bg-surface-2/60 rounded-lg transition-colors px-2 -ml-2"
                      >
                        <span className={cn(
                          "absolute -left-[5px] top-3.5 h-3 w-3 rounded-full bg-background ring-2",
                          it.type === "mention" || it.type === "sla" ? "ring-primary" : "ring-border",
                        )}>
                          <span className={cn(
                            "absolute inset-0.5 rounded-full",
                            it.type === "mention" ? "bg-primary" :
                            it.type === "sla" ? "bg-destructive" :
                            it.type === "resolved" ? "bg-success" :
                            "bg-muted-foreground/40",
                          )} />
                        </span>
                        <div className="flex items-start gap-2.5 ml-3">
                          <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", meta.tone)} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] leading-snug">
                              <span className="font-mono text-[11px] text-muted-foreground mr-1.5">
                                {it.ticketNumber}
                              </span>
                              <span>{it.text}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {it.ticketTitle}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {it.by} · {timeAgo(it.at)}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            Open →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function dayLabel(day: string): string {
  const d = new Date(day);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (dt === startOfToday) return "Today";
  if (dt === startOfToday - 86400000) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}
