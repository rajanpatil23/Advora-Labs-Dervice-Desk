// Frontend-only saved views. Persisted to localStorage per org.
// A "view" is a named filter preset for a resource (tickets/incidents/requests).
// Backend agent: replace with API; keep shape stable.

export type ViewResource = "tickets" | "incidents" | "requests";
export type ViewScope = "private" | "team";

export type ViewFilters = {
  q?: string;
  status?: string[];
  priority?: string[];
  assigneeId?: string | "me" | "unassigned";
  category?: string[];
  tags?: string[];
  slaRisk?: boolean;
  sortBy?: "updated" | "created" | "priority" | "sla";
  sortDir?: "asc" | "desc";
};

export type SavedView = {
  id: string;
  orgId: string;
  resource: ViewResource;
  name: string;
  emoji?: string;
  scope: ViewScope;
  ownerId: string;
  ownerName?: string;
  filters: ViewFilters;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
};

const KEY = (orgId: string) => `lov.savedviews.v1.${orgId}`;

function read(orgId: string): SavedView[] {
  try {
    const raw = localStorage.getItem(KEY(orgId));
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seed(orgId);
  localStorage.setItem(KEY(orgId), JSON.stringify(seeded));
  return seeded;
}

function write(orgId: string, views: SavedView[]) {
  localStorage.setItem(KEY(orgId), JSON.stringify(views));
}

function uid() { return `view_${Math.random().toString(36).slice(2, 10)}`; }

function seed(orgId: string): SavedView[] {
  const now = new Date().toISOString();
  const base = (over: Partial<SavedView>): SavedView => ({
    id: uid(), orgId, resource: "tickets", scope: "team", ownerId: "system", ownerName: "System",
    name: "View", filters: {}, createdAt: now, updatedAt: now, ...over,
  });
  return [
    base({ name: "🔥 Urgent open", emoji: "🔥", resource: "tickets", pinned: true,
      filters: { status: ["open", "in_progress"], priority: ["urgent", "high"], sortBy: "priority", sortDir: "desc" } }),
    base({ name: "⏰ SLA at risk", emoji: "⏰", resource: "tickets", pinned: true,
      filters: { slaRisk: true, sortBy: "sla", sortDir: "asc" } }),
    base({ name: "🙋 Assigned to me", emoji: "🙋", resource: "tickets",
      filters: { assigneeId: "me", status: ["open", "in_progress", "pending"] } }),
    base({ name: "📭 Unassigned", emoji: "📭", resource: "tickets",
      filters: { assigneeId: "unassigned", status: ["open"] } }),
    base({ name: "🚨 Active incidents", emoji: "🚨", resource: "incidents", pinned: true,
      filters: { status: ["investigating", "identified", "monitoring"] } }),
    base({ name: "📝 Pending approval", emoji: "📝", resource: "requests", pinned: true,
      filters: { status: ["pending_approval"] } }),
  ];
}

export const savedViewsApi = {
  list(orgId: string, resource?: ViewResource, currentUserId?: string): SavedView[] {
    return read(orgId).filter((v) =>
      (!resource || v.resource === resource) &&
      (v.scope === "team" || v.ownerId === currentUserId || v.ownerId === "system")
    );
  },
  get(orgId: string, id: string) { return read(orgId).find((v) => v.id === id) ?? null; },
  create(orgId: string, view: Omit<SavedView, "id" | "orgId" | "createdAt" | "updatedAt">): SavedView {
    const now = new Date().toISOString();
    const created: SavedView = { ...view, id: uid(), orgId, createdAt: now, updatedAt: now };
    const next = [...read(orgId), created];
    write(orgId, next);
    return created;
  },
  update(orgId: string, id: string, patch: Partial<SavedView>): SavedView | null {
    const all = read(orgId);
    const idx = all.findIndex((v) => v.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    write(orgId, all);
    return all[idx];
  },
  remove(orgId: string, id: string) {
    write(orgId, read(orgId).filter((v) => v.id !== id));
  },
  togglePin(orgId: string, id: string) {
    const v = this.get(orgId, id);
    if (v) this.update(orgId, id, { pinned: !v.pinned });
  },
};

export function summarizeFilters(f: ViewFilters): string {
  const parts: string[] = [];
  if (f.status?.length) parts.push(`status: ${f.status.join("/")}`);
  if (f.priority?.length) parts.push(`priority: ${f.priority.join("/")}`);
  if (f.assigneeId) parts.push(`assignee: ${f.assigneeId}`);
  if (f.category?.length) parts.push(`category: ${f.category.join("/")}`);
  if (f.tags?.length) parts.push(`tags: ${f.tags.join(",")}`);
  if (f.slaRisk) parts.push("SLA at risk");
  if (f.q) parts.push(`"${f.q}"`);
  return parts.length ? parts.join(" · ") : "No filters";
}
