import { create } from "zustand";
import { useEffect } from "react";
import {
  tickets as seedTickets,
  incidents as seedIncidents,
  serviceRequests as seedRequests,
  agents as allAgents,
  customers as allCustomers,
} from "./mockData";
import type { Ticket, Incident, ServiceRequest, Priority, TicketStatus, Message, ActivityEvent } from "./types";
import { useAuth } from "@/contexts/AuthContext";

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

interface AppState {
  // Internal: full datasets across all orgs.
  _allTickets: Ticket[];
  _allIncidents: Incident[];
  _allRequests: ServiceRequest[];

  // Public (auto-filtered by currentOrgId — what pages should read).
  tickets: Ticket[];
  incidents: Incident[];
  requests: ServiceRequest[];

  selectedTicketId: string | null;
  theme: "dark" | "light";
  currentOrgId: string | null;

  setCurrentOrg: (orgId: string | null) => void;
  setSelectedTicket: (id: string | null) => void;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  addMessage: (id: string, body: string, isInternal: boolean) => void;
  addActivity: (id: string, ev: Omit<ActivityEvent, "id" | "at">) => void;
  setStatus: (id: string, status: TicketStatus) => void;
  setPriority: (id: string, priority: Priority) => void;
  setAssignee: (id: string, agentId: string | undefined) => void;
  addTicket: (input: NewTicketInput) => Ticket;
  addIncident: (input: NewIncidentInput) => Incident;
  deleteTicket: (id: string) => void;
  toggleTheme: () => void;
}

const orgPrefix = (orgId: string) =>
  orgId === "org_acme" ? "AC" : orgId === "org_globex" ? "GX" : orgId === "org_initech" ? "IH" : "TK";

const filterByOrg = <T extends { org_id: string }>(arr: T[], orgId: string | null) =>
  orgId ? arr.filter((x) => x.org_id === orgId) : [];

