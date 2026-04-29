import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Workflow as WorkflowIcon, Plus, Play, Trash2, Settings2, GitBranch, Clock, Bolt, Square,
  ZapIcon, MousePointer2, Link2, X,
} from "lucide-react";
import {
  workflowApi, type Workflow, type WorkflowNode, type NodeKind,
  TRIGGER_EVENTS, ACTION_TYPES, SAMPLE_PAYLOAD,
} from "@/lib/api/workflows";
import { cn } from "@/lib/utils";

const NODE_W = 180;
const NODE_H = 64;

const KIND_META: Record<NodeKind, { color: string; icon: typeof Bolt; label: string }> = {
  trigger:   { color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",  icon: ZapIcon,    label: "Trigger" },
  condition: { color: "bg-amber-500/15 text-amber-600 border-amber-500/40",         icon: GitBranch,  label: "Condition" },
  action:    { color: "bg-sky-500/15 text-sky-600 border-sky-500/40",               icon: Bolt,       label: "Action" },
  delay:     { color: "bg-violet-500/15 text-violet-600 border-violet-500/40",      icon: Clock,      label: "Delay" },
  branch:    { color: "bg-rose-500/15 text-rose-600 border-rose-500/40",            icon: GitBranch,  label: "Branch" },
  end:       { color: "bg-muted text-muted-foreground border-border",               icon: Square,     label: "End" },
};

export default function Workflows() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin" || role === "manager";

  const [list, setList] = useState<Workflow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    const all = workflowApi.list();
    setList(all);
    if (!activeId && all[0]) setActiveId(all[0].id);
  };
  useEffect(() => { refresh(); }, []);

  const active = useMemo(() => list.find((w) => w.id === activeId) ?? null, [list, activeId]);
  const selected = useMemo(
    () => active?.nodes.find((n) => n.id === selectedNode) ?? null,
    [active, selectedNode],
  );

  if (!allowed) return <Navigate to="/app" replace />;

  const handleCreate = () => {
    const wf = workflowApi.create("Untitled workflow");
    setActiveId(wf.id);
    refresh();
    toast.success("Workflow created");
  };

  const handleDelete = (id: string) => {
    workflowApi.remove(id);
    if (activeId === id) setActiveId(null);
    refresh();
    toast.success("Workflow deleted");
  };

  const handleAddNode = (kind: NodeKind) => {
    if (!active) return;
    const x = 200 + Math.random() * 200;
    const y = 100 + Math.random() * 200;
    workflowApi.addNode(active.id, kind, x, y);
    refresh();
  };

  const handleNodeDrag = (nodeId: string, dx: number, dy: number) => {
    if (!active) return;
    const node = active.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    workflowApi.updateNode(active.id, nodeId, {
      x: Math.max(0, node.x + dx),
      y: Math.max(0, node.y + dy),
    });
    refresh();
  };

  const handleConnectClick = (nodeId: string) => {
    if (!active) return;
    if (!connectFrom) {
      setConnectFrom(nodeId);
      toast.info("Now click a target node to connect");
      return;
    }
    if (connectFrom === nodeId) {
      setConnectFrom(null);
      return;
    }
    workflowApi.connect(active.id, connectFrom, nodeId);
    setConnectFrom(null);
    refresh();
    toast.success("Connected");
  };

  const handleSimulate = () => {
    if (!active) return;
    const run = workflowApi.simulate(active.id, SAMPLE_PAYLOAD);
    refresh();
    toast.success(`Simulation complete · ${run.trace.length} nodes traversed`);
  };

  const handleToggle = (enabled: boolean) => {
    if (!active) return;
    workflowApi.update(active.id, { enabled });
    refresh();
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <WorkflowIcon className="h-6 w-6 text-primary" />
            Workflow builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design automation flows visually with triggers, conditions, and actions.
          </p>
        </div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> New workflow</Button>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Workflow list */}
        <Card className="col-span-12 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Your workflows</CardTitle>
            <CardDescription className="text-xs">{list.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {list.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No workflows yet</p>
            )}
            {list.map((wf) => (
              <button
                key={wf.id}
                onClick={() => { setActiveId(wf.id); setSelectedNode(null); setConnectFrom(null); }}
                className={cn(
                  "w-full text-left rounded-lg border p-2.5 transition-colors",
                  activeId === wf.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{wf.name}</div>
                  {wf.enabled
                    ? <Badge variant="default" className="h-5 text-[10px]">Live</Badge>
                    : <Badge variant="outline" className="h-5 text-[10px]">Draft</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {wf.nodes.length} nodes · {wf.edges.length} edges
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="col-span-12 lg:col-span-6 overflow-hidden">
          <CardHeader className="pb-3 flex-row items-center justify-between gap-2 space-y-0">
            <div className="min-w-0 flex-1">
              {active ? (
                <Input
                  value={active.name}
                  onChange={(e) => { workflowApi.update(active.id, { name: e.target.value }); refresh(); }}
                  className="h-8 font-semibold border-0 px-0 focus-visible:ring-0 shadow-none bg-transparent"
                />
              ) : (
                <CardTitle className="text-sm">No workflow selected</CardTitle>
              )}
            </div>
            {active && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Switch checked={active.enabled} onCheckedChange={handleToggle} />
                  <span className="text-xs text-muted-foreground">Enabled</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleSimulate}>
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Simulate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(active.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {active ? (
              <>
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 border-b">
                  {(["trigger","condition","action","delay","end"] as NodeKind[]).map((k) => {
                    const meta = KIND_META[k];
                    const Icon = meta.icon;
                    return (
                      <Button key={k} size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddNode(k)}>
                        <Icon className="h-3 w-3 mr-1" /> {meta.label}
                      </Button>
                    );
                  })}
                  {connectFrom && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setConnectFrom(null)}>
                      <X className="h-3 w-3 mr-1" /> Cancel connect
                    </Button>
                  )}
                </div>
                <div
                  ref={canvasRef}
                  className="relative w-full h-[560px] bg-[radial-gradient(circle_at_center,hsl(var(--muted))_1px,transparent_1px)] bg-[size:20px_20px] overflow-auto"
                  onClick={() => setSelectedNode(null)}
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1200, minHeight: 600 }}>
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground/60" />
                      </marker>
                    </defs>
                    {active.edges.map((edge) => {
                      const a = active.nodes.find((n) => n.id === edge.from);
                      const b = active.nodes.find((n) => n.id === edge.to);
                      if (!a || !b) return null;
                      const x1 = a.x + NODE_W; const y1 = a.y + NODE_H / 2;
                      const x2 = b.x; const y2 = b.y + NODE_H / 2;
                      const mx = (x1 + x2) / 2;
                      return (
                        <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); workflowApi.disconnect(active.id, edge.id); refresh(); }}>
                          <path
                            d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                            className="stroke-muted-foreground/50 hover:stroke-destructive"
                            strokeWidth={1.5}
                            fill="none"
                            markerEnd="url(#arrow)"
                          />
                          {edge.label && (
                            <text x={mx} y={(y1 + y2) / 2 - 6} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
                              {edge.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {active.nodes.map((node) => (
                    <CanvasNode
                      key={node.id}
                      node={node}
                      selected={selectedNode === node.id}
                      connecting={connectFrom === node.id}
                      onSelect={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
                      onDrag={(dx, dy) => handleNodeDrag(node.id, dx, dy)}
                      onConnect={(e) => { e.stopPropagation(); handleConnectClick(node.id); }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[600px] flex items-center justify-center text-sm text-muted-foreground">
                Create or select a workflow to begin
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspector */}
        <Card className="col-span-12 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Inspector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!active ? (
              <p className="text-xs text-muted-foreground">Select a workflow</p>
            ) : selected ? (
              <NodeInspector
                key={selected.id}
                node={selected}
                onChange={(patch) => { workflowApi.updateNode(active.id, selected.id, patch); refresh(); }}
                onDelete={() => { workflowApi.removeNode(active.id, selected.id); setSelectedNode(null); refresh(); }}
              />
            ) : (
              <Tabs defaultValue="overview">
                <TabsList className="grid grid-cols-2 h-8">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="runs" className="text-xs">Runs</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-3 mt-3">
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={active.description}
                      onChange={(e) => { workflowApi.update(active.id, { description: e.target.value }); refresh(); }}
                      className="mt-1 text-xs"
                      rows={3}
                      placeholder="What does this workflow do?"
                    />
                  </div>
                  <div className="text-xs space-y-1.5 pt-2 border-t">
                    <div className="flex justify-between"><span className="text-muted-foreground">Nodes</span><span className="font-mono">{active.nodes.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Edges</span><span className="font-mono">{active.edges.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Runs</span><span className="font-mono">{active.runs.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span>{new Date(active.updatedAt).toLocaleDateString()}</span></div>
                  </div>
                  <Separator />
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                    <MousePointer2 className="h-3 w-3 mt-0.5 shrink-0" />
                    Click a node to edit. Click <Link2 className="h-3 w-3 inline" /> on a node, then a target, to connect them. Click an edge to remove it.
                  </p>
                </TabsContent>
                <TabsContent value="runs" className="mt-3">
                  <ScrollArea className="h-[420px] pr-2">
                    {active.runs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No simulation runs yet</p>
                    ) : (
                      <div className="space-y-2">
                        {active.runs.map((run) => (
                          <div key={run.id} className="rounded-lg border p-2.5">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-medium">{new Date(run.startedAt).toLocaleTimeString()}</span>
                              <Badge variant={run.status === "ok" ? "default" : "destructive"} className="h-4 text-[10px]">{run.status}</Badge>
                            </div>
                            <div className="space-y-0.5">
                              {run.trace.map((t, i) => (
                                <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  <span className="w-4 text-center font-mono text-[10px]">{i + 1}</span>
                                  <span className="font-medium text-foreground truncate">{t.label}</span>
                                  <span className="ml-auto font-mono text-[10px]">{t.outcome}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CanvasNode({
  node, selected, connecting, onSelect, onDrag, onConnect,
}: {
  node: WorkflowNode;
  selected: boolean;
  connecting: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDrag: (dx: number, dy: number) => void;
  onConnect: (e: React.MouseEvent) => void;
}) {
  const meta = KIND_META[node.kind];
  const Icon = meta.icon;
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    onSelect(e);
    dragRef.current = { x: e.clientX, y: e.clientY };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.x;
      const dy = ev.clientY - dragRef.current.y;
      dragRef.current = { x: ev.clientX, y: ev.clientY };
      onDrag(dx, dy);
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
      className={cn(
        "absolute rounded-xl border-2 bg-card shadow-sm cursor-grab active:cursor-grabbing transition-all select-none",
        meta.color,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        connecting && "ring-2 ring-amber-500 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="px-3 py-2 h-full flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider opacity-70">{meta.label}</div>
          <div className="text-xs font-semibold truncate text-foreground">{node.label}</div>
        </div>
        <button
          data-no-drag
          onClick={onConnect}
          title="Connect to another node"
          className="h-6 w-6 rounded-md border border-current/30 flex items-center justify-center hover:bg-background/50"
        >
          <Link2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function NodeInspector({
  node, onChange, onDelete,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNode>) => void;
  onDelete: () => void;
}) {
  const updateConfig = (k: string, v: any) => onChange({ config: { ...node.config, [k]: v } });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">{KIND_META[node.kind].label}</Badge>
        <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div>
        <Label className="text-xs">Label</Label>
        <Input value={node.label} onChange={(e) => onChange({ label: e.target.value })} className="mt-1 h-8 text-sm" />
      </div>

      {node.kind === "trigger" && (
        <div>
          <Label className="text-xs">Event</Label>
          <Select value={node.config.event} onValueChange={(v) => updateConfig("event", v)}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIGGER_EVENTS.map((e) => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {node.kind === "condition" && (
        <>
          <div>
            <Label className="text-xs">Field path</Label>
            <Input value={node.config.field ?? ""} onChange={(e) => updateConfig("field", e.target.value)} className="mt-1 h-8 text-xs font-mono" placeholder="ticket.priority" />
          </div>
          <div>
            <Label className="text-xs">Operator</Label>
            <Select value={node.config.op} onValueChange={(v) => updateConfig("op", v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eq" className="text-xs">equals</SelectItem>
                <SelectItem value="neq" className="text-xs">not equals</SelectItem>
                <SelectItem value="contains" className="text-xs">contains</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input value={node.config.value ?? ""} onChange={(e) => updateConfig("value", e.target.value)} className="mt-1 h-8 text-xs" />
          </div>
          <p className="text-[10px] text-muted-foreground">Connect outputs labeled <code className="font-mono">yes</code> / <code className="font-mono">no</code> to branch.</p>
        </>
      )}

      {node.kind === "action" && (
        <>
          <div>
            <Label className="text-xs">Action type</Label>
            <Select value={node.config.type} onValueChange={(v) => updateConfig("type", v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((a) => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Field / target</Label>
            <Input value={node.config.field ?? node.config.target ?? ""} onChange={(e) => updateConfig(node.config.type === "notify" || node.config.type === "assign" ? "target" : "field", e.target.value)} className="mt-1 h-8 text-xs font-mono" />
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input value={node.config.value ?? ""} onChange={(e) => updateConfig("value", e.target.value)} className="mt-1 h-8 text-xs" />
          </div>
        </>
      )}

      {node.kind === "delay" && (
        <div>
          <Label className="text-xs">Wait minutes</Label>
          <Input type="number" min={1} value={node.config.minutes ?? 5} onChange={(e) => updateConfig("minutes", Number(e.target.value))} className="mt-1 h-8 text-xs" />
        </div>
      )}
    </div>
  );
}
