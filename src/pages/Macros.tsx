import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Zap, Plus, Pencil, Trash2, Copy, MessageSquare, Lock, Tag, Search, Keyboard, Users, User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgAgents } from "@/lib/store";
import {
  readMacros, upsertMacro, deleteMacro, duplicateMacro,
  type Macro, type AssigneeAction,
} from "@/lib/api/macros";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Priority, TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUSES: TicketStatus[] = ["new", "open", "in_progress", "on_hold", "resolved", "closed"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

function emptyDraft(): Omit<Macro, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    description: "",
    scope: "personal",
    reply: "",
    isInternal: false,
    addTags: [],
    removeTags: [],
    assignee: { kind: "unchanged" },
  };
}

export default function Macros() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const userId = (user as any).id ?? "anon";
  const orgAgents = useOrgAgents();

  const [macros, setMacros] = useState<Macro[]>(() => readMacros(userId));
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Macro | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof emptyDraft>>(emptyDraft());
  const [open, setOpen] = useState(false);

  const refresh = () => setMacros(readMacros(userId));

  const filtered = useMemo(() => {
    if (!query) return macros;
    const q = query.toLowerCase();
    return macros.filter((m) =>
      (m.name + " " + (m.description ?? "") + " " + (m.reply ?? "")).toLowerCase().includes(q),
    );
  }, [macros, query]);

  const startNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setOpen(true);
  };

  const startEdit = (m: Macro) => {
    setEditing(m);
    setDraft({
      name: m.name,
      description: m.description ?? "",
      scope: m.scope,
      reply: m.reply ?? "",
      isInternal: !!m.isInternal,
      status: m.status,
      priority: m.priority,
      assignee: m.assignee ?? { kind: "unchanged" },
      addTags: m.addTags ?? [],
      removeTags: m.removeTags ?? [],
      shortcut: m.shortcut,
    });
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Name is required");
      return;
    }
    upsertMacro(userId, { ...draft, id: editing?.id });
    toast.success(editing ? "Macro updated" : "Macro created");
    setOpen(false);
    refresh();
  };

  const remove = (m: Macro) => {
    if (!confirm(`Delete macro "${m.name}"?`)) return;
    deleteMacro(userId, m.id);
    refresh();
    toast.success("Macro deleted");
  };

  const dup = (m: Macro) => {
    duplicateMacro(userId, m.id);
    refresh();
    toast.success("Macro duplicated");
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto h-full">
      <header className="flex flex-wrap items-center gap-3">
        <Zap className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Macros & quick actions</h1>
          <p className="text-sm text-muted-foreground">
            Bundle a reply, status, priority, assignee, and tags into one click.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search macros…" className="h-9 pl-8 w-56" />
          </div>
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-1.5" /> New macro</Button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <Card key={m.id} className="hover:border-primary/40 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate flex items-center gap-2">
                    {m.name}
                    {m.shortcut && (
                      <Badge variant="secondary" className="font-mono">
                        <Keyboard className="h-3 w-3 mr-1" /> {m.shortcut}
                      </Badge>
                    )}
                  </CardTitle>
                  {m.description && <CardDescription className="line-clamp-2">{m.description}</CardDescription>}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {m.scope === "team" ? <Users className="h-3 w-3 mr-1" /> : <UserIcon className="h-3 w-3 mr-1" />}
                  {m.scope}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px]">
              {m.reply && (
                <div className={cn("rounded-md border p-2 line-clamp-3", m.isInternal ? "bg-warning/5 border-warning/30" : "bg-surface-2/40")}>
                  {m.isInternal ? <Lock className="h-3 w-3 inline mr-1 text-warning" /> : <MessageSquare className="h-3 w-3 inline mr-1 text-primary" />}
                  {m.reply}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {m.status && <Chip>Status: {m.status}</Chip>}
                {m.priority && <Chip>Priority: {m.priority}</Chip>}
                {m.assignee?.kind === "current_user" && <Chip>Assign: me</Chip>}
                {m.assignee?.kind === "unassign" && <Chip>Unassign</Chip>}
                {m.assignee?.kind === "specific" && (
                  <Chip>Assign: {m.assignee.kind === "specific" ? (orgAgents.find((a) => a.id === (m.assignee as any).agentId)?.name ?? "agent") : "agent"}</Chip>
                )}
                {(m.addTags ?? []).map((t) => <Chip key={"+" + t}><Tag className="h-2.5 w-2.5 mr-0.5" />+{t}</Chip>)}
                {(m.removeTags ?? []).map((t) => <Chip key={"-" + t}><Tag className="h-2.5 w-2.5 mr-0.5" />-{t}</Chip>)}
              </div>
              <div className="flex items-center justify-end gap-1 pt-1">
                <Button size="sm" variant="ghost" onClick={() => dup(m)}><Copy className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(m)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(m)} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-12">
            No macros match.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit macro" : "New macro"}</DialogTitle>
            <DialogDescription>
              Use <code>{"{requester}"}</code>, <code>{"{agent}"}</code>, <code>{"{ticketNumber}"}</code>, <code>{"{title}"}</code> in the reply body.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Acknowledge & start" />
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as "personal" | "team" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal (only me)</SelectItem>
                    <SelectItem value="team">Team (shared)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Short summary" />
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  {draft.isInternal ? <Lock className="h-3.5 w-3.5 text-warning" /> : <MessageSquare className="h-3.5 w-3.5 text-primary" />}
                  Reply body
                </Label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Internal note</span>
                  <Switch checked={!!draft.isInternal} onCheckedChange={(v) => setDraft({ ...draft, isInternal: v })} />
                </div>
              </div>
              <Textarea
                rows={5}
                value={draft.reply ?? ""}
                onChange={(e) => setDraft({ ...draft, reply: e.target.value })}
                placeholder="Hi {requester}, thanks for reaching out…"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={draft.status ?? "__"} onValueChange={(v) => setDraft({ ...draft, status: v === "__" ? undefined : (v as TicketStatus) })}>
                  <SelectTrigger><SelectValue placeholder="Unchanged" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">Unchanged</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={draft.priority ?? "__"} onValueChange={(v) => setDraft({ ...draft, priority: v === "__" ? undefined : (v as Priority) })}>
                  <SelectTrigger><SelectValue placeholder="Unchanged" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">Unchanged</SelectItem>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Shortcut (composer)</Label>
                <Input
                  maxLength={1}
                  value={draft.shortcut ?? ""}
                  onChange={(e) => setDraft({ ...draft, shortcut: e.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 1) || undefined })}
                  placeholder="1–9 or letter"
                />
              </div>
            </div>

            <div>
              <Label>Assignee</Label>
              <Select
                value={
                  !draft.assignee || draft.assignee.kind === "unchanged" ? "unchanged" :
                  draft.assignee.kind === "current_user" ? "current_user" :
                  draft.assignee.kind === "unassign" ? "unassign" :
                  `agent:${draft.assignee.agentId}`
                }
                onValueChange={(v) => {
                  let next: AssigneeAction;
                  if (v === "unchanged") next = { kind: "unchanged" };
                  else if (v === "current_user") next = { kind: "current_user" };
                  else if (v === "unassign") next = { kind: "unassign" };
                  else next = { kind: "specific", agentId: v.replace("agent:", "") };
                  setDraft({ ...draft, assignee: next });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Unchanged</SelectItem>
                  <SelectItem value="current_user">Assign to current user</SelectItem>
                  <SelectItem value="unassign">Unassign</SelectItem>
                  {orgAgents.map((a) => (
                    <SelectItem key={a.id} value={`agent:${a.id}`}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TagsInput
                label="Add tags"
                value={draft.addTags ?? []}
                onChange={(v) => setDraft({ ...draft, addTags: v })}
              />
              <TagsInput
                label="Remove tags"
                value={draft.removeTags ?? []}
                onChange={(v) => setDraft({ ...draft, removeTags: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save changes" : "Create macro"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted-foreground">
      {children}
    </span>
  );
}

function TagsInput({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-card p-1.5 min-h-9">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-surface-2 border border-border">
            #{t}
            <button onClick={() => onChange(value.filter((x) => x !== t))} className="text-muted-foreground hover:text-destructive">×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
            if (e.key === "Backspace" && !input && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder="add tag…"
          className="flex-1 min-w-[80px] bg-transparent outline-none text-[12px] px-1"
        />
      </div>
    </div>
  );
}
