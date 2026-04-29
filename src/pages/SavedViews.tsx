import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bookmark, Pin, PinOff, Trash2, Plus, Users, Lock, ExternalLink, Filter, Edit3 } from "lucide-react";
import {
  savedViewsApi, summarizeFilters,
  type SavedView, type ViewResource, type ViewScope, type ViewFilters,
} from "@/lib/api/savedViews";

const RESOURCES: { key: ViewResource; label: string; route: string }[] = [
  { key: "tickets", label: "Tickets", route: "/app/tickets" },
  { key: "incidents", label: "Incidents", route: "/app/incidents" },
  { key: "requests", label: "Requests", route: "/app/requests" },
];

const STATUS_OPTIONS: Record<ViewResource, string[]> = {
  tickets: ["open", "in_progress", "pending", "resolved", "closed"],
  incidents: ["investigating", "identified", "monitoring", "resolved"],
  requests: ["draft", "pending_approval", "approved", "fulfilled", "rejected"],
};
const PRIORITY_OPTIONS = ["urgent", "high", "medium", "low"];

function ViewEditor({
  initial, onSave, trigger,
}: { initial?: Partial<SavedView>; onSave: (v: Omit<SavedView, "id" | "orgId" | "createdAt" | "updatedAt">) => void; trigger: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "📌");
  const [resource, setResource] = useState<ViewResource>(initial?.resource ?? "tickets");
  const [scope, setScope] = useState<ViewScope>(initial?.scope ?? "private");
  const [filters, setFilters] = useState<ViewFilters>(initial?.filters ?? {});

  const toggle = (key: "status" | "priority", value: string) => {
    const cur = filters[key] ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    setFilters({ ...filters, [key]: next });
  };

  const submit = () => {
    if (!name.trim()) return toast.error("Give the view a name");
    onSave({
      name: name.trim(), emoji, resource, scope,
      ownerId: initial?.ownerId ?? "current_user", ownerName: initial?.ownerName ?? "You",
      filters, pinned: initial?.pinned ?? false,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit view" : "New saved view"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[64px_1fr] gap-3">
            <div>
              <Label className="text-xs">Emoji</Label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} className="text-center" />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My open tickets" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Resource</Label>
              <Select value={resource} onValueChange={(v) => { setResource(v as ViewResource); setFilters({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCES.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Visibility</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as ViewScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (only me)</SelectItem>
                  <SelectItem value="team">Shared with team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Status</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {STATUS_OPTIONS[resource].map((s) => {
                  const on = filters.status?.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggle("status", s)}
                      className={`px-2.5 py-1 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            {resource === "tickets" && (
              <>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PRIORITY_OPTIONS.map((p) => {
                      const on = filters.priority?.includes(p);
                      return (
                        <button key={p} type="button" onClick={() => toggle("priority", p)}
                          className={`px-2.5 py-1 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Assignee</Label>
                  <Select value={filters.assigneeId ?? "any"}
                    onValueChange={(v) => setFilters({ ...filters, assigneeId: v === "any" ? undefined : (v as ViewFilters["assigneeId"]) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Anyone</SelectItem>
                      <SelectItem value="me">Me</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label className="text-xs">Only SLA at risk</Label>
                  <Switch checked={!!filters.slaRisk} onCheckedChange={(v) => setFilters({ ...filters, slaRisk: v })} />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs">Search keyword</Label>
              <Input value={filters.q ?? ""} onChange={(e) => setFilters({ ...filters, q: e.target.value || undefined })}
                placeholder="e.g. login" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>{initial?.id ? "Save changes" : "Create view"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SavedViews() {
  const { user, currentOrgId } = useAuth();
  const nav = useNavigate();
  if (!user || !currentOrgId) return <Navigate to="/login" replace />;
  const userId = (user as any).id ?? "current_user";

  const [tab, setTab] = useState<ViewResource>("tickets");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const all = useMemo(
    () => savedViewsApi.list(currentOrgId, undefined, userId),
    [currentOrgId, userId, tick],
  );
  const filtered = useMemo(() => all.filter((v) => v.resource === tab), [all, tab]);
  const pinned = filtered.filter((v) => v.pinned);
  const others = filtered.filter((v) => !v.pinned);

  const openView = (v: SavedView) => {
    const route = RESOURCES.find((r) => r.key === v.resource)?.route;
    if (!route) return;
    const sp = new URLSearchParams();
    sp.set("view", v.id);
    if (v.filters.q) sp.set("q", v.filters.q);
    nav(`${route}?${sp.toString()}`);
  };

  const create = (data: Omit<SavedView, "id" | "orgId" | "createdAt" | "updatedAt">) => {
    savedViewsApi.create(currentOrgId, { ...data, ownerId: userId, ownerName: (user as any).full_name ?? "You" });
    toast.success("View created");
    refresh();
  };
  const updateView = (id: string, patch: Partial<SavedView>) => {
    savedViewsApi.update(currentOrgId, id, patch);
    refresh();
  };
  const remove = (id: string) => {
    savedViewsApi.remove(currentOrgId, id);
    toast.success("View deleted");
    refresh();
  };

  const Card_ = ({ v }: { v: SavedView }) => {
    const isOwner = v.ownerId === userId;
    return (
      <Card className="group hover:shadow-md transition-all">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="text-2xl leading-none">{v.emoji ?? "📌"}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button onClick={() => openView(v)} className="font-medium truncate hover:underline text-left">
                  {v.name}
                </button>
                {v.pinned && <Pin className="h-3 w-3 text-primary" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-[10px] py-0 h-4">
                  {v.scope === "team" ? <><Users className="h-2.5 w-2.5 mr-1" /> Team</> : <><Lock className="h-2.5 w-2.5 mr-1" /> Private</>}
                </Badge>
                <span className="text-[10px] text-muted-foreground truncate">by {v.ownerName ?? v.ownerId}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{summarizeFilters(v.filters)}</p>
          <div className="flex items-center gap-1 pt-1 border-t">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openView(v)}>
              <ExternalLink className="h-3 w-3 mr-1" /> Open
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateView(v.id, { pinned: !v.pinned })}>
              {v.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            </Button>
            {isOwner && (
              <>
                <ViewEditor
                  initial={v}
                  onSave={(data) => updateView(v.id, data)}
                  trigger={<Button size="sm" variant="ghost" className="h-7 text-xs"><Edit3 className="h-3 w-3" /></Button>}
                />
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive ml-auto" onClick={() => remove(v.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto h-full">
      <header className="flex flex-wrap items-center gap-3">
        <Bookmark className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Saved views</h1>
          <p className="text-sm text-muted-foreground">Reusable filter presets for tickets, incidents and requests.</p>
        </div>
        <div className="ml-auto">
          <ViewEditor onSave={create}
            trigger={<Button><Plus className="h-4 w-4 mr-1" /> New view</Button>} />
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ViewResource)}>
        <TabsList>
          {RESOURCES.map((r) => {
            const count = all.filter((v) => v.resource === r.key).length;
            return (
              <TabsTrigger key={r.key} value={r.key}>
                {r.label} <Badge variant="secondary" className="ml-2 h-4 text-[10px]">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {RESOURCES.map((r) => (
          <TabsContent key={r.key} value={r.key} className="space-y-6 mt-4">
            {pinned.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Pin className="h-3 w-3" /> Pinned
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {pinned.map((v) => <Card_ key={v.id} v={v} />)}
                </div>
              </section>
            )}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Filter className="h-3 w-3" /> All views
              </div>
              {others.length === 0 && pinned.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">No saved views yet</CardTitle>
                    <CardDescription>Create your first preset to quickly switch between filters.</CardDescription>
                  </CardHeader>
                </Card>
              ) : others.length === 0 ? (
                <p className="text-sm text-muted-foreground">All views for {r.label.toLowerCase()} are pinned.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {others.map((v) => <Card_ key={v.id} v={v} />)}
                </div>
              )}
            </section>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
