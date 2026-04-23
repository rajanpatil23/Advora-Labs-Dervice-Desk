import { create } from "zustand";
import { tickets as seedTickets, incidents as seedIncidents, serviceRequests as seedRequests, agents, customers } from "./mockData";
import type { Ticket, Incident, ServiceRequest, Priority, TicketStatus, Message, ActivityEvent } from "./types";

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
  tickets: Ticket[];
  incidents: Incident[];
  requests: ServiceRequest[];
  selectedTicketId: string | null;
  theme: "dark" | "light";
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

export const useAppStore = create<AppState>((set, get) => ({
  tickets: seedTickets,
  incidents: seedIncidents,
  requests: seedRequests,
  selectedTicketId: seedTickets[0]?.id ?? null,
  theme: "light",
  setSelectedTicket: (id) => set({ selectedTicketId: id }),
  updateTicket: (id, patch) => set({
    tickets: get().tickets.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t),
  }),
  addMessage: (id, body, isInternal) => {
    const me = agents[0];
    const msg: Message = {
      id: `m${Math.floor(Math.random()*1e9)}`,
      authorId: me.id, authorName: me.name, authorRole: "agent",
      body, isInternal, createdAt: new Date().toISOString(),
    };
    set({
      tickets: get().tickets.map(t => t.id === id
        ? { ...t, messages: [...t.messages, msg], updatedAt: new Date().toISOString(),
            activity: [...t.activity, { id: `e${Date.now()}`, type: "comment", text: isInternal ? "Added internal note" : "Replied to requester", by: me.name, at: new Date().toISOString() }] }
        : t)
    });
  },
  addActivity: (id, ev) => set({
    tickets: get().tickets.map(t => t.id === id ? { ...t, activity: [...t.activity, { ...ev, id: `e${Date.now()}`, at: new Date().toISOString() }] } : t)
  }),
  setStatus: (id, status) => {
    get().updateTicket(id, { status });
    get().addActivity(id, { type: "status", text: `Status changed to ${status.replace("_"," ")}`, by: agents[0].name });
  },
  setPriority: (id, priority) => {
    get().updateTicket(id, { priority });
    get().addActivity(id, { type: "priority", text: `Priority changed to ${priority}`, by: agents[0].name });
  },
  setAssignee: (id, agentId) => {
    get().updateTicket(id, { assigneeId: agentId });
    const a = agents.find(a => a.id === agentId);
    get().addActivity(id, { type: "assigned", text: a ? `Assigned to ${a.name}` : "Unassigned", by: agents[0].name });
  },
  addTicket: (input) => {
    const nextNum = 1000 + get().tickets.length + 1;
    const nowIso = new Date().toISOString();
    const dueOffset = input.priority === "critical" ? 4 : input.priority === "high" ? 12 : input.priority === "medium" ? 24 : 72;
    const ticket: Ticket = {
      id: `t${Math.floor(Math.random()*1e9)}`,
      number: `CN-${nextNum}`,
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
      activity: [{ id: `e${Date.now()}`, type: "created", text: "Ticket created", by: agents[0].name, at: nowIso }],
      attachments: [],
    };
    set({ tickets: [ticket, ...get().tickets], selectedTicketId: ticket.id });
    return ticket;
  },
  addIncident: (input) => {
    const nextNum = 200 + get().incidents.length + 1;
    const nowIso = new Date().toISOString();
    const incident: Incident = {
      id: `i${Math.floor(Math.random()*1e9)}`,
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
      timeline: [{ id: `e${Date.now()}`, type: "created", text: "Incident opened", by: agents[0].name, at: nowIso }],
    };
    set({ incidents: [incident, ...get().incidents] });
    return incident;
  },
  deleteTicket: (id) => set({
    tickets: get().tickets.filter(t => t.id !== id),
    selectedTicketId: get().selectedTicketId === id ? (get().tickets.find(t => t.id !== id)?.id ?? null) : get().selectedTicketId,
  }),
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    set({ theme: next });
  },
}));

export { agents, customers };
export const findUser = (id?: string) => [...agents, ...customers].find(u => u.id === id);
export const findAgent = (id?: string) => agents.find(a => a.id === id);
