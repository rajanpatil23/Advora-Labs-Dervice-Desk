import { create } from "zustand";
import { tickets as seedTickets, incidents as seedIncidents, serviceRequests as seedRequests, agents, customers } from "./mockData";
import type { Ticket, Incident, ServiceRequest, Priority, TicketStatus, Message, ActivityEvent } from "./types";

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
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tickets: seedTickets,
  incidents: seedIncidents,
  requests: seedRequests,
  selectedTicketId: seedTickets[0]?.id ?? null,
  theme: "dark",
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
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    set({ theme: next });
  },
}));

export { agents, customers };
export const findUser = (id?: string) => [...agents, ...customers].find(u => u.id === id);
export const findAgent = (id?: string) => agents.find(a => a.id === id);
