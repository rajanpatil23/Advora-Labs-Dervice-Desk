import { useMemo, useState } from "react";
import { useAppStore, findUser, findAgent, agents } from "@/lib/store";
import { PriorityChip, StatusChip, SlaChip, Avatar } from "@/components/common/Chips";
import { timeAgo, timeUntil, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Filter, Inbox, Star, Clock, AlertTriangle, ChevronDown, Paperclip, Send,
  Lock, MoreHorizontal, Tag, Building2, Mail, Phone, Globe, MessageSquare,
  Plus, X, Sparkles
} from "lucide-react";
import type { Priority, TicketStatus } from "@/lib/types";

const queues = [
  { key: "all", label: "All tickets", icon: Inbox },
  { key: "mine", label: "My queue", icon: Star },
  { key: "unassigned", label: "Unassigned", icon: Clock },
  { key: "at_risk", label: "SLA at risk", icon: AlertTriangle },
];

export default function Tickets() {
  const { tickets, selectedTicketId, setSelectedTicket, addMessage, setStatus, setPriority, setAssignee } = useAppStore();
  const [queue, setQueue] = useState("all");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const me = agents[0];

  const filtered = useMemo(() => {
    let list = tickets;
    if (queue === "mine") list = list.filter(t => t.assigneeId === me.id);
    if (queue === "unassigned") list = list.filter(t => !t.assigneeId);
    if (queue === "at_risk") list = list.filter(t => t.slaState === "at_risk" || t.slaState === "breached");
    if (search) list = list.filter(t => (t.title + " " + t.number).toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [tickets, queue, search, me.id]);

  const selected = tickets.find(t => t.id === selectedTicketId) ?? filtered[0];
  const requester = selected ? findUser(selected.requesterId) : null;
  const assignee = selected?.assigneeId ? findAgent(selected.assigneeId) : null;

  const send = () => {
    if (!selected || !reply.trim()) return;
    addMessage(selected.id, reply.trim(), internal);
    setReply("");
  };

  return (
    <div className="h-full flex">
      {/* Queue rail */}
      <div className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-surface/50 p-3 gap-1">
        <div className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Queues</div>
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
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-surface-2 text-foreground/80"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{q.label}</span>
              <span className="text-[10px] font-semibold tabular-nums">{count}</span>
            </button>
          );
        })}
        <div className="px-2 pt-4 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Tags</div>
        {["urgent","vpn","sso","onboarding","security"].map(t => (
          <button key={t} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-surface-2 text-foreground/70">
            <Tag className="h-3 w-3" /> {t}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="w-full md:w-[380px] xl:w-[420px] shrink-0 border-r border-border bg-surface/30 flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg">Tickets</h2>
            <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-2"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-2">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 h-9 px-3 rounded-lg bg-surface-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="h-9 px-3 rounded-lg bg-surface-2 text-xs font-medium flex items-center gap-1.5 hover:bg-muted">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((t) => {
            const r = findUser(t.requesterId);
            const a = findAgent(t.assigneeId);
            const active = selected?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t.id)}
                className={cn("ticket-row w-full text-left px-4 py-3 border-b border-border/60 block", active && "active")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{t.number}</span>
                    <PriorityChip priority={t.priority} />
                  </div>
                  <SlaChip state={t.slaState} />
                </div>
                <div className="mt-1.5 text-sm font-semibold leading-snug line-clamp-2">{t.title}</div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {r && <Avatar initials={r.initials} color={r.avatarColor} size={20} />}
                    <span className="truncate">{r?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={t.status} />
                    <span className="hidden xl:inline">{timeAgo(t.updatedAt)}</span>
                  </div>
                </div>
                {a && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Avatar initials={a.initials} color={a.avatarColor} size={16} />
                    <span>{a.name}</span>
                    <span className="ml-auto">Due {timeUntil(t.dueAt)}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticket detail */}
      {selected ? (
        <div className="hidden md:flex flex-1 min-w-0 flex-col bg-surface/20">
          {/* Header */}
          <div className="border-b border-border bg-surface/60 backdrop-blur-xl px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{selected.number}</span>
                  <span>•</span>
                  <ChannelIcon channel={selected.channel} />
                  <span className="capitalize">{selected.channel}</span>
                  <span>•</span>
                  <span>Opened {timeAgo(selected.createdAt)}</span>
                </div>
                <h1 className="mt-1 font-display font-bold text-xl leading-tight truncate">{selected.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusChip status={selected.status} />
                  <PriorityChip priority={selected.priority} />
                  <SlaChip state={selected.slaState} />
                  {selected.tags.map(tg => (
                    <span key={tg} className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 text-muted-foreground border border-border">#{tg}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <SelectMenu
                  label="Status"
                  value={selected.status}
                  options={["new","open","in_progress","on_hold","resolved","closed"] as TicketStatus[]}
                  onChange={(v) => setStatus(selected.id, v as TicketStatus)}
                />
                <button className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-surface-2"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
            </div>

            {/* SLA timer strip */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SlaTimer label="First Response" target={selected.responseDueAt} done={!!selected.firstResponseAt} />
              <SlaTimer label="Resolution" target={selected.dueAt} done={selected.status === "resolved" || selected.status === "closed"} />
              <div className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Assignee</div>
                <div className="mt-1 flex items-center gap-2">
                  {assignee ? (
                    <>
                      <Avatar initials={assignee.initials} color={assignee.avatarColor} size={28} online={assignee.online} />
                      <div className="text-sm font-semibold leading-tight">
                        {assignee.name}
                        <div className="text-[11px] text-muted-foreground font-normal">{assignee.team}</div>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => setAssignee(selected.id, me.id)} className="text-xs text-primary hover:underline">Assign to me</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conversation + side panel */}
          <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1fr_320px]">
            <div className="flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {selected.messages.map((m, idx) => {
                  const isAgent = m.authorRole === "agent";
                  const u = findUser(m.authorId);
                  return (
                    <div key={m.id} className={cn("flex gap-3 animate-fade-up", isAgent ? "flex-row-reverse" : "")} style={{ animationDelay: `${idx*40}ms` }}>
                      {u && <Avatar initials={u.initials} color={u.avatarColor} size={32} />}
                      <div className={cn("max-w-[80%] flex flex-col", isAgent ? "items-end" : "items-start")}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">{m.authorName}</span>
                          {m.isInternal && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30 inline-flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" /> Internal
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                        </div>
                        <div className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed border",
                          m.isInternal
                            ? "bg-warning/5 border-warning/30"
                            : isAgent
                            ? "bg-gradient-primary text-primary-foreground border-transparent shadow-sm"
                            : "bg-surface border-border"
                        )}>
                          {m.body}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              <div className="border-t border-border bg-surface/60 backdrop-blur-xl p-4">
                <div className="flex items-center gap-1 mb-2">
                  <button
                    onClick={() => setInternal(false)}
                    className={cn("text-xs px-3 py-1 rounded-md font-medium transition-colors", !internal ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2")}
                  >Reply</button>
                  <button
                    onClick={() => setInternal(true)}
                    className={cn("text-xs px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1", internal ? "bg-warning/20 text-warning" : "text-muted-foreground hover:bg-surface-2")}
                  ><Lock className="h-3 w-3" /> Internal note</button>
                  <button className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI suggest</button>
                </div>
                <div className={cn("rounded-xl border bg-surface p-3 transition-shadow focus-within:shadow-md", internal && "border-warning/40 bg-warning/5")}>
                  <textarea
                    value={reply} onChange={e => setReply(e.target.value)}
                    placeholder={internal ? "Add an internal note for the team…" : "Type your reply to the customer…"}
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Paperclip className="h-3.5 w-3.5" /> Attach
                    </button>
                    <button onClick={send} disabled={!reply.trim()} className="bg-gradient-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 hover:shadow-glow transition-shadow">
                      <Send className="h-3.5 w-3.5" /> Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side panel */}
            <aside className="hidden xl:flex flex-col border-l border-border bg-surface/40 overflow-y-auto">
              <Section title="Requester">
                {requester && (
                  <div className="flex items-start gap-3">
                    <Avatar initials={requester.initials} color={requester.avatarColor} size={40} />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{requester.name}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {requester.email}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Building2 className="h-3 w-3" /> {requester.company}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Stat tiny label="Open" value={String(requester.ticketsOpened)} />
                        <Stat tiny label="Channel" value={selected.channel} />
                      </div>
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Properties">
                <Field label="Priority">
                  <SelectMenu value={selected.priority} options={["low","medium","high","critical"] as Priority[]} onChange={(v) => setPriority(selected.id, v as Priority)} />
                </Field>
                <Field label="Assignee">
                  <select
                    value={selected.assigneeId ?? ""}
                    onChange={(e) => setAssignee(selected.id, e.target.value || undefined)}
                    className="bg-surface-2 text-xs px-2 py-1.5 rounded-md border border-border w-full"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
                <Field label="Category"><span className="text-xs">{selected.category} / {selected.subcategory}</span></Field>
                <Field label="Created"><span className="text-xs">{formatDateTime(selected.createdAt)}</span></Field>
                <Field label="Due"><span className="text-xs">{formatDateTime(selected.dueAt)}</span></Field>
              </Section>

              {selected.attachments && selected.attachments.length > 0 && (
                <Section title="Attachments">
                  {selected.attachments.map(a => (
                    <div key={a.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-2 text-xs">
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 truncate">{a.name}</span>
                      <span className="text-muted-foreground">{a.size}</span>
                    </div>
                  ))}
                </Section>
              )}

              <Section title="Activity">
                <div className="relative pl-4">
                  <div className="absolute left-1 top-1 bottom-1 w-px bg-border" />
                  {selected.activity.slice().reverse().map((e) => (
                    <div key={e.id} className="relative pb-3">
                      <span className="absolute -left-3 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
                      <div className="text-xs">{e.text}</div>
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No ticket selected</div>
      )}
    </div>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const Icon = channel === "email" ? Mail : channel === "phone" ? Phone : channel === "chat" ? MessageSquare : Globe;
  return <Icon className="h-3 w-3" />;
}

function SlaTimer({ label, target, done }: { label: string; target: string; done?: boolean }) {
  const diff = new Date(target).getTime() - Date.now();
  const breached = diff < 0 && !done;
  const atRisk = !breached && diff < 60*60*1000 && !done;
  return (
    <div className={cn(
      "rounded-xl border px-4 py-3",
      done ? "bg-success/5 border-success/30" :
      breached ? "bg-destructive/5 border-destructive/40" :
      atRisk ? "bg-warning/5 border-warning/40" : "bg-surface border-border"
    )}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <Clock className={cn("h-3.5 w-3.5", done ? "text-success" : breached ? "text-destructive" : atRisk ? "text-warning" : "text-muted-foreground")} />
      </div>
      <div className={cn("mt-1 font-mono font-bold text-lg",
        done ? "text-success" : breached ? "text-destructive" : atRisk ? "text-warning" : "text-foreground"
      )}>
        {done ? "Met" : (breached ? "Breached " : "") + timeUntil(target)}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4 border-b border-border last:border-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function Stat({ label, value, tiny }: { label: string; value: string; tiny?: boolean }) {
  return (
    <div className={cn("rounded-md bg-surface-2 px-2 py-1.5", tiny && "text-[11px]")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold capitalize">{value}</div>
    </div>
  );
}

function SuggestedArticle({ title }: { title: string }) {
  return (
    <button className="w-full text-left px-2 py-2 rounded-md hover:bg-surface-2 text-xs flex items-start gap-2 group">
      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 group-hover:bg-accent transition-colors" />
      <span className="line-clamp-2">{title}</span>
    </button>
  );
}

function SelectMenu<T extends string>({ label, value, options, onChange }: { label?: string; value: T; options: T[]; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-9 px-3 rounded-lg bg-surface-2 text-xs font-medium flex items-center gap-1.5 hover:bg-muted capitalize"
      >
        {label && <span className="text-muted-foreground">{label}:</span>} {value.replace("_"," ")} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 rounded-lg bg-popover border border-border shadow-lg z-50 py-1 animate-fade-in">
            {options.map(o => (
              <button
                key={o}
                onClick={() => { onChange(o); setOpen(false); }}
                className="w-full text-left text-xs px-3 py-1.5 hover:bg-surface-2 capitalize flex items-center justify-between"
              >
                {o.replace("_"," ")}
                {o === value && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
