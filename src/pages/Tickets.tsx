import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore, findUser, findAgent, useOrgAgents, useCurrentOrgUser } from "@/lib/store";
import { useSearchParams } from "react-router-dom";
import { PriorityChip, StatusChip, SlaChip, Avatar } from "@/components/common/Chips";
import { timeAgo, timeUntil, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Filter, Inbox, Star, Clock, AlertTriangle, ChevronDown, Paperclip, Send,
  Lock, MoreHorizontal, Tag, Building2, Mail, Phone, Globe, MessageSquare,
  Plus, Sparkles, Search, CheckCircle2, ArrowUpRight, Zap, CornerDownLeft,
  X, SlidersHorizontal, Hash, Reply, Bookmark, FileText, ChevronRight, Trash2,
} from "lucide-react";
import type { Priority, TicketStatus } from "@/lib/types";
import { NewTicketDialog } from "@/components/dialogs/NewTicketDialog";
import { AssistSuggestButton, AssistInsightsPanel } from "@/components/tickets/AiAssist";
import { MacroPicker } from "@/components/tickets/MacroPicker";
import { ReplyDraftsDialog } from "@/components/tickets/ReplyDraftsDialog";
import { MentionAutocomplete, type MentionAutocompleteHandle } from "@/components/common/MentionAutocomplete";
import { extractMentionHandles, toMentionable, toHandle, renderWithMentions } from "@/lib/mentions";
import { emitNotification } from "@/lib/api/notificationEngine";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PresenceBubbles } from "@/components/common/Presence";
import { presenceApi } from "@/lib/api/presence";

const queues = [
  { key: "all", label: "All tickets", icon: Inbox },
  { key: "mine", label: "My queue", icon: Star },
  { key: "unassigned", label: "Unassigned", icon: Clock },
  { key: "at_risk", label: "SLA at risk", icon: AlertTriangle },
];

const quickFilters = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "high", label: "High Priority" },
  { key: "sla_risk", label: "SLA Risk" },
] as const;

const replyTemplates = [
  { label: "Greeting", body: "Hi {name}, thanks for reaching out - I'm looking into this now and will get back to you shortly." },
  { label: "Need info", body: "Could you share the exact error message and a screenshot if possible? That will help me pinpoint the issue." },
  { label: "Resolved", body: "This should be resolved now. Please confirm on your end and I'll close the ticket. Thanks!" },
];

