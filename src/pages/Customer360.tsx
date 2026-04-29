import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users2, Search, Building2, MapPin, Globe, Mail, CalendarClock, Activity, Heart,
  Ticket, CheckCircle2, MessageCircle, Send, Smile, CreditCard, LogIn, Sparkles,
  StickyNote, AlertOctagon, TrendingUp, TrendingDown, DollarSign, Crown, Plus,
} from "lucide-react";
import { customer360Api, KIND_META, type Customer360, type TimelineEvent, type TimelineEventKind } from "@/lib/api/customer360";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Mail> = {
  Ticket, CheckCircle2, MessageCircle, Send, Smile, CreditCard, LogIn, Sparkles, StickyNote, AlertOctagon, Mail,
};

const TIER_META: Record<Customer360["tier"], { label: string; color: string; icon: typeof Crown | null }> = {
  free:       { label: "Free",        color: "bg-muted text-muted-foreground border-border", icon: null },
  pro:        { label: "Pro",         color: "bg-sky-500/15 text-sky-600 border-sky-500/30", icon: null },
  enterprise: { label: "Enterprise",  color: "bg-violet-500/15 text-violet-600 border-violet-500/30", icon: null },
  vip:        { label: "VIP",         color: "bg-amber-500/15 text-amber-700 border-amber-500/40", icon: Crown },
};