export const useAppStore = create<AppState>((set, get) => {
  /** Recomputes the public org-filtered slices after any internal mutation. */
  const reslice = (patch: Partial<AppState> = {}) => {
    const next = { ...get(), ...patch };
    return {
      ...patch,
      tickets: filterByOrg(next._allTickets, next.currentOrgId),
      incidents: filterByOrg(next._allIncidents, next.currentOrgId),
      requests: filterByOrg(next._allRequests, next.currentOrgId),
    };
  };

  return {
    _allTickets: seedTickets,
    _allIncidents: seedIncidents,
    _allRequests: seedRequests,
    tickets: [],
    incidents: [],
    requests: [],
    selectedTicketId: null,
    theme: "light",
    currentOrgId: null,

    setCurrentOrg: (orgId) => {
      if (get().currentOrgId === orgId) return;
      set(reslice({ currentOrgId: orgId, selectedTicketId: null }));
    },
    setSelectedTicket: (id) => set({ selectedTicketId: id }),

    updateTicket: (id, patch) =>
      set(reslice({
        _allTickets: get()._allTickets.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
        ),
      })),

    addMessage: (id, body, isInternal) => {
      const t = get()._allTickets.find((x) => x.id === id);
      if (!t) return;
      const me = allAgents.find((a) => a.org_id === t.org_id) ?? allAgents[0];
      const msg: Message = {
        id: `m${Math.floor(Math.random() * 1e9)}`,
        authorId: me.id, authorName: me.name, authorRole: "agent",
        body, isInternal, createdAt: new Date().toISOString(),
      };
      set(reslice({
        _allTickets: get()._allTickets.map((x) =>
          x.id === id
            ? {
                ...x,
                messages: [...x.messages, msg],
                updatedAt: new Date().toISOString(),
                activity: [
                  ...x.activity,
                  { id: `e${Date.now()}`, type: "comment", text: isInternal ? "Added internal note" : "Replied to requester", by: me.name, at: new Date().toISOString() },
                ],
              }
            : x,
        ),
      }));
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
      const me = allAgents.find((a) => a.org_id === t.org_id) ?? allAgents[0];
      get().updateTicket(id, { status });
      get().addActivity(id, { type: "status", text: `Status changed to ${status.replace("_", " ")}`, by: me.name });
    },

    setPriority: (id, priority) => {
      const t = get()._allTickets.find((x) => x.id === id);
      if (!t) return;
      const me = allAgents.find((a) => a.org_id === t.org_id) ?? allAgents[0];
      get().updateTicket(id, { priority });
      get().addActivity(id, { type: "priority", text: `Priority changed to ${priority}`, by: me.name });
    },

    setAssignee: (id, agentId) => {
      const t = get()._allTickets.find((x) => x.id === id);
      if (!t) return;
      const me = allAgents.find((a) => a.org_id === t.org_id) ?? allAgents[0];
      get().updateTicket(id, { assigneeId: agentId });
      const a = allAgents.find((x) => x.id === agentId);
      get().addActivity(id, { type: "assigned", text: a ? `Assigned to ${a.name}` : "Unassigned", by: me.name });
    },

    addTicket: (input) => {
      const orgId = get().currentOrgId ?? "org_acme";
      const orgTickets = get()._allTickets.filter((t) => t.org_id === orgId);
      const nextNum = 1000 + orgTickets.length + 1;
      const nowIso = new Date().toISOString();
      const dueOffset = input.priority === "critical" ? 4 : input.priority === "high" ? 12 : input.priority === "medium" ? 24 : 72;
      const me = allAgents.find((a) => a.org_id === orgId) ?? allAgents[0];
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
        activity: [{ id: `e${Date.now()}`, type: "created", text: "Ticket created", by: me.name, at: nowIso }],
        attachments: [],
      };
      set(reslice({ _allTickets: [ticket, ...get()._allTickets], selectedTicketId: ticket.id }));
      return ticket;
    },

    addIncident: (input) => {
      const orgId = get().currentOrgId ?? "org_acme";
      const orgIncidents = get()._allIncidents.filter((i) => i.org_id === orgId);
      const nextNum = 200 + orgIncidents.length + 1;
      const nowIso = new Date().toISOString();
      const me = allAgents.find((a) => a.org_id === orgId) ?? allAgents[0];
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
        timeline: [{ id: `e${Date.now()}`, type: "created", text: "Incident opened", by: me.name, at: nowIso }],
      };
      set(reslice({ _allIncidents: [incident, ...get()._allIncidents] }));
      return incident;
    },

    deleteTicket: (id) =>
      set(reslice({
        _allTickets: get()._allTickets.filter((t) => t.id !== id),
        selectedTicketId: get().selectedTicketId === id ? null : get().selectedTicketId,
      })),

    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      set({ theme: next });
    },
  };
});

// ---- Helpers ----
export const findUser = (id?: string) => [...allAgents, ...allCustomers].find((u) => u.id === id);
export const findAgent = (id?: string) => allAgents.find((a) => a.id === id);

// Org-scoped agent / customer lists (use these in pages)
export function useOrgAgents() {
  const orgId = useAppStore((s) => s.currentOrgId);
  return orgId ? allAgents.filter((a) => a.org_id === orgId) : [];
}
export function useOrgCustomers() {
  const orgId = useAppStore((s) => s.currentOrgId);
  return orgId ? allCustomers.filter((c) => c.org_id === orgId) : [];
}

// Bridge: keep store.currentOrgId in sync with AuthContext.
// Mount this hook once at the app root.
export function useOrgSync() {
  const { currentOrgId } = useAuth();
  const setCurrentOrg = useAppStore((s) => s.setCurrentOrg);
  useEffect(() => {
    setCurrentOrg(currentOrgId);
  }, [currentOrgId, setCurrentOrg]);
}

// Backwards-compatibility exports — many pages still import these directly.
// They contain ALL orgs' data. Prefer the org-aware hooks above.
export { allAgents as agents, allCustomers as customers };
