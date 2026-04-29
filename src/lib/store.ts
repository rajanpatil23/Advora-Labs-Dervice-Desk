import { create } from "zustand";
import { useEffect, useMemo } from "react";
import {
  tickets as seedTickets,
  incidents as seedIncidents,
  serviceRequests as seedRequests,
  agents as allAgents,
  customers as allCustomers,
  articles as seedArticles,
  slaPolicies as seedSla,
  logs as seedLogs,
  catalog as seedCatalog,
} from "./mockData";
import type {
  Ticket, Incident, ServiceRequest, Priority, TicketStatus, Message, ActivityEvent,
  KbArticle, SlaPolicy, LogEntry, ServiceRequestItem, Agent, User, Role,
} from "./types";
import { useAuth } from "@/contexts/AuthContext";

// ---------- inputs ----------
export interface NewTicketInput {
  title: string;
  description?: string;
  requesterId: string;
  assigneeId?: string;
  priority: Priority;
  category: string;
  channel?: Ticket["channel"];
}

export interface NewIncidentInput {
  title: string;
  service: string;
  severity: 1 | 2 | 3 | 4;
  ownerId: string;
  affected?: number;
}

export interface NewArticleInput {
  title: string;
  category: string;
  excerpt: string;
  body: string;
  author: string;
}

export interface NewSlaInput {
  name: string;
  priority: Priority;
  responseMins: number;
  resolutionMins: number;
}

export interface OrgSettings {
  categories: string[];
  notifications: Record<string, boolean>;
  companyName: string;
  supportEmail: string;
  timezone: string;
  require2fa: boolean;
  ssoEnabled: boolean;
  sessionTimeout: boolean;
}

// ---------- helpers ----------
const orgPrefix = (orgId: string) =>
  orgId === "org_acme" ? "AC" : orgId === "org_globex" ? "GX" : orgId === "org_initech" ? "IH" : "TK";

const filterByOrg = <T extends { org_id: string }>(arr: T[], orgId: string | null) =>
  orgId ? arr.filter((x) => x.org_id === orgId) : [];

const defaultSettings = (categories: string[]): OrgSettings => ({
  categories,
  notifications: {
    "New ticket assigned": true,
    "SLA at risk": true,
    "SLA breached": true,
    "Mention in note": true,
    "Daily summary": false,
  },
  companyName: "Advora",
  supportEmail: "support@connecttly.io",
  timezone: "Europe/Stockholm",
  require2fa: true,
  ssoEnabled: true,
  sessionTimeout: false,
});

// ---------- state ----------
interface AppState {
  // raw, cross-org
  _allTickets: Ticket[];
  _allIncidents: Incident[];
  _allRequests: ServiceRequest[];
  _allArticles: KbArticle[];
  _allSla: SlaPolicy[];
  _allLogs: LogEntry[];
  _allCatalog: ServiceRequestItem[];
  _allAgents: Agent[];
  _allCustomers: User[];
  _settingsByOrg: Record<string, OrgSettings>;

  // org-scoped public slices
  tickets: Ticket[];
  incidents: Incident[];
  requests: ServiceRequest[];
  articles: KbArticle[];
  slaPolicies: SlaPolicy[];
  logs: LogEntry[];
  catalog: ServiceRequestItem[];
  orgAgents: Agent[];
  orgCustomers: User[];
  settings: OrgSettings;

  selectedTicketId: string | null;
  theme: "dark" | "light";
  currentOrgId: string | null;
  currentUserId: string | null;
  currentUserName: string | null;

  // setters
  setCurrentOrg: (orgId: string | null) => void;
  setCurrentUser: (id: string | null, name: string | null) => void;
  setSelectedTicket: (id: string | null) => void;
  toggleTheme: () => void;

  // ticket mutations
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  addMessage: (id: string, body: string, isInternal: boolean) => void;
  addActivity: (id: string, ev: Omit<ActivityEvent, "id" | "at">) => void;
  setStatus: (id: string, status: TicketStatus) => void;
  setPriority: (id: string, priority: Priority) => void;
  setAssignee: (id: string, agentId: string | undefined) => void;
  addTicket: (input: NewTicketInput) => Ticket;
  deleteTicket: (id: string) => void;
  toggleWatcher: (id: string, userId: string) => void;

