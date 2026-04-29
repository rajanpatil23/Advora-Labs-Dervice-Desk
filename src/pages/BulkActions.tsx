import { useMemo, useState } from "react";
import { useAppStore, useOrgAgents, useCurrentOrgUser } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CheckSquare, Square, UserPlus, Flag, Activity, Trash2, X, Search, Layers, Filter,
} from "lucide-react";
import { PriorityChip, StatusChip } from "@/components/common/Chips";
import { timeAgo } from "@/lib/format";
import type { Priority, TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["new", "open", "in_progress", "on_hold", "resolved", "closed"];
const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

export default function BulkActions() {
  const { tickets, setStatus, setPriority, setAssignee, deleteTicket } = useAppStore();
  const me = useCurrentOrgUser();
  const agents = useOrgAgents();
  const role = me?.role;
  const canManage = role === "owner" || role === "admin" || role === "manager";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");

  const visible = useMemo(() => {
    return tickets.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (search && !`${t.subject} ${t.number ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tickets, filterStatus, filterPriority, search]);

  const allChecked = visible.length > 0 && visible.every((t) => selected.has(t.id));
  const someChecked = visible.some((t) => selected.has(t.id)) && !allChecked;

  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) { visible.forEach((t) => next.delete(t.id)); }
    else { visible.forEach((t) => next.add(t.id)); }
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const clearSel = () => setSelected(new Set());

  const ids = Array.from(selected);

  const bulkStatus = (s: TicketStatus) => {
    ids.forEach((id) => setStatus(id, s));
    toast.success(`Updated ${ids.length} ticket${ids.length === 1 ? "" : "s"} to "${s}"`);
  };
  const bulkPriority = (p: Priority) => {
    ids.forEach((id) => setPriority(id, p));
    toast.success(`Set priority to "${p}" on ${ids.length} ticket${ids.length === 1 ? "" : "s"}`);
  };
  const bulkAssign = (agentId: string | null, name: string) => {
    ids.forEach((id) => setAssignee(id, agentId));
    toast.success(`Assigned ${ids.length} ticket${ids.length === 1 ? "" : "s"} to ${name}`);
  };
  const bulkDelete = () => {
    ids.forEach((id) => deleteTicket(id));
    toast.success(`Deleted ${ids.length} ticket${ids.length === 1 ? "" : "s"}`);
    clearSel();
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk actions</CardTitle>
            <CardDescription>Only managers, admins, and owners can perform bulk operations.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 overflow-y-auto h-full">
      <header className="flex flex-wrap items-center gap-3">
        <Layers className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Bulk actions</h1>
          <p className="text-sm text-muted-foreground">Update status, priority, assignee, or delete many tickets at once.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">{visible.length} visible</Badge>
          <Badge className="bg-primary/15 text-primary border-primary/30">{selected.size} selected</Badge>
        </div>
      </header>

      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject or number" className="pl-8 h-9" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5 mr-1" /> Status: {filterStatus}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>All</DropdownMenuItem>
              <DropdownMenuSeparator />
              {STATUSES.map((s) => <DropdownMenuItem key={s} onClick={() => setFilterStatus(s)}>{s}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Flag className="h-3.5 w-3.5 mr-1" /> Priority: {filterPriority}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterPriority("all")}>All</DropdownMenuItem>
              <DropdownMenuSeparator />
              {PRIORITIES.map((p) => <DropdownMenuItem key={p} onClick={() => setFilterPriority(p)}>{p}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="sticky top-0 z-10 rounded-lg border bg-card shadow-md p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="h-4 w-px bg-border mx-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"><Activity className="h-3.5 w-3.5 mr-1" /> Set status</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Change status to…</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUSES.map((s) => <DropdownMenuItem key={s} onClick={() => bulkStatus(s)}>{s}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"><Flag className="h-3.5 w-3.5 mr-1" /> Set priority</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Set priority to…</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PRIORITIES.map((p) => <DropdownMenuItem key={p} onClick={() => bulkPriority(p)}>{p}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"><UserPlus className="h-3.5 w-3.5 mr-1" /> Assign</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Assign to…</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => bulkAssign(null, "Unassigned")}>Unassigned</DropdownMenuItem>
              <DropdownMenuSeparator />
              {agents.map((a: any) => (
                <DropdownMenuItem key={a.id} onClick={() => bulkAssign(a.id, a.name ?? a.email ?? "agent")}>
                  {a.name ?? a.email}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive"><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selected.size} ticket{selected.size === 1 ? "" : "s"}?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={clearSel}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[40px_120px_1fr_120px_120px_140px_120px] items-center gap-3 px-4 py-2 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div>
              <Checkbox
                checked={allChecked ? true : someChecked ? "indeterminate" : false}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </div>
            <div>Number</div>
            <div>Subject</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Assignee</div>
            <div>Updated</div>
          </div>
          <div className="divide-y max-h-[55vh] overflow-y-auto">
            {visible.map((t) => {
              const checked = selected.has(t.id);
              const assignee = agents.find((a: any) => a.id === t.assigneeId);
              return (
                <div key={t.id}
                  onClick={() => toggleOne(t.id)}
                  className={`grid grid-cols-[40px_120px_1fr_120px_120px_140px_120px] items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/50 ${checked ? "bg-primary/5" : ""}`}>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleOne(t.id)} />
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{t.number ?? t.id.slice(0, 6)}</div>
                  <div className="truncate font-medium">{t.subject}</div>
                  <div><StatusChip status={t.status} /></div>
                  <div><PriorityChip priority={t.priority} /></div>
                  <div className="truncate text-xs">{(assignee as any)?.name ?? (assignee as any)?.email ?? <span className="text-muted-foreground">Unassigned</span>}</div>
                  <div className="text-xs text-muted-foreground">{timeAgo(t.updatedAt)}</div>
                </div>
              );
            })}
            {visible.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">No tickets match these filters.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
