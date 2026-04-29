import { useEffect, useMemo, useState } from "react";
import { useCurrentOrgUser, useAppStore } from "@/lib/store";
import { ArrowUpRight, TrendingUp, Pencil, Plus, RotateCcw, Check, X, GripVertical, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  dashboardApi,
  DEFAULT_LAYOUT,
  getMeta,
  SIZE_CLASS,
  type DashboardLayout,
  type WidgetId,
  type WidgetInstance,
  type WidgetSize,
} from "@/lib/api/dashboard";
import { WidgetBody } from "@/components/dashboard/Widgets";
import { WidgetLibrary } from "@/components/dashboard/WidgetLibrary";

export default function Dashboard() {
  const me = useCurrentOrgUser();
  const tickets = useAppStore((s) => s.tickets);
  const nav = useNavigate();

  const [layout, setLayout] = useState<DashboardLayout>(() => dashboardApi.load());
  const [editing, setEditing] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [overUid, setOverUid] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) dashboardApi.save(layout);
  }, [layout, editing]);

  const open = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  const overdue = tickets.filter((t) => t.slaState === "breached").length;
  const atRisk = tickets.filter((t) => t.slaState === "at_risk").length;

  const existingIds = useMemo(() => layout.widgets.map((w) => w.id), [layout]);

  function handleDrop(targetUid: string) {
    if (!dragUid || dragUid === targetUid) return;
    const widgets = [...layout.widgets];
    const from = widgets.findIndex((w) => w.uid === dragUid);
    const to = widgets.findIndex((w) => w.uid === targetUid);
    if (from < 0 || to < 0) return;
    const [moved] = widgets.splice(from, 1);
    widgets.splice(to, 0, moved);
    setLayout({ ...layout, widgets });
    setDragUid(null);
    setOverUid(null);
  }

  function addWidget(id: WidgetId) {
    const meta = getMeta(id);
    if (!meta) return;
    const inst: WidgetInstance = { uid: `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, id, size: meta.defaultSize };
    setLayout({ ...layout, widgets: [...layout.widgets, inst] });
  }
  function removeWidget(uid: string) {
    setLayout({ ...layout, widgets: layout.widgets.filter((w) => w.uid !== uid) });
  }
  function cycleSize(uid: string) {
    const order: WidgetSize[] = ["sm", "md", "lg", "xl"];
    setLayout({
      ...layout,
      widgets: layout.widgets.map((w) => {
        if (w.uid !== uid) return w;
        const meta = getMeta(w.id);
        const allowed = meta?.allowedSizes ?? order;
        const idx = allowed.indexOf(w.size);
        const next = allowed[(idx + 1) % allowed.length];
        return { ...w, size: next };
      }),
    });
  }
  function resetLayout() {
    dashboardApi.reset();
    setLayout({ ...DEFAULT_LAYOUT, widgets: DEFAULT_LAYOUT.widgets.map((w) => ({ ...w })) });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-6 lg:p-8">
          <div className="absolute inset-0 bg-gradient-mesh opacity-60 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Support overview</div>
              <h1 className="mt-1 text-3xl lg:text-4xl font-display font-bold tracking-tight">
                Good morning, <span className="gradient-text">{(me?.name ?? "there").split(" ")[0]}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg">
                Your team has {open} open tickets and {atRisk + overdue} need attention. Let's clear the queue.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {editing ? (
                <>
                  <button
                    onClick={() => setLibOpen(true)}
                    className="px-3 py-2 rounded-xl bg-surface border border-border text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add widget
                  </button>
                  <button
                    onClick={resetLayout}
                    className="px-3 py-2 rounded-xl bg-surface border border-border text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" /> Reset
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold hover:shadow-glow transition-shadow flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" /> Done
                  </button>
                </>
              ) : (
                <>
                  <button className="px-3 py-2 rounded-xl bg-surface border border-border text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-2">
                    Last 30 days <TrendingUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-2 rounded-xl bg-surface border border-border text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" /> Customize
                  </button>
                  <button
                    onClick={() => nav("/app/tickets")}
                    className="px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold hover:shadow-glow transition-shadow flex items-center gap-2"
                  >
                    Open agent workspace <ArrowUpRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {editing && (
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 text-primary" />
            Drag widgets to reorder · click <Maximize2 className="h-3 w-3 inline" /> to resize · click <X className="h-3 w-3 inline" /> to remove.
          </div>
        )}

        {/* Widget grid */}
        <div className="grid grid-cols-12 gap-4">
          {layout.widgets.map((w) => (
            <WidgetCell
              key={w.uid}
              instance={w}
              editing={editing}
              isDragging={dragUid === w.uid}
              isOver={overUid === w.uid && dragUid !== w.uid}
              onDragStart={() => setDragUid(w.uid)}
              onDragEnd={() => {
                setDragUid(null);
                setOverUid(null);
              }}
              onDragOver={() => setOverUid(w.uid)}
              onDrop={() => handleDrop(w.uid)}
              onRemove={() => removeWidget(w.uid)}
              onResize={() => cycleSize(w.uid)}
            />
          ))}
          {!layout.widgets.length && (
            <div className="col-span-12 panel p-12 text-center">
              <div className="text-sm font-medium">No widgets yet</div>
              <div className="text-xs text-muted-foreground mt-1">Add widgets from the library to build your dashboard.</div>
              <button
                onClick={() => {
                  setEditing(true);
                  setLibOpen(true);
                }}
                className="mt-4 px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Browse widgets
              </button>
            </div>
          )}
        </div>
      </div>

      <WidgetLibrary
        open={libOpen}
        onClose={() => setLibOpen(false)}
        onAdd={addWidget}
        existing={existingIds}
      />
    </div>
  );
}

function WidgetCell({
  instance,
  editing,
  isDragging,
  isOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onRemove,
  onResize,
}: {
  instance: WidgetInstance;
  editing: boolean;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onRemove: () => void;
  onResize: () => void;
}) {
  const meta = getMeta(instance.id);
  if (!meta) return null;

  return (
    <div
      className={`${SIZE_CLASS[instance.size]} transition-all ${isDragging ? "opacity-40" : ""} ${
        isOver ? "ring-2 ring-primary/60 rounded-2xl" : ""
      }`}
      draggable={editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (!editing) return;
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        if (!editing) return;
        e.preventDefault();
        onDrop();
      }}
    >
      <div
        className={`panel p-5 h-full relative group ${editing ? "cursor-grab active:cursor-grabbing border-dashed" : ""}`}
      >
        {editing && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResize();
              }}
              className="h-7 w-7 rounded-lg bg-surface border border-border hover:bg-surface-2 grid place-items-center"
              title={`Resize (${instance.size})`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="h-7 w-7 rounded-lg bg-surface border border-border hover:bg-destructive hover:text-destructive-foreground grid place-items-center"
              title="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {meta.category !== "Metric" && (
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <div className="font-display font-semibold truncate">{meta.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{meta.description}</div>
            </div>
            {editing && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-surface-2">
                {instance.size}
              </span>
            )}
          </div>
        )}

        <WidgetBody id={instance.id} />
      </div>
    </div>
  );
}
