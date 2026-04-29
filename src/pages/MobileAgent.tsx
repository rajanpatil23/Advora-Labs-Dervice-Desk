import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, AlertOctagon, ArrowUpRight, Inbox, Search, Filter, Bell, Plus, ChevronRight, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppStore, agents, customers } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { SwipeableRow } from "@/components/mobile/SwipeableRow";
import type { Ticket } from "@/lib/types";

type FilterKey = "open" | "mine" | "urgent" | "today";

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  high: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  critical: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-primary/15 text-primary",
  open: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  in_progress: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  on_hold: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
};

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const isOpen = (t: Ticket) => t.status !== "resolved" && t.status !== "closed";
const isUrgent = (t: Ticket) => t.priority === "critical" || t.priority === "high";

export default function MobileAgent() {
  const nav = useNavigate();
  const { tickets, updateTicket } = useAppStore();
  const { profile } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("open");
  const [q, setQ] = useState("");

  const myEmail = profile?.email ?? "";
  const myAgent = useMemo(() => agents.find((a) => a.email.toLowerCase() === myEmail.toLowerCase()), [myEmail]);
  const myId = myAgent?.id;

  const counts = useMemo(() => ({
    open: tickets.filter(isOpen).length,
    mine: tickets.filter((t) => myId && t.assigneeId === myId && isOpen(t)).length,
    urgent: tickets.filter((t) => isUrgent(t) && isOpen(t)).length,
    today: tickets.filter((t) => new Date(t.createdAt).toDateString() === new Date().toDateString()).length,
  }), [tickets, myId]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (filter === "open") list = list.filter(isOpen);
    if (filter === "mine") list = list.filter((t) => myId && t.assigneeId === myId && isOpen(t));
    if (filter === "urgent") list = list.filter((t) => isUrgent(t) && isOpen(t));
    if (filter === "today") list = list.filter((t) => new Date(t.createdAt).toDateString() === new Date().toDateString());
    if (q.trim()) {
      const Q = q.toLowerCase();
      list = list.filter((t) => t.title?.toLowerCase().includes(Q) || t.number?.toLowerCase().includes(Q));
    }
    return [...list].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 50);
  }, [tickets, filter, myId, q]);

  const sendPush = (title: string, body: string) => {
    toast(title, { description: body, duration: 3500 });
  };

  const requesterName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown";
  const assigneeName = (id?: string) => (id ? agents.find((a) => a.id === id)?.name?.split(" ")[0] : null);

  return (
    <div className="md:hidden min-h-screen bg-background pb-20">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Hi, {profile?.full_name?.split(" ")[0] ?? "Agent"}</div>
              <h1 className="text-2xl font-display font-bold">Mobile Agent</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => nav("/app/notifications")}>
                <Bell className="h-5 w-5" />
              </Button>
              <Button size="icon" className="h-9 w-9" onClick={() => nav("/app/tickets?new=1")}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {([
              { key: "open", label: "Open", value: counts.open, icon: Inbox },
              { key: "mine", label: "Mine", value: counts.mine, icon: MessageSquare },
              { key: "urgent", label: "Urgent", value: counts.urgent, icon: AlertOctagon },
              { key: "today", label: "Today", value: counts.today, icon: Clock },
            ] as const).map((s) => (
              <button
                key={s.key}
                onClick={() => setFilter(s.key as FilterKey)}
                className={cn(
                  "flex flex-col items-center rounded-xl p-2.5 border transition-all active:scale-95",
                  filter === s.key ? "bg-primary text-primary-foreground border-primary shadow-glow" : "bg-card border-border",
                )}
              >
                <s.icon className="h-4 w-4 mb-1 opacity-80" />
                <span className="text-base font-bold tabular-nums leading-none">{s.value}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets…" className="pl-9 h-10 bg-muted/50 border-0" />
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)} className="px-2">
          <TabsList className="w-full justify-start gap-1 bg-transparent h-9 px-2 overflow-x-auto">
            <TabsTrigger value="open" className="text-xs">Open · {counts.open}</TabsTrigger>
            <TabsTrigger value="mine" className="text-xs">Mine · {counts.mine}</TabsTrigger>
            <TabsTrigger value="urgent" className="text-xs">Urgent · {counts.urgent}</TabsTrigger>
            <TabsTrigger value="today" className="text-xs">Today · {counts.today}</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Push test card */}
      <div className="px-4 mt-4">
        <Card className="bg-gradient-primary/5 border-primary/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Push notifications</div>
              <div className="text-[11px] text-muted-foreground">Try a sample alert to preview the toast.</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => sendPush("New ticket assigned", "TKT-7421 — Login error on iOS app")}>
              Test
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ticket list */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" /> {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </div>
          <button className="text-xs text-primary font-medium" onClick={() => nav("/app/tickets")}>Open full view <ArrowUpRight className="h-3 w-3 inline" /></button>
        </div>

        <div className="rounded-xl border bg-card divide-y overflow-hidden">
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No tickets match this filter.
            </div>
          )}
          {filtered.map((t) => (
            <SwipeableRow
              key={t.id}
              left={{
                label: "Resolve",
                icon: <CheckCircle2 className="h-5 w-5" />,
                color: "bg-emerald-500",
                onAction: () => {
                  updateTicket(t.id, { status: "resolved", resolvedAt: new Date().toISOString() });
                  sendPush("Ticket resolved", `${t.number} — ${t.title}`);
                },
              }}
              right={{
                label: "Assign me",
                icon: <ArrowUpRight className="h-5 w-5" />,
                color: "bg-primary",
                onAction: () => {
                  if (!myId) return toast.error("No agent profile linked to your account.");
                  updateTicket(t.id, { assigneeId: myId });
                  sendPush("Assigned to you", `${t.number} — ${t.title}`);
                },
              }}
            >
              <button onClick={() => nav(`/app/tickets?id=${t.id}`)} className="w-full text-left px-4 py-3 active:bg-accent/40">
                <div className="flex items-start gap-3">
                  <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", t.priority === "critical" ? "bg-rose-500" : t.priority === "high" ? "bg-amber-500" : "bg-muted-foreground/40")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-muted-foreground">{t.number}</span>
                      <Badge className={cn("text-[10px] px-1.5 py-0 h-4", STATUS_COLOR[t.status] ?? "")}>{t.status.replace("_", " ")}</Badge>
                      <Badge className={cn("text-[10px] px-1.5 py-0 h-4 capitalize", PRIORITY_COLOR[t.priority] ?? "")}>{t.priority}</Badge>
                      <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(t.updatedAt ?? t.createdAt)}</span>
                    </div>
                    <div className="text-sm font-medium line-clamp-2 mt-1">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {requesterName(t.requesterId)} · {assigneeName(t.assigneeId) ? `→ ${assigneeName(t.assigneeId)}` : "Unassigned"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 mt-2 shrink-0" />
                </div>
              </button>
            </SwipeableRow>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-3">
          Swipe right to resolve · swipe left to assign to yourself
        </p>
      </div>
    </div>
  );
}
