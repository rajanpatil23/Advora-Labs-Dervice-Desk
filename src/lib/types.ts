export type Priority = "low" | "medium" | "high" | "critical";
export type TicketStatus = "new" | "open" | "in_progress" | "on_hold" | "resolved" | "closed";
export type SlaState = "on_track" | "at_risk" | "breached" | "met";
export type Role = "admin" | "manager" | "agent" | "viewer" | "requester";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  initials: string;
  company?: string;
  team?: string;
  role: Role;
  ticketsOpened?: number;
  joined: string;
}

export interface Agent extends User {
  workload: number;
  resolved: number;
  avgResolution: number; // hours
  online: boolean;
  rating: number;
}

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "agent" | "requester" | "system";
  body: string;
  isInternal: boolean;
  createdAt: string; // ISO
  attachments?: { name: string; size: string }[];
}

export interface ActivityEvent {
  id: string;
  type: "created" | "status" | "assigned" | "comment" | "priority" | "sla" | "tag" | "resolved";
  text: string;
  by: string;
  at: string;
}

export interface Ticket {
  id: string;
  number: string; // CN-1024
  title: string;
  description: string;
  requesterId: string;
  assigneeId?: string;
  priority: Priority;
  status: TicketStatus;
  category: string;
  subcategory: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  responseDueAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  slaState: SlaState;
  channel: "email" | "chat" | "portal" | "phone";
  messages: Message[];
  activity: ActivityEvent[];
  attachments?: { name: string; size: string }[];
}

export interface Incident {
  id: string;
  number: string; // INC-204
  title: string;
  service: string;
  impact: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high";
  severity: 1 | 2 | 3 | 4;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  escalation: number;
  rootCause?: string;
  workaround?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  affected: number;
  timeline: ActivityEvent[];
}

export interface ServiceRequestItem {
  id: string;
  catalog: string;
  title: string;
  description: string;
  icon: string;
  estimate: string;
}

export interface ServiceRequest {
  id: string;
  number: string;
  itemId: string;
  itemTitle: string;
  requesterId: string;
  status: "submitted" | "approval" | "fulfilling" | "completed" | "rejected";
  approver?: string;
  createdAt: string;
  updatedAt: string;
  steps: { name: string; status: "done" | "current" | "pending" }[];
}

export interface KbArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  views: number;
  helpful: number;
  updatedAt: string;
  author: string;
}

export interface SlaPolicy {
  id: string;
  name: string;
  priority: Priority;
  responseMins: number;
  resolutionMins: number;
  active: boolean;
}

export interface LogEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  type: "ticket" | "incident" | "user" | "sla" | "system";
}