export default function Customer360() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = ["owner","admin","manager","agent","resolver"].includes(role ?? "");

  const [customers, setCustomers] = useState<Customer360[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TimelineEventKind>("all");
  const [note, setNote] = useState("");

  useEffect(() => {
    const c = customer360Api.list();
    setCustomers(c);
    if (!activeId && c[0]) setActiveId(c[0].id);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q),
    );
  }, [customers, query]);

  const active = useMemo(() => customers.find((c) => c.id === activeId) ?? null, [customers, activeId]);
  const timeline = useMemo(() => active ? customer360Api.timeline(active.id) : [], [active, note]);
  const filteredTimeline = useMemo(() => filter === "all" ? timeline : timeline.filter((e) => e.kind === filter), [timeline, filter]);
  const metrics = useMemo(() => active ? customer360Api.metrics(active.id) : null, [active, timeline]);

  if (!allowed) return <Navigate to="/app" replace />;

  const handleAddNote = () => {
    if (!active || !note.trim()) return;
    customer360Api.addNote(active.id, note.trim());
    setNote("");
    toast.success("Note added to timeline");
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <header className="border-b bg-background px-6 py-4 flex items-center gap-3 shrink-0">
        <Users2 className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display font-bold text-lg">Customer 360</h1>
          <p className="text-xs text-muted-foreground">Unified view of every customer interaction</p>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* Customer list */}
        <aside className="col-span-3 border-r flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers…" className="h-8 pl-8 text-sm" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredCustomers.map((c) => {
                const isActive = activeId === c.id;
                const tier = TIER_META[c.tier];
                const TierIcon = tier.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 transition-colors flex items-start gap-2.5",
                      isActive ? "bg-primary/5" : "hover:bg-muted/40",
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-[11px]">{c.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{c.name}</span>
                        {TierIcon && <TierIcon className="h-3 w-3 text-amber-500 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.company}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={cn("h-4 text-[9px]", tier.color)}>{tier.label}</Badge>
                        <HealthDot score={c.healthScore} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Profile + timeline */}
        <section className="col-span-9 overflow-y-auto">
          {!active ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Select a customer</div>
          ) : (
            <div className="p-6 space-y-5 max-w-[1200px]">
              {/* Header card */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className="text-xl font-bold">{active.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-display font-bold">{active.name}</h2>
                    <Badge variant="outline" className={cn(TIER_META[active.tier].color)}>{TIER_META[active.tier].label}</Badge>
                    {active.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px] h-4">{t}</Badge>)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {active.company}</div>
                    <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> <span className="truncate">{active.email}</span></div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {active.region}</div>
                    <div className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> {active.language}</div>
                    <div className="flex items-center gap-1.5"><CalendarClock className="h-3 w-3" /> Joined {new Date(active.joinedAt).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> Last seen {timeAgo(active.lastSeenAt)}</div>
                  </div>
                </div>
              </div>

              {/* Health + metrics grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <MetricCard label="Health score" value={`${active.healthScore}`} suffix="/100" tone={active.healthScore >= 70 ? "good" : active.healthScore >= 40 ? "warn" : "bad"} icon={Heart} />
                <MetricCard label="Lifetime value" value={`$${active.lifetimeValue.toLocaleString()}`} icon={DollarSign} />
                <MetricCard label="MRR" value={active.mrr ? `$${active.mrr.toLocaleString()}` : "-"} icon={TrendingUp} />
                <MetricCard label="Tickets opened" value={`${metrics?.opened ?? 0}`} icon={Ticket} />
                <MetricCard
                  label="Avg CSAT"
                  value={metrics?.avgCsat ? `${metrics.avgCsat.toFixed(1)}/5` : "-"}
                  icon={Smile}
                  tone={metrics?.avgCsat && metrics.avgCsat >= 4 ? "good" : metrics?.avgCsat && metrics.avgCsat < 3 ? "bad" : undefined}
                />
              </div>

              <div className="grid grid-cols-12 gap-5">
                {/* Account details */}
                <Card className="col-span-12 lg:col-span-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Account details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <Detail label="Timezone" value={active.timezone} />
                    <Detail label="Renewal" value={new Date(active.contractRenewal).toLocaleDateString()} />
                    <Detail label="NPS" value={active.npsScore == null ? "-" : `${active.npsScore > 0 ? "+" : ""}${active.npsScore}`} />
                    <Separator className="my-2" />
                    {Object.entries(active.customFields).map(([k, v]) => (
                      <Detail key={k} label={k} value={v} />
                    ))}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card className="col-span-12 lg:col-span-8">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between gap-2">
                      <span>Activity timeline</span>
                      <Badge variant="outline" className="h-5 text-[10px]">{filteredTimeline.length} events</Badge>
                    </CardTitle>
                    <CardDescription>All ticket, message, billing, and product activity in one stream.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
                      <TabsList className="h-8 flex-wrap w-full justify-start">
                        <TabsTrigger value="all" className="text-xs h-6">All</TabsTrigger>
                        <TabsTrigger value="ticket_opened" className="text-xs h-6">Tickets</TabsTrigger>
                        <TabsTrigger value="message_received" className="text-xs h-6">Messages</TabsTrigger>
                        <TabsTrigger value="csat_submitted" className="text-xs h-6">CSAT</TabsTrigger>
                        <TabsTrigger value="billing_event" className="text-xs h-6">Billing</TabsTrigger>
                        <TabsTrigger value="note_added" className="text-xs h-6">Notes</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {/* Add note */}
                    <div className="mb-4 rounded-lg border bg-muted/30 p-2.5 space-y-2">
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add an internal note to the customer's timeline…"
                        rows={2}
                        className="text-xs resize-none bg-background"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setNote("")} disabled={!note}>Clear</Button>
                        <Button size="sm" onClick={handleAddNote} disabled={!note.trim()}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add note
                        </Button>
                      </div>
                    </div>

                    {filteredTimeline.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-6">No events for this filter</p>
                    ) : (
                      <ol className="relative border-l border-border ml-2 space-y-3">
                        {filteredTimeline.map((evt) => <TimelineRow key={evt.id} event={evt} />)}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, suffix, icon: Icon, tone,
}: { label: string; value: string; suffix?: string; icon: typeof Heart; tone?: "good" | "warn" | "bad" }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" /> {label}
        </div>
        <div className={cn(
          "mt-1.5 text-xl font-display font-bold tabular-nums",
          tone === "good" && "text-emerald-600",
          tone === "warn" && "text-amber-600",
          tone === "bad" && "text-rose-600",
        )}>
          {value}
          {suffix && <span className="text-xs text-muted-foreground font-normal ml-0.5">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function HealthDot({ score }: { score: number }) {
  const tone = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", tone)} />
      {score}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right truncate">{value}</span>
    </div>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const meta = KIND_META[event.kind];
  const Icon = ICONS[meta.icon] ?? Mail;
  return (
    <li className="ml-4 relative">
      <span className={cn("absolute -left-[26px] top-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center", meta.color)}>
        <Icon className="h-2.5 w-2.5" />
      </span>
      <div className="rounded-lg border bg-card px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">{event.title}</span>
          <Badge variant="outline" className={cn("h-4 text-[9px]", meta.color)}>{meta.label}</Badge>
          {event.refLabel && <Badge variant="outline" className="h-4 text-[9px] font-mono">{event.refLabel}</Badge>}
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{timeAgo(event.occurredAt)}</span>
        </div>
        {event.detail && <p className="text-xs text-muted-foreground mt-1">{event.detail}</p>}
      </div>
    </li>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