  // incident
  addIncident: (input: NewIncidentInput) => Incident;
  setIncidentStatus: (id: string, status: Incident["status"]) => void;

  // KB
  addArticle: (input: NewArticleInput) => KbArticle;
  updateArticle: (id: string, patch: Partial<KbArticle>) => void;
  deleteArticle: (id: string) => void;
  voteArticle: (id: string, helpful: boolean) => void;

  // SLA
  addSlaPolicy: (input: NewSlaInput) => SlaPolicy;
  updateSlaPolicy: (id: string, patch: Partial<SlaPolicy>) => void;
  toggleSlaActive: (id: string) => void;
  deleteSlaPolicy: (id: string) => void;

  // Service requests
  addServiceRequest: (itemId: string) => ServiceRequest;
  advanceServiceRequest: (id: string) => void;
  approveServiceRequest: (id: string) => void;
  rejectServiceRequest: (id: string, reason?: string) => void;

  // Settings
  setCategories: (cats: string[]) => void;
  addCategory: (c: string) => void;
  removeCategory: (c: string) => void;
  setNotificationPref: (k: string, v: boolean) => void;
  updateOrgSettings: (patch: Partial<OrgSettings>) => void;

  // Logs
  addLog: (entry: Omit<LogEntry, "id" | "at" | "org_id">) => void;
}

// Default categories per org (mirror mockData.categoriesByOrg)
const defaultCategoriesByOrg: Record<string, string[]> = {
  org_acme: ["Network", "Software", "Access", "Security", "Cloud", "Mobile"],
  org_globex: ["Network", "Hardware", "OT/SCADA", "Access", "Facilities", "Mobile"],
  org_initech: ["Clinical Apps", "Network", "Hardware", "Access", "Compliance", "Mobile"],
};
const initialSettings: Record<string, OrgSettings> = Object.fromEntries(
  Object.entries(defaultCategoriesByOrg).map(([k, v]) => [k, defaultSettings(v)])
);