export default function Tickets() {
  const { tickets: allTickets, selectedTicketId, setSelectedTicket, addMessage, setStatus, setPriority, setAssignee, toggleWatcher, deleteTicket } = useAppStore();
  const orgAgents = useOrgAgents();
  const me = useCurrentOrgUser();
  const isRequester = me?.role === "requester";
  const role = me?.role;
  const canManage = role === "owner" || role === "admin" || role === "manager";
  const canWork = canManage || role === "agent" || role === "resolver";
  const tickets = useMemo(
    () => (isRequester && me ? allTickets.filter(t => t.requesterId === me.id) : allTickets),
    [allTickets, isRequester, me?.id]
  );
  const [params, setParams] = useSearchParams();
  const [queue, setQueue] = useState("all");
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [activeQuick, setActiveQuick] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<Priority | "">("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<MentionAutocompleteHandle>(null);
  const mentionables = useMemo(() => orgAgents.map(toMentionable), [orgAgents]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(params.get("q") ?? ""); }, [params]);
  useEffect(() => {
    const cur = params.get("q") ?? "";
    if (cur !== search) {
      const next = new URLSearchParams(params);
      if (search) next.set("q", search); else next.delete("q");
      setParams(next, { replace: true });
    }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);
  useEffect(() => { const i = setInterval(() => setTick((t) => t + 1), 30000); return () => clearInterval(i); }, []);

  const categories = useMemo(() => Array.from(new Set(tickets.map(t => t.category))), [tickets]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (queue === "mine" && me) list = list.filter(t => t.assigneeId === me.id);
    if (queue === "unassigned") list = list.filter(t => !t.assigneeId);
    if (queue === "at_risk") list = list.filter(t => t.slaState === "at_risk" || t.slaState === "breached");

    if (activeQuick === "open") list = list.filter(t => t.status === "open" || t.status === "new");
    if (activeQuick === "in_progress") list = list.filter(t => t.status === "in_progress");
    if (activeQuick === "high") list = list.filter(t => t.priority === "high" || t.priority === "critical");
    if (activeQuick === "sla_risk") list = list.filter(t => t.slaState === "at_risk" || t.slaState === "breached");

    if (filterStatus) list = list.filter(t => t.status === filterStatus);
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    if (filterAssignee) list = list.filter(t => t.assigneeId === filterAssignee);
    if (filterCategory) list = list.filter(t => t.category === filterCategory);

    if (search) list = list.filter(t =>
      (t.title + " " + t.number + " " + (findUser(t.requesterId)?.name ?? "")).toLowerCase().includes(search.toLowerCase())
    );
    return [...list].sort((a, b) => {
      const sa = a.slaState === "breached" ? 0 : a.slaState === "at_risk" ? 1 : 2;
      const sb = b.slaState === "breached" ? 0 : b.slaState === "at_risk" ? 1 : 2;
      if (sa !== sb) return sa - sb;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [tickets, queue, search, me?.id, activeQuick, filterStatus, filterPriority, filterAssignee, filterCategory]);

  const selected = tickets.find(t => t.id === selectedTicketId) ?? filtered[0];
  const requester = selected ? findUser(selected.requesterId) : null;
  const assignee = selected?.assigneeId ? findAgent(selected.assigneeId) : null;
  const lastMessage = selected?.messages[selected.messages.length - 1];
  const awaitingResponse = lastMessage?.authorRole === "requester";

  // Auto-scroll thread to bottom on selection change / new message
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [selected?.id, selected?.messages.length]);

  // Keyboard: ⌘/Ctrl+Enter to send, j/k to navigate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); send(); return; }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j" || e.key === "k") {
        const idx = filtered.findIndex(t => t.id === selected?.id);
        const next = e.key === "j" ? Math.min(filtered.length - 1, idx + 1) : Math.max(0, idx - 1);
        if (filtered[next]) setSelectedTicket(filtered[next].id);
      }
      if (e.key === "/") { e.preventDefault(); document.getElementById("ticket-search")?.focus(); }
      if (e.key === "r" && selected) { e.preventDefault(); composerRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected?.id, reply]);

  const send = () => {
    if (!selected || !reply.trim()) return;
    const text = reply.trim();
    addMessage(selected.id, text, internal);

    // Notify mentioned agents
    const handles = extractMentionHandles(text);
    if (handles.length > 0) {
      const mentioned = mentionables.filter((m) => handles.includes(m.handle));
      mentioned.forEach((m) => {
        emitNotification({
          userId: m.id,
          event: "ticket_mentioned",
          title: `You were mentioned · ${selected.number}`,
          body: `${me?.name ?? "Someone"}: ${text.slice(0, 120)}`,
          tag: `mention:${selected.id}:${m.id}`,
        });
      });
      if (mentioned.length > 0) {
        toast.success(`Notified ${mentioned.map((m) => m.name.split(" ")[0]).join(", ")}`);
      }
    } else {
      toast.success(internal ? "Internal note added" : "Reply sent");
    }
    setReply("");
  };

  const clearAdvanced = () => {
    setFilterStatus(""); setFilterPriority(""); setFilterAssignee(""); setFilterCategory("");
  };
  const advancedCount = [filterStatus, filterPriority, filterAssignee, filterCategory].filter(Boolean).length;

  return (
    <div className="h-full flex bg-background">
      {/* Queue rail - expanded with labels */}
      <div className="hidden lg:flex w-[200px] shrink-0 flex-col border-r border-border bg-surface/40 py-3 px-2 gap-0.5">
        <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Queue</div>
        {queues.map(q => {
          const Icon = q.icon;
          const active = queue === q.key;
          const count =
            q.key === "all" ? tickets.length :
            q.key === "mine" ? tickets.filter(t => t.assigneeId === me.id).length :
            q.key === "unassigned" ? tickets.filter(t => !t.assigneeId).length :
            tickets.filter(t => t.slaState === "at_risk" || t.slaState === "breached").length;
          return (
            <button
              key={q.key}
              onClick={() => setQueue(q.key)}
              title={q.label}
              className={cn(
                "h-8 px-2 rounded-md flex items-center gap-2 text-[12px] font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "hover:bg-surface-2 text-foreground/75 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left truncate">{q.label}</span>
              {count > 0 && (
                <span className={cn(
                  "text-[10px] tabular-nums px-1.5 rounded-full",
                  active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                )}>{count}</span>
              )}
            </button>
          );
        })}
        <div className="my-2 h-px bg-border" />
        <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tags</div>
        {["urgent","vpn","sso","onboarding","security"].map(t => (
          <button
            key={t}
            title={`#${t}`}
            className="h-7 px-2 rounded-md flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <Hash className="h-3 w-3 shrink-0" />
            <span className="truncate">{t}</span>
          </button>
        ))}
        <div className="mt-auto pt-2" title="Shortcuts: j/k navigate · r reply · / search · ⌘↵ send">
          <div className="h-7 px-2 rounded-md flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-2 cursor-help">
            <Zap className="h-3 w-3" />
            <span>Shortcuts</span>
          </div>
        </div>
      </div>

      {/* Ticket list */}
      <div className="w-full md:w-[360px] xl:w-[400px] shrink-0 border-r border-border bg-surface/20 flex flex-col">
        {/* Sticky filter header */}
        <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="font-display font-bold text-[15px]">Tickets</h2>
                <span className="text-[11px] text-muted-foreground tabular-nums">{filtered.length}</span>
              </div>
              <NewTicketDialog
                trigger={
                  <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors" title="New ticket">
                    <Plus className="h-4 w-4" />
                  </button>
                }
              />
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                id="ticket-search"
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets…"
                className="w-full h-8 pl-8 pr-12 rounded-md bg-surface-2 text-[13px] outline-none focus:ring-2 focus:ring-ring/40 border border-transparent focus:border-border"
              />
              <Kbd className="absolute right-2 top-1/2 -translate-y-1/2">/</Kbd>
            </div>
            {/* Quick filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {quickFilters.map(f => {
                const active = activeQuick === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setActiveQuick(active ? null : f.key)}
                    className={cn(
                      "h-6 px-2 rounded-full text-[11px] font-medium border transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                    )}
                  >{f.label}</button>
                );
              })}
              <div className="relative ml-auto">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className={cn(
                    "h-6 px-2 rounded-full text-[11px] font-medium border flex items-center gap-1 transition-colors",
                    advancedCount > 0
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  {advancedCount > 0 ? `${advancedCount}` : "Filters"}
                </button>
                {advancedOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAdvancedOpen(false)} />
                    <div className="absolute right-0 mt-1 w-64 rounded-lg bg-popover border border-border shadow-lg z-50 p-3 animate-fade-in space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold">Advanced filters</div>
                        {advancedCount > 0 && (
                          <button onClick={clearAdvanced} className="text-[10px] text-primary hover:underline">Clear all</button>
                        )}
                      </div>
                      <FilterSelect label="Status" value={filterStatus} onChange={(v) => setFilterStatus(v as TicketStatus)}
                        options={[["",""],["new","New"],["open","Open"],["in_progress","In Progress"],["on_hold","On Hold"],["resolved","Resolved"],["closed","Closed"]]} />
                      <FilterSelect label="Priority" value={filterPriority} onChange={(v) => setFilterPriority(v as Priority)}
                        options={[["",""],["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]} />
                      <FilterSelect label="Assignee" value={filterAssignee} onChange={setFilterAssignee}
                        options={[["", "Anyone"], ...orgAgents.map(a => [a.id, a.name] as [string, string])]} />
                      <FilterSelect label="Category" value={filterCategory} onChange={setFilterCategory}
                        options={[["", "All"], ...categories.map(c => [c, c] as [string, string])]} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyList hasFilters={!!(search || activeQuick || advancedCount)} onClear={() => { setSearch(""); setActiveQuick(null); clearAdvanced(); }} />
          ) : (
            filtered.map((t) => {
              const r = findUser(t.requesterId);
              const a = findAgent(t.assigneeId);
              const active = selected?.id === t.id;
              const last = t.messages[t.messages.length - 1];
              const unread = last?.authorRole === "requester" && t.status !== "resolved" && t.status !== "closed";
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t.id)}
                  className={cn("ticket-row w-full text-left px-3.5 py-2.5 border-b border-border/40 block group", active && "active")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {unread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Awaiting response" />}
                      <span className="text-[10px] font-mono text-muted-foreground">{t.number}</span>
                      <PriorityChip priority={t.priority} />
                    </div>
                    <SlaCountdown target={t.dueAt} state={t.slaState} compact />
                  </div>
                  <div className={cn("mt-1 text-[13px] leading-snug truncate", unread ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
                    {t.title}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {r && <Avatar initials={r.initials} color={r.avatarColor} size={16} />}
                      <span className="truncate">{r?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusChip status={t.status} />
                      <span className="tabular-nums">{timeAgo(t.updatedAt)}</span>
                    </div>
                  </div>
                  {a && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                      <Avatar initials={a.initials} color={a.avatarColor} size={14} />
                      <span className="truncate">{a.name}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Ticket detail */}
      {selected ? (
        <div className="hidden md:flex flex-1 min-w-0 flex-col bg-background">
          {/* Header */}
          <div className="border-b border-border bg-surface/40 backdrop-blur-xl px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-mono font-medium text-foreground/70">{selected.number}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{selected.category}</span>
                  <ChevronRight className="h-3 w-3" />
                  <ChannelIcon channel={selected.channel} />
                  <span className="capitalize">{selected.channel}</span>
                  <span className="mx-1">·</span>
                  <span>Opened {timeAgo(selected.createdAt)}</span>
                  {awaitingResponse && (
                    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/15 text-warning text-[10px] font-semibold border border-warning/30">
                      <Reply className="h-2.5 w-2.5" /> Awaiting response
                    </span>
                  )}
                </div>
                <h1 className="mt-0.5 font-display font-bold text-[18px] leading-tight truncate">{selected.title}</h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PresenceBubbles ticketId={selected.id} />
                {canWork && (
                  <button
                    onClick={() => me && toggleWatcher(selected.id, me.id)}
                    className={cn(
                      "h-8 px-2.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5",
                      me && selected.watcherIds?.includes(me.id)
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground"
                    )}
                    title={me && selected.watcherIds?.includes(me.id) ? "Stop watching" : "Watch ticket"}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    {me && selected.watcherIds?.includes(me.id) ? "Watching" : "Watch"}
                  </button>
                )}
                {canWork && (
                  <button
                    onClick={() => setStatus(selected.id, "resolved")}
                    className="h-8 px-2.5 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => setPriority(selected.id, "critical")}
                    className="h-8 px-2.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Escalate
                  </button>
                )}
                <div className="w-px h-5 bg-border mx-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-surface-2 text-muted-foreground" title="More"><MoreHorizontal className="h-4 w-4" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {canWork && <DropdownMenuItem onClick={() => useAppStore.getState().setStatus(selected.id, "on_hold")}>Put on hold</DropdownMenuItem>}
                    {canWork && <DropdownMenuItem onClick={() => useAppStore.getState().setStatus(selected.id, "closed")}>Close ticket</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => { navigator.clipboard?.writeText(selected.number); toast.success("Ticket number copied"); }}>Copy ticket number</DropdownMenuItem>
                    {canManage && <DropdownMenuSeparator />}
                    {canManage && (
                      <DropdownMenuItem onClick={() => { deleteTicket(selected.id); toast.success("Ticket deleted"); }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Inline property bar */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <SelectMenu
                label="Status" value={selected.status}
                options={["new","open","in_progress","on_hold","resolved","closed"] as TicketStatus[]}
                onChange={(v) => setStatus(selected.id, v as TicketStatus)}
              />
              <SelectMenu
                label="Priority" value={selected.priority}
                options={["low","medium","high","critical"] as Priority[]}
                onChange={(v) => setPriority(selected.id, v as Priority)}
              />
              <AssigneeMenu value={selected.assigneeId} onChange={(id) => setAssignee(selected.id, id)} />
              <div className="ml-auto flex items-center gap-2" key={tick}>
                <SlaInline label="Response" target={selected.responseDueAt} done={!!selected.firstResponseAt} />
                <SlaInline label="Resolution" target={selected.dueAt} done={selected.status === "resolved" || selected.status === "closed"} />
              </div>
            </div>
          </div>

          {/* Conversation + side panel */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_280px] 2xl:grid-cols-[1fr_320px]">
            <div className="flex flex-col min-h-0">
              <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {selected.messages.map((m, idx) => {
                  const isAgent = m.authorRole === "agent";
                  const u = findUser(m.authorId);
                  const prev = selected.messages[idx - 1];
                  const grouped = prev && prev.authorId === m.authorId && (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000);
                  return (
                    <div key={m.id} className={cn("flex gap-2.5 animate-fade-up", isAgent ? "flex-row-reverse" : "")} style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}>
                      <div className="w-7 shrink-0">
                        {!grouped && u && <Avatar initials={u.initials} color={u.avatarColor} size={28} />}
                      </div>
                      <div className={cn("max-w-[78%] flex flex-col", isAgent ? "items-end" : "items-start")}>
                        {!grouped && (
                          <div className="flex items-center gap-1.5 mb-0.5 px-1">
                            <span className="text-[11px] font-semibold">{m.authorName}</span>
                            <span className="text-[10px] text-muted-foreground">· {timeAgo(m.createdAt)}</span>
                            {m.isInternal && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-warning/15 text-warning border border-warning/30 inline-flex items-center gap-0.5 uppercase tracking-wider font-bold">
                                <Lock className="h-2 w-2" /> Internal
                              </span>
                            )}
                          </div>
                        )}
                        <div className={cn(
                          "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed border",
                          m.isInternal
                            ? "bg-warning/5 border-warning/30 text-foreground"
                            : isAgent
                            ? "bg-primary text-primary-foreground border-transparent shadow-sm rounded-tr-md"
                            : "bg-surface border-border rounded-tl-md"
                        )}>
                          <MessageBody text={m.body} knownHandles={mentionables.map(p => p.handle)} myHandle={me ? toHandle(me.name) : undefined} />
                        </div>
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {m.attachments.map(a => (
                              <span key={a.name} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface border border-border text-[11px]">
                                <Paperclip className="h-3 w-3 text-muted-foreground" /> {a.name} <span className="text-muted-foreground">{a.size}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              <div className="border-t border-border bg-surface/60 backdrop-blur-xl p-3">
                <div className="flex items-center gap-1 mb-2">
                  <button
                    onClick={() => setInternal(false)}
                    className={cn("text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1", !internal ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2")}
                  ><Reply className="h-3 w-3" /> Reply</button>
                  <button
                    onClick={() => setInternal(true)}
                    className={cn("text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1", internal ? "bg-warning/20 text-warning" : "text-muted-foreground hover:bg-surface-2")}
                  ><Lock className="h-3 w-3" /> Internal note</button>
                  <div className="ml-auto flex items-center gap-1">
                    <TemplateMenu onPick={(body) => setReply(body.replace("{name}", requester?.name.split(" ")[0] ?? "there"))} />
                    <MacroPicker ticket={selected} me={me} requesterName={requester?.name} />
                    <AssistSuggestButton
                      ticket={selected}
                      requesterName={requester?.name}
                      onSuggestion={(text) => setReply(text)}
                    />
                    <ReplyDraftsDialog
                      ticket={selected}
                      requesterName={requester?.name}
                      agentName={me?.name}
                      onUse={(text) => setReply(text)}
                    />
                  </div>
                </div>
                <div className={cn("relative rounded-xl border bg-surface p-2.5 transition-all focus-within:ring-2 focus-within:ring-ring/30", internal && "border-warning/40 bg-warning/5")}>
                  <MentionAutocomplete
                    ref={mentionRef}
                    value={reply}
                    textareaRef={composerRef}
                    people={mentionables}
                    onInsert={(next) => setReply(next)}
                  />
                  <textarea
                    ref={composerRef}
                    value={reply} onChange={e => {
                      setReply(e.target.value);
                      if (selected && me) {
                        presenceApi.setTyping({ id: me.id }, selected.id, e.target.value.length > 0);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (mentionRef.current?.handleKeyDown(e)) return;
                    }}
                    placeholder={internal ? "Write an internal note for the team… (use @ to mention)" : `Reply to ${requester?.name.split(" ")[0] ?? "customer"}… (use @ to mention)`}
                    rows={3}
                    className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      <button className="h-7 w-7 rounded-md hover:bg-surface-2 flex items-center justify-center text-muted-foreground" title="Attach"><Paperclip className="h-3.5 w-3.5" /></button>
                      <button className="h-7 w-7 rounded-md hover:bg-surface-2 flex items-center justify-center text-muted-foreground" title="Insert article"><FileText className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1">
                        <Kbd>⌘</Kbd><Kbd><CornerDownLeft className="h-2.5 w-2.5" /></Kbd> to send
                      </span>
                      <button onClick={send} disabled={!reply.trim()}
                        className={cn(
                          "h-8 px-3.5 rounded-md text-[12px] font-semibold flex items-center gap-1.5 transition-all",
                          internal
                            ? "bg-warning text-warning-foreground hover:opacity-90"
                            : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        )}>
                        <Send className="h-3 w-3" /> {internal ? "Add note" : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side panel */}
            <aside className="hidden lg:flex flex-col border-l border-border bg-surface/30 overflow-y-auto min-w-0">
              <Section title="AI assist">
                <AssistInsightsPanel ticket={selected} requesterName={requester?.name} />
              </Section>

              <Section title="Requester">
                {requester && (
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <Avatar initials={requester.initials} color={requester.avatarColor} size={36} />
                      <div className="min-w-0">
                        <div className="font-semibold text-[13px] leading-tight">{requester.name}</div>
                        <div className="text-[11px] text-muted-foreground capitalize">{requester.role}</div>
                      </div>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" /> <span className="truncate">{requester.email}</span></div>
                      {requester.company && <div className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3 w-3" /> {requester.company}</div>}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Stat label="Open tickets" value={String(requester.ticketsOpened ?? 0)} />
                      <Stat label="Channel" value={selected.channel} />
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Properties">
                <Field label="Category"><span className="text-[11px] text-foreground/80">{selected.category} / {selected.subcategory}</span></Field>
                <Field label="Created"><span className="text-[11px] text-foreground/80">{formatDateTime(selected.createdAt)}</span></Field>
                <Field label="Due"><span className="text-[11px] text-foreground/80">{formatDateTime(selected.dueAt)}</span></Field>
                <Field label="SLA"><SlaChip state={selected.slaState} /></Field>
                <div className="pt-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map(tg => (
                      <span key={tg} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border">#{tg}</span>
                    ))}
                    <button className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 flex items-center gap-0.5">
                      <Plus className="h-2.5 w-2.5" /> Add
                    </button>
                  </div>
                </div>
              </Section>

              <Section title={`Watchers · ${selected.watcherIds?.length ?? 0}`}>
                <div className="space-y-1.5">
                  {(selected.watcherIds ?? []).length === 0 && (
                    <div className="text-[11px] text-muted-foreground">No watchers yet. Watchers get notified on every reply or status change.</div>
                  )}
                  {(selected.watcherIds ?? []).map((wid) => {
                    const w = findUser(wid) ?? findAgent(wid);
                    if (!w) return null;
                    return (
                      <div key={wid} className="flex items-center gap-2 text-[11px]">
                        <Avatar initials={w.initials} color={w.avatarColor} size={20} />
                        <span className="flex-1 truncate">{w.name}</span>
                        {canManage && (
                          <button onClick={() => toggleWatcher(selected.id, wid)} className="text-muted-foreground hover:text-destructive p-0.5"><X className="h-3 w-3" /></button>
                        )}
                      </div>
                    );
                  })}
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="mt-1 text-[11px] px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Add watcher
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto">
                        {orgAgents
                          .filter((a) => !(selected.watcherIds ?? []).includes(a.id))
                          .map((a) => (
                            <DropdownMenuItem key={a.id} onClick={() => toggleWatcher(selected.id, a.id)}>
                              <Avatar initials={a.initials} color={a.avatarColor} size={18} />
                              <span className="ml-2 truncate">{a.name}</span>
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Section>

              {selected.attachments && selected.attachments.length > 0 && (
                <Section title="Attachments">
                  {selected.attachments.map(a => (
                    <div key={a.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-2 text-[11px]">
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 truncate">{a.name}</span>
                      <span className="text-muted-foreground">{a.size}</span>
                    </div>
                  ))}
                </Section>
              )}

              <Section title="Activity">
                <div className="relative pl-3.5">
                  <div className="absolute left-1 top-1 bottom-1 w-px bg-border" />
                  {selected.activity.slice().reverse().map((e) => (
                    <div key={e.id} className="relative pb-2.5">
                      <span className="absolute -left-[10px] top-1 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-surface" />
                      <div className="text-[11px] leading-snug">{e.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{e.by} · {timeAgo(e.at)}</div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Suggested articles">
                <SuggestedArticle title="How to reset your Okta password" />
                <SuggestedArticle title="Connecting to corporate VPN on macOS" />
                <SuggestedArticle title="Troubleshooting Zoom audio issues" />
              </Section>
            </aside>
          </div>
        </div>
      ) : (
        <EmptyDetail />
      )}
    </div>
  );
}

/* ----------------- Sub-components ----------------- */

function MessageBody({ text, knownHandles, myHandle }: { text: string; knownHandles: string[]; myHandle?: string }) {
  const set = new Set(knownHandles);
  const parts = renderWithMentions(text, (h) => set.has(h));
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.value}</span>;
        const handle = p.value.slice(1).toLowerCase();
        const isMe = !!myHandle && handle === myHandle;
        return (
          <span
            key={i}
            className={cn(
              "inline px-1 -mx-0.5 rounded font-medium",
              isMe ? "bg-warning/30 text-warning-foreground" : p.known ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted-foreground",
            )}
          >
            {p.value}
          </span>
        );
      })}
    </span>
  );
}


function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded bg-surface-2 border border-border text-[9px] font-mono text-muted-foreground", className)}>
      {children}
    </kbd>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const Icon = channel === "email" ? Mail : channel === "phone" ? Phone : channel === "chat" ? MessageSquare : Globe;
  return <Icon className="h-3 w-3" />;
}

function SlaCountdown({ target, state, compact }: { target: string; state: string; compact?: boolean }) {
  const diff = new Date(target).getTime() - Date.now();
  const breached = diff < 0;
  const atRisk = !breached && diff < 60 * 60 * 1000;
  const tone = state === "met"
    ? "text-muted-foreground"
    : breached || state === "breached"
    ? "text-destructive"
    : atRisk || state === "at_risk"
    ? "text-warning"
    : "text-success";
  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[10px] font-mono font-semibold tabular-nums", tone)}>
        <Clock className="h-2.5 w-2.5" />{breached ? "-" : ""}{timeUntil(target).replace("-", "")}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-mono font-semibold tabular-nums", tone)}>
      <Clock className="h-3 w-3" />{timeUntil(target)}
    </span>
  );
}

function SlaInline({ label, target, done }: { label: string; target: string; done?: boolean }) {
  const diff = new Date(target).getTime() - Date.now();
  const breached = diff < 0 && !done;
  const atRisk = !breached && diff < 60 * 60 * 1000 && !done;
  const tone = done ? "bg-success/10 text-success border-success/30"
    : breached ? "bg-destructive/10 text-destructive border-destructive/30"
    : atRisk ? "bg-warning/10 text-warning border-warning/30"
    : "bg-surface-2 text-foreground/70 border-border";
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px]", tone)}>
      <Clock className="h-3 w-3" />
      <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      <span className="font-mono font-bold tabular-nums">{done ? "Met" : timeUntil(target)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3.5 border-b border-border last:border-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold text-[12px] capitalize">{value}</div>
    </div>
  );
}

function SuggestedArticle({ title }: { title: string }) {
  return (
    <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-surface-2 text-[11px] flex items-start gap-2 group">
      <FileText className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
      <span className="line-clamp-2 leading-snug">{title}</span>
    </button>
  );
}

function SelectMenu<T extends string>({ label, value, options, onChange }: { label?: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-7 px-2 rounded-md bg-surface-2 hover:bg-muted text-[11px] font-medium flex items-center gap-1 capitalize border border-transparent hover:border-border transition-colors"
        >
          {label && <span className="text-muted-foreground font-normal">{label}:</span>}
          <span>{value.replace("_", " ")}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {options.map((o) => (
          <DropdownMenuItem
            key={o}
            onSelect={() => onChange(o)}
            className="text-[11px] capitalize flex items-center justify-between"
          >
            {o.replace("_", " ")}
            {o === value && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AssigneeMenu({ value, onChange }: { value?: string; onChange: (id: string | undefined) => void }) {
  const orgAgents = useOrgAgents();
  const a = value ? findAgent(value) : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-7 px-2 rounded-md bg-surface-2 hover:bg-muted text-[11px] font-medium flex items-center gap-1.5 border border-transparent hover:border-border transition-colors"
        >
          <span className="text-muted-foreground font-normal">Assignee:</span>
          {a ? (
            <span className="flex items-center gap-1">
              <Avatar initials={a.initials} color={a.avatarColor} size={14} />
              {a.name.split(" ")[0]}
            </span>
          ) : (
            <span className="text-muted-foreground italic">Unassigned</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto">
        <DropdownMenuItem onSelect={() => onChange(undefined)} className="text-[11px] text-muted-foreground italic">
          Unassigned
        </DropdownMenuItem>
        {orgAgents.map((ag) => (
          <DropdownMenuItem
            key={ag.id}
            onSelect={() => onChange(ag.id)}
            className="text-[11px] flex items-center gap-2"
          >
            <Avatar initials={ag.initials} color={ag.avatarColor} size={18} online={ag.online} />
            <span className="flex-1">{ag.name}</span>
            {ag.id === value && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2 rounded-md bg-surface-2 text-[12px] border border-border outline-none focus:ring-2 focus:ring-ring/30">
        {options.map(([v, l]) => <option key={v} value={v}>{l || "Any"}</option>)}
      </select>
    </div>
  );
}

function TemplateMenu({ onPick }: { onPick: (body: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-2">
        <FileText className="h-3 w-3" /> Templates
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-1 w-64 rounded-lg bg-popover border border-border shadow-lg z-50 py-1 animate-fade-in">
            {replyTemplates.map(t => (
              <button key={t.label}
                onClick={() => { onPick(t.body); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-surface-2"
              >
                <div className="text-[11px] font-semibold">{t.label}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{t.body}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2 bg-surface/30">
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-16 rounded shimmer" />
            <div className="h-2.5 w-12 rounded shimmer" />
          </div>
          <div className="h-3 w-3/4 rounded shimmer" />
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-20 rounded shimmer" />
            <div className="h-2.5 w-14 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyList({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 text-muted-foreground">
      <div className="h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
        {hasFilters ? <Search className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
      </div>
      <div className="font-semibold text-foreground text-sm">{hasFilters ? "No tickets match" : "Your queue is clear"}</div>
      <div className="text-[11px] mt-1 max-w-[220px]">{hasFilters ? "Try adjusting your search or filters." : "New tickets will appear here as they arrive."}</div>
      {hasFilters && (
        <button onClick={onClear} className="mt-3 text-[11px] text-primary hover:underline flex items-center gap-1">
          <X className="h-3 w-3" /> Clear filters
        </button>
      )}
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-14 w-14 rounded-2xl bg-surface-2 mx-auto flex items-center justify-center mb-3">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="font-semibold text-sm">Select a ticket to get started</div>
        <div className="text-[11px] text-muted-foreground mt-1">Use <Kbd>j</Kbd> <Kbd>k</Kbd> to navigate the queue</div>
      </div>
    </div>
  );
}
