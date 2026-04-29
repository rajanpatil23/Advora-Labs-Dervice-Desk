import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import {
  addLink, listLinks, removeLink, listMerges, mergeTickets,
  linkKindLabels, type LinkKind, type TicketLink, type MergeRecord,
} from "@/lib/api/ticketLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Link2, GitMerge, Trash2, Search, Plus, ArrowRight, AlertTriangle, History,
} from "lucide-react";
import type { Ticket } from "@/lib/types";

const LINK_KINDS: LinkKind[] = ["duplicate", "related", "blocks", "blocked_by", "parent", "child"];

export default function TicketLinks() {
  const tickets = useAppStore(s => s.tickets);
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [links, setLinks] = useState<TicketLink[]>([]);
  const [merges, setMerges] = useState<MergeRecord[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLinks(selectedId ? listLinks(selectedId) : []);
    setMerges(listMerges());
  }, [selectedId, tick]);

  useEffect(() => {
    if (!selectedId && tickets[0]) setSelectedId(tickets[0].id);
  }, [tickets, selectedId]);

  const ticketById = useMemo(() => {
    const m = new Map<string, Ticket>();
    tickets.forEach(t => m.set(t.id, t));
    return m;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.number.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const selected = selectedId ? ticketById.get(selectedId) : undefined;
  const mergedAway = selected && merges.find(m => m.sourceTicketId === selected.id);

  function refresh() { setTick(t => t + 1); }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Sidebar: ticket picker */}
      <Card className="w-80 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Tickets
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by # or title"
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto px-2 pb-2 space-y-1">
          {filtered.map(t => {
            const linkCount = listLinks(t.id).length;
            const isMerged = merges.some(m => m.sourceTicketId === t.id);
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                  selectedId === t.id ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
                  <div className="flex items-center gap-1">
                    {isMerged && <Badge variant="outline" className="text-[10px]">merged</Badge>}
                    {linkCount > 0 && <Badge variant="secondary" className="text-[10px]">{linkCount}</Badge>}
                  </div>
                </div>
                <div className="line-clamp-1 text-foreground">{t.title}</div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No tickets found</div>
          )}
        </CardContent>
      </Card>

      {/* Main area */}
      <div className="flex-1 overflow-auto">
        {!selected ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-muted-foreground">Select a ticket to manage links</div>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{selected.number}</div>
                    <CardTitle className="text-xl">{selected.title}</CardTitle>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{selected.status}</Badge>
                      <Badge variant="outline">{selected.priority}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <AddLinkDialog
                      sourceId={selected.id}
                      tickets={tickets.filter(t => t.id !== selected.id)}
                      currentUser={user?.email ?? "agent"}
                      onSaved={refresh}
                    />
                    <MergeDialog
                      sourceId={selected.id}
                      tickets={tickets.filter(t => t.id !== selected.id)}
                      currentUser={user?.email ?? "agent"}
                      disabled={!!mergedAway}
                      onSaved={refresh}
                    />
                  </div>
                </div>
                {mergedAway && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>
                      This ticket has been merged into{" "}
                      <span className="font-mono">
                        {ticketById.get(mergedAway.targetTicketId)?.number ?? mergedAway.targetTicketId}
                      </span>
                      {mergedAway.reason && <> — {mergedAway.reason}</>}
                    </span>
                  </div>
                )}
              </CardHeader>
            </Card>

            <Tabs defaultValue="links">
              <TabsList>
                <TabsTrigger value="links">
                  <Link2 className="mr-2 h-4 w-4" /> Links ({links.length})
                </TabsTrigger>
                <TabsTrigger value="merges">
                  <History className="mr-2 h-4 w-4" /> Merge history
                </TabsTrigger>
              </TabsList>

              <TabsContent value="links" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {links.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        No links yet. Use "Add link" to associate this ticket with others.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {links.map(link => {
                          const isFrom = link.fromTicketId === selected.id;
                          const otherId = isFrom ? link.toTicketId : link.fromTicketId;
                          const other = ticketById.get(otherId);
                          const label = isFrom
                            ? linkKindLabels[link.kind]
                            : linkKindLabels[link.kind]; // mirror exists separately
                          return (
                            <div key={link.id} className="flex items-center gap-3 p-4">
                              <Badge variant="secondary" className="shrink-0">{label}</Badge>
                              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              {other ? (
                                <button
                                  onClick={() => setSelectedId(other.id)}
                                  className="flex-1 text-left hover:underline"
                                >
                                  <span className="font-mono text-xs text-muted-foreground mr-2">{other.number}</span>
                                  {other.title}
                                </button>
                              ) : (
                                <span className="flex-1 text-muted-foreground italic">Unknown ticket ({otherId})</span>
                              )}
                              {link.note && (
                                <span className="text-sm text-muted-foreground italic max-w-xs truncate">
                                  "{link.note}"
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  removeLink(link.id);
                                  toast.success("Link removed");
                                  refresh();
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="merges" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {(() => {
                      const related = merges.filter(m =>
                        m.sourceTicketId === selected.id || m.targetTicketId === selected.id
                      );
                      if (related.length === 0) {
                        return (
                          <div className="p-12 text-center text-muted-foreground">
                            No merge events for this ticket.
                          </div>
                        );
                      }
                      return (
                        <div className="divide-y">
                          {related.map(m => {
                            const src = ticketById.get(m.sourceTicketId);
                            const tgt = ticketById.get(m.targetTicketId);
                            return (
                              <div key={m.id} className="p-4 flex items-center gap-3">
                                <GitMerge className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1 text-sm">
                                  <span className="font-mono">{src?.number ?? m.sourceTicketId}</span>
                                  <span className="mx-2 text-muted-foreground">merged into</span>
                                  <span className="font-mono">{tgt?.number ?? m.targetTicketId}</span>
                                  {m.reason && <span className="ml-2 text-muted-foreground">— {m.reason}</span>}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  by {m.mergedBy} · {new Date(m.mergedAt).toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

function AddLinkDialog({
  sourceId, tickets, currentUser, onSaved,
}: {
  sourceId: string;
  tickets: Ticket[];
  currentUser: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LinkKind>("related");
  const [targetId, setTargetId] = useState<string>("");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tickets.slice(0, 50);
    return tickets.filter(t =>
      t.title.toLowerCase().includes(s) || t.number.toLowerCase().includes(s)
    ).slice(0, 50);
  }, [tickets, q]);

  function submit() {
    if (!targetId) {
      toast.error("Pick a target ticket");
      return;
    }
    addLink({ fromTicketId: sourceId, toTicketId: targetId, kind, note, createdBy: currentUser });
    toast.success("Link added");
    setOpen(false);
    setTargetId(""); setNote(""); setQ("");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Add link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to another ticket</DialogTitle>
          <DialogDescription>Create a relationship between these two tickets.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Relationship</label>
            <Select value={kind} onValueChange={v => setKind(v as LinkKind)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LINK_KINDS.map(k => (
                  <SelectItem key={k} value={k}>{linkKindLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Target ticket</label>
            <Input
              placeholder="Search by # or title…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="mt-1"
            />
            <div className="mt-2 max-h-56 overflow-auto rounded-md border">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTargetId(t.id)}
                  className={`w-full px-3 py-2 text-left text-sm border-b last:border-b-0 ${
                    targetId === t.id ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2">{t.number}</span>
                  {t.title}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No matches</div>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Why is this linked?"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({
  sourceId, tickets, currentUser, disabled, onSaved,
}: {
  sourceId: string;
  tickets: Ticket[];
  currentUser: string;
  disabled?: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tickets.slice(0, 50);
    return tickets.filter(t =>
      t.title.toLowerCase().includes(s) || t.number.toLowerCase().includes(s)
    ).slice(0, 50);
  }, [tickets, q]);

  function submit() {
    if (!targetId) {
      toast.error("Pick a surviving ticket");
      return;
    }
    try {
      mergeTickets({
        sourceTicketId: sourceId,
        targetTicketId: targetId,
        reason,
        mergedBy: currentUser,
        messagesMoved: 0,
      });
      toast.success("Tickets merged");
      setOpen(false);
      setTargetId(""); setReason(""); setQ("");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Merge failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <GitMerge className="mr-2 h-4 w-4" /> Merge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge into another ticket</DialogTitle>
          <DialogDescription>
            This ticket will be marked as merged. The surviving ticket keeps the activity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Surviving ticket</label>
            <Input
              placeholder="Search by # or title…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="mt-1"
            />
            <div className="mt-2 max-h-56 overflow-auto rounded-md border">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTargetId(t.id)}
                  className={`w-full px-3 py-2 text-left text-sm border-b last:border-b-0 ${
                    targetId === t.id ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2">{t.number}</span>
                  {t.title}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No matches</div>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. duplicate report from same customer"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Merge tickets</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