export const useAppStore = create<AppState>((set, get) => {
  const reslice = (patch: Partial<AppState> = {}) => {
    const next = { ...get(), ...patch };
    const orgId = next.currentOrgId;
    const settings = orgId
      ? next._settingsByOrg[orgId] ?? defaultSettings(defaultCategoriesByOrg[orgId] ?? [])
      : defaultSettings([]);
    return {
      ...patch,
      tickets: filterByOrg(next._allTickets, orgId),
      incidents: filterByOrg(next._allIncidents, orgId),
      requests: filterByOrg(next._allRequests, orgId),
      articles: filterByOrg(next._allArticles, orgId),
      slaPolicies: filterByOrg(next._allSla, orgId),
      logs: filterByOrg(next._allLogs, orgId),
      catalog: filterByOrg(next._allCatalog, orgId),
      orgAgents: filterByOrg(next._allAgents, orgId),
      orgCustomers: filterByOrg(next._allCustomers, orgId),
      settings,
    };
  };

  const meName = () => get().currentUserName ?? "System";
  const meOrg = () => get().currentOrgId ?? "org_acme";

  const pushLog = (entry: Omit<LogEntry, "id" | "at" | "org_id">) => {
    const log: LogEntry = {
      ...entry,
      id: `lg_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      at: new Date().toISOString(),
      org_id: meOrg(),
    };
    set(reslice({ _allLogs: [log, ...get()._allLogs] }));
  };

  return {
    _allTickets: seedTickets,
    _allIncidents: seedIncidents,
    _allRequests: seedRequests,
    _allArticles: seedArticles,
    _allSla: seedSla,
    _allLogs: seedLogs,
    _allCatalog: seedCatalog,
    _allAgents: allAgents,
    _allCustomers: allCustomers,
    _settingsByOrg: initialSettings,

    tickets: [], incidents: [], requests: [], articles: [], slaPolicies: [],
    logs: [], catalog: [], orgAgents: [], orgCustomers: [],
    settings: defaultSettings([]),

    selectedTicketId: null,
    theme: "light",
    currentOrgId: null,
    currentUserId: null,
    currentUserName: null,

    setCurrentOrg: (orgId) => {
      if (get().currentOrgId === orgId) return;
      // Ensure settings exist for new/custom orgs
      if (orgId && !get()._settingsByOrg[orgId]) {
        set({ _settingsByOrg: { ...get()._settingsByOrg, [orgId]: defaultSettings(["General", "Access", "Hardware", "Software"]) } });
      }
      set(reslice({ currentOrgId: orgId, selectedTicketId: null }));
    },
    setCurrentUser: (id, name) => set({ currentUserId: id, currentUserName: name }),
    setSelectedTicket: (id) => set({ selectedTicketId: id }),

    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      set({ theme: next });
    },

    // ----- Tickets -----
    updateTicket: (id, patch) =>
      set(reslice({
        _allTickets: get()._allTickets.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
        ),
      })),

    addMessage: (id, body, isInternal) => {
      const t = get()._allTickets.find((x) => x.id === id);
      if (!t) return;
      const msg: Message = {
        id: `m${Math.floor(Math.random() * 1e9)}`,
        authorId: get().currentUserId ?? "system",
        authorName: meName(),
        authorRole: "agent",
        body, isInternal, createdAt: new Date().toISOString(),
      };
      set(reslice({
        _allTickets: get()._allTickets.map((x) =>
          x.id === id
            ? {
                ...x,
                messages: [...x.messages, msg],
                updatedAt: new Date().toISOString(),
                firstResponseAt: x.firstResponseAt ?? (isInternal ? undefined : new Date().toISOString()),
                activity: [
                  ...x.activity,
                  { id: `e${Date.now()}`, type: "comment", text: isInternal ? "Added internal note" : "Replied to requester", by: meName(), at: new Date().toISOString() },
                ],
              }
            : x,
        ),
      }));
      pushLog({ actor: meName(), action: isInternal ? "added note" : "replied to", target: t.number, type: "ticket" });
    },

    addActivity: (id, ev) =>
      set(reslice({
        _allTickets: get()._allTickets.map((t) =>
          t.id === id ? { ...t, activity: [...t.activity, { ...ev, id: `e${Date.now()}`, at: new Date().toISOString() }] } : t,
        ),
      })),

    setStatus: (id, status) => {
      const t = get()._allTickets.find((x) => x.id === id);
      if (!t) return;
      const patch: Partial<Ticket> = { status };
      if ((status === "resolved" || status === "closed") && !t.resolvedAt) patch.resolvedAt = new Date().toISOString();
      get().updateTicket(id, patch);
      get().addActivity(id, { type: "status", text: `Status changed to ${status.replace("_", " ")}`, by: meName() });
      pushLog({ actor: meName(), action: `set status to ${status}`, target: t.number, type: "ticket" });
    },

    setPriority: (id, priority) => {
      const t = get()._allTickets.find((x) => x.id === id);
      if (!t) return;
      get().updateTicket(id, { priority });
      get().addActivity(id, { type: "priority", text: `Priority changed to ${priority}`, by: meName() });
      pushLog({ actor: meName(), action: `set priority to ${priority}`, target: t.number, type: "ticket" });
    },

    setAssignee: (id, agentId) => {
      const t = get()._allTickets.find((x) => x.id === id);
      if (!t) return;
      get().updateTicket(id, { assigneeId: agentId });
      const a = get()._allAgents.find((x) => x.id === agentId);
      get().addActivity(id, { type: "assigned", text: a ? `Assigned to ${a.name}` : "Unassigned", by: meName() });
      pushLog({ actor: meName(), action: a ? `assigned to ${a.name}` : "unassigned", target: t.number, type: "ticket" });
    },

    addTicket: (input) => {
      const orgId = meOrg();
      const orgTickets = get()._allTickets.filter((t) => t.org_id === orgId);
      const nextNum = 1000 + orgTickets.length + 1;
      const nowIso = new Date().toISOString();
      const dueOffset = input.priority === "critical" ? 4 : input.priority === "high" ? 12 : input.priority === "medium" ? 24 : 72;
      const ticket: Ticket = {
        id: `t${Math.floor(Math.random() * 1e9)}`,
        org_id: orgId,
        number: `${orgPrefix(orgId)}-${nextNum}`,
        title: input.title,
        description: input.description ?? "",
        requesterId: input.requesterId,
        assigneeId: input.assigneeId,
        priority: input.priority,
        status: "new",
        category: input.category,
        subcategory: "Request",
        tags: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        dueAt: new Date(Date.now() + dueOffset * 3600000).toISOString(),
        responseDueAt: new Date(Date.now() + (dueOffset / 4) * 3600000).toISOString(),
        slaState: "on_track",
        channel: input.channel ?? "portal",
        messages: [],
        activity: [{ id: `e${Date.now()}`, type: "created", text: "Ticket created", by: meName(), at: nowIso }],
        attachments: [],
      };
      set(reslice({ _allTickets: [ticket, ...get()._allTickets], selectedTicketId: ticket.id }));
      pushLog({ actor: meName(), action: "created", target: ticket.number, type: "ticket" });
      return ticket;
    },

    deleteTicket: (id) => {
      const t = get()._allTickets.find((x) => x.id === id);
      set(reslice({
        _allTickets: get()._allTickets.filter((x) => x.id !== id),
        selectedTicketId: get().selectedTicketId === id ? null : get().selectedTicketId,
      }));
      if (t) pushLog({ actor: meName(), action: "deleted", target: t.number, type: "ticket" });
    },

    toggleWatcher: (id, userId) => {
      const t = get()._allTickets.find((x) => x.id === id);
      if (!t) return;
      const watchers = t.watcherIds ?? [];
      const isWatching = watchers.includes(userId);
      const next = isWatching ? watchers.filter((w) => w !== userId) : [...watchers, userId];
      get().updateTicket(id, { watcherIds: next });
      const u = get()._allAgents.find((a) => a.id === userId) ?? get()._allCustomers.find((c) => c.id === userId);
      const name = u?.name ?? "User";
      get().addActivity(id, {
        type: "tag",
        text: isWatching ? `${name} stopped watching` : `${name} is now watching`,
        by: meName(),
      });
    },

    // ----- Incidents -----
    addIncident: (input) => {
      const orgId = meOrg();
      const orgIncidents = get()._allIncidents.filter((i) => i.org_id === orgId);
      const nextNum = 200 + orgIncidents.length + 1;
      const nowIso = new Date().toISOString();
      const incident: Incident = {
        id: `i${Math.floor(Math.random() * 1e9)}`,
        org_id: orgId,
        number: `INC-${nextNum}`,
        title: input.title,
        service: input.service,
        impact: "medium",
        urgency: "medium",
        severity: input.severity,
        status: "investigating",
        escalation: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
        ownerId: input.ownerId,
        affected: input.affected ?? 0,
        timeline: [{ id: `e${Date.now()}`, type: "created", text: "Incident opened", by: meName(), at: nowIso }],
      };
      set(reslice({ _allIncidents: [incident, ...get()._allIncidents] }));
      pushLog({ actor: meName(), action: "opened", target: incident.number, type: "incident" });
      return incident;
    },

    setIncidentStatus: (id, status) => {
      const inc = get()._allIncidents.find((x) => x.id === id);
      if (!inc) return;
      set(reslice({
        _allIncidents: get()._allIncidents.map((i) =>
          i.id === id
            ? {
                ...i,
                status,
                updatedAt: new Date().toISOString(),
                timeline: [...i.timeline, { id: `e${Date.now()}`, type: "status", text: `Status → ${status}`, by: meName(), at: new Date().toISOString() }],
              }
            : i,
        ),
      }));
      pushLog({ actor: meName(), action: `set status to ${status}`, target: inc.number, type: "incident" });
    },

    // ----- KB -----
    addArticle: (input) => {
      const orgId = meOrg();
      const article: KbArticle = {
        id: `kb_${Date.now()}`,
        org_id: orgId,
        title: input.title,
        category: input.category,
        excerpt: input.excerpt,
        body: input.body,
        views: 0,
        helpful: 100,
        updatedAt: new Date().toISOString(),
        author: input.author,
      };
      set(reslice({ _allArticles: [article, ...get()._allArticles] }));
      pushLog({ actor: meName(), action: "published article", target: input.title, type: "system" });
      return article;
    },
    updateArticle: (id, patch) =>
      set(reslice({
        _allArticles: get()._allArticles.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a)),
      })),
    deleteArticle: (id) =>
      set(reslice({ _allArticles: get()._allArticles.filter((a) => a.id !== id) })),
    voteArticle: (id, helpful) =>
      set(reslice({
        _allArticles: get()._allArticles.map((a) => {
          if (a.id !== id) return a;
          const views = a.views + 1;
          const score = Math.round((a.helpful * a.views + (helpful ? 100 : 0)) / views);
          return { ...a, views, helpful: score };
        }),
      })),

    // ----- SLA -----
    addSlaPolicy: (input) => {
      const orgId = meOrg();
      const policy: SlaPolicy = {
        id: `sla_${Date.now()}`,
        org_id: orgId,
        name: input.name,
        priority: input.priority,
        responseMins: input.responseMins,
        resolutionMins: input.resolutionMins,
        active: true,
      };
      set(reslice({ _allSla: [...get()._allSla, policy] }));
      pushLog({ actor: meName(), action: "created SLA policy", target: policy.name, type: "sla" });
      return policy;
    },
    updateSlaPolicy: (id, patch) => {
      set(reslice({ _allSla: get()._allSla.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      const p = get()._allSla.find((x) => x.id === id);
      if (p) pushLog({ actor: meName(), action: "updated SLA policy", target: p.name, type: "sla" });
    },
    toggleSlaActive: (id) => {
      const p = get()._allSla.find((x) => x.id === id);
      if (!p) return;
      set(reslice({ _allSla: get()._allSla.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) }));
      pushLog({ actor: meName(), action: p.active ? "disabled" : "enabled", target: p.name, type: "sla" });
    },
    deleteSlaPolicy: (id) => {
      const p = get()._allSla.find((x) => x.id === id);
      set(reslice({ _allSla: get()._allSla.filter((x) => x.id !== id) }));
      if (p) pushLog({ actor: meName(), action: "deleted SLA policy", target: p.name, type: "sla" });
    },

    // ----- Service requests -----
    addServiceRequest: (itemId) => {
      const orgId = meOrg();
      const item = get()._allCatalog.find((c) => c.id === itemId);
      if (!item) throw new Error("Catalog item not found");
      const orgReqs = get()._allRequests.filter((r) => r.org_id === orgId);
      const num = (orgId === "org_acme" ? 500 : orgId === "org_globex" ? 700 : 900) + orgReqs.length;
      const orgAgents = get()._allAgents.filter((a) => a.org_id === orgId);
      const sr: ServiceRequest = {
        id: `sreq_${Date.now()}`,
        org_id: orgId,
        number: `REQ-${num}`,
        itemId: item.id,
        itemTitle: item.title,
        requesterId: get().currentUserId ?? get()._allCustomers.find((c) => c.org_id === orgId)?.id ?? "unknown",
        status: "submitted",
        approver: orgAgents.find((a) => a.role === "manager" || a.role === "admin")?.name ?? orgAgents[0]?.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          { name: "Submitted", status: "current" },
          { name: "Approval", status: "pending" },
          { name: "Fulfillment", status: "pending" },
          { name: "Completed", status: "pending" },
        ],
      };
      set(reslice({ _allRequests: [sr, ...get()._allRequests] }));
      pushLog({ actor: meName(), action: "submitted request", target: sr.number, type: "ticket" });
      return sr;
    },
    advanceServiceRequest: (id) => {
      const sr = get()._allRequests.find((r) => r.id === id);
      if (!sr) return;
      const order: ServiceRequest["status"][] = ["submitted", "approval", "fulfilling", "completed"];
      const idx = order.indexOf(sr.status);
      const nextStatus = order[Math.min(idx + 1, order.length - 1)];
      const stepNames = ["Submitted", "Approval", "Fulfillment", "Completed"];
      const stepIdx = order.indexOf(nextStatus);
      set(reslice({
        _allRequests: get()._allRequests.map((r) =>
          r.id === id
            ? {
                ...r,
                status: nextStatus,
                updatedAt: new Date().toISOString(),
                steps: stepNames.map((n, i) => ({ name: n, status: i < stepIdx ? "done" : i === stepIdx ? "current" : "pending" })),
              }
            : r,
        ),
      }));
      pushLog({ actor: meName(), action: `advanced to ${nextStatus}`, target: sr.number, type: "ticket" });
    },

    approveServiceRequest: (id) => {
      const sr = get()._allRequests.find((r) => r.id === id);
      if (!sr) return;
      const stepNames = ["Submitted", "Approval", "Fulfillment", "Completed"];
      set(reslice({
        _allRequests: get()._allRequests.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "fulfilling",
                updatedAt: new Date().toISOString(),
                approver: meName(),
                steps: stepNames.map((n, i) => ({ name: n, status: i < 2 ? "done" : i === 2 ? "current" : "pending" })),
              }
            : r,
        ),
      }));
      pushLog({ actor: meName(), action: "approved request", target: sr.number, type: "ticket" });
    },

    rejectServiceRequest: (id, reason) => {
      const sr = get()._allRequests.find((r) => r.id === id);
      if (!sr) return;
      set(reslice({
        _allRequests: get()._allRequests.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "rejected",
                updatedAt: new Date().toISOString(),
                approver: meName(),
                steps: r.steps.map((s, i) => ({ ...s, status: i === 1 ? "current" : i === 0 ? "done" : "pending" })),
              }
            : r,
        ),
      }));
      pushLog({ actor: meName(), action: `rejected request${reason ? ` (${reason})` : ""}`, target: sr.number, type: "ticket" });
    },

    // ----- Settings -----
    setCategories: (cats) => {
      const orgId = meOrg();
      set(reslice({ _settingsByOrg: { ...get()._settingsByOrg, [orgId]: { ...get()._settingsByOrg[orgId], categories: cats } } }));
    },
    addCategory: (c) => {
      const orgId = meOrg();
      const cur = get()._settingsByOrg[orgId];
      if (!cur || cur.categories.includes(c)) return;
      set(reslice({ _settingsByOrg: { ...get()._settingsByOrg, [orgId]: { ...cur, categories: [...cur.categories, c] } } }));
      pushLog({ actor: meName(), action: "added category", target: c, type: "system" });
    },
    removeCategory: (c) => {
      const orgId = meOrg();
      const cur = get()._settingsByOrg[orgId];
      if (!cur) return;
      set(reslice({ _settingsByOrg: { ...get()._settingsByOrg, [orgId]: { ...cur, categories: cur.categories.filter((x) => x !== c) } } }));
      pushLog({ actor: meName(), action: "removed category", target: c, type: "system" });
    },
    setNotificationPref: (k, v) => {
      const orgId = meOrg();
      const cur = get()._settingsByOrg[orgId];
      if (!cur) return;
      set(reslice({ _settingsByOrg: { ...get()._settingsByOrg, [orgId]: { ...cur, notifications: { ...cur.notifications, [k]: v } } } }));
    },
    updateOrgSettings: (patch) => {
      const orgId = meOrg();
      const cur = get()._settingsByOrg[orgId];
      if (!cur) return;
      set(reslice({ _settingsByOrg: { ...get()._settingsByOrg, [orgId]: { ...cur, ...patch } } }));
      pushLog({ actor: meName(), action: "updated workspace settings", target: orgId, type: "system" });
    },

    addLog: pushLog,
  };
});

// ---- Helpers ----
export const findUser = (id?: string) => [...allAgents, ...allCustomers].find((u) => u.id === id);
export const findAgent = (id?: string) => allAgents.find((a) => a.id === id);

export function useOrgAgents() { return useAppStore((s) => s.orgAgents); }
export function useOrgCustomers() { return useAppStore((s) => s.orgCustomers); }
export function useOrgArticles() { return useAppStore((s) => s.articles); }
export function useOrgLogs() { return useAppStore((s) => s.logs); }
export function useOrgSlaPolicies() { return useAppStore((s) => s.slaPolicies); }
export function useOrgCatalog() { return useAppStore((s) => s.catalog); }
export function useOrgSettings() { return useAppStore((s) => s.settings); }

/**
 * Returns the "effective" current org user - bridges the auth user
 * (u_admin etc.) to a representation usable by ticket mutations as "me".
 * For requesters, also attempts to find the seeded customer by email.
 */
export function useCurrentOrgUser() {
  const { user, currentRole, currentOrgId } = useAuth();
  const orgAgents = useOrgAgents();
  const orgCustomers = useOrgCustomers();
  return useMemo(() => {
    if (!user || !currentOrgId) return null;
    // Try to match by email first (email-based seed users → org agents)
    const emailMatch = [...orgAgents, ...orgCustomers].find((u) => u.email === user.email);
    if (emailMatch) {
      return { id: emailMatch.id, name: emailMatch.name, email: emailMatch.email, role: currentRole, isStaff: currentRole !== "requester" };
    }
    // Fallback: synthesize a virtual user. For staff roles, pretend to be first org agent.
    if (currentRole === "requester") {
      const first = orgCustomers[0];
      return first
        ? { id: first.id, name: user.full_name || user.email, email: user.email, role: currentRole, isStaff: false }
        : { id: user.id, name: user.full_name || user.email, email: user.email, role: currentRole, isStaff: false };
    }
    const first = orgAgents[0];
    return first
      ? { id: first.id, name: user.full_name || user.email, email: user.email, role: currentRole, isStaff: true }
      : { id: user.id, name: user.full_name || user.email, email: user.email, role: currentRole, isStaff: true };
  }, [user, currentRole, currentOrgId, orgAgents, orgCustomers]);
}

// Bridge: keep store.currentOrgId + currentUserId in sync with AuthContext.
// IMPORTANT: keep hook calls flat & unconditional to avoid "rendered more hooks
// than during the previous render" errors. We read/write the store via
// getState/setState inside effects rather than via reactive selectors.
export function useOrgSync() {
  const auth = useAuth();
  const currentOrgId = auth?.currentOrgId ?? null;
  const currentRole = auth?.currentRole ?? null;
  const userId = auth?.user?.id ?? null;
  const userEmail = auth?.user?.email ?? null;
  const userName = auth?.user?.full_name ?? null;

  useEffect(() => {
    useAppStore.getState().setCurrentOrg(currentOrgId);
  }, [currentOrgId]);

  useEffect(() => {
    if (!currentOrgId) {
      useAppStore.getState().setCurrentUser(null, null);
      return;
    }
    const { orgAgents, orgCustomers } = useAppStore.getState();
    const match = [...orgAgents, ...orgCustomers].find((u) => u.email === userEmail);
    if (match) {
      useAppStore.getState().setCurrentUser(match.id, match.name);
      return;
    }

    if (currentRole === "requester") {
      const firstCustomer = orgCustomers[0];
      useAppStore.getState().setCurrentUser(firstCustomer?.id ?? userId, firstCustomer?.name ?? userName ?? userEmail);
      return;
    }

    const firstAgent = orgAgents[0];
    useAppStore.getState().setCurrentUser(firstAgent?.id ?? userId, firstAgent?.name ?? userName ?? userEmail);
  }, [currentOrgId, currentRole, userId, userEmail, userName]);
}

// Backwards-compatibility (full datasets - used only by helpers like findUser).
export { allAgents as agents, allCustomers as customers };
