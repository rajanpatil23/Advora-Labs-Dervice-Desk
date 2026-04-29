// Lightweight in-memory live chat sessions (localStorage persistence)
export type ChatSender = "visitor" | "agent" | "bot" | "system";
export type SessionStatus = "queued" | "active" | "ended" | "abandoned";

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  authorName?: string;
  body: string;
  sentAt: string;
}

export interface ChatVisitor {
  id: string;
  name: string;
  email?: string;
  page: string;          // page they're on
  country?: string;
  device?: "desktop" | "mobile" | "tablet";
}

export interface ChatSession {
  id: string;
  visitor: ChatVisitor;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  unread: number;        // unread messages for the agent side
  lastMessageAt: string;
  messages: ChatMessage[];
  tags: string[];
  rating?: 1 | 2 | 3 | 4 | 5;
}

const KEY = "live_chat_sessions_v1";

function read(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(s: ChatSession[]) { localStorage.setItem(KEY, JSON.stringify(s)); }

const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Listen to other tabs / widget changes
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === KEY) emit(); });
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const SAMPLE_VISITORS: Omit<ChatVisitor, "id">[] = [
  { name: "Lena Okonkwo", page: "/pricing", country: "🇳🇬 NG", device: "desktop" },
  { name: "Hiro Tanaka", page: "/docs/api", country: "🇯🇵 JP", device: "mobile" },
  { name: "Visitor 7421", page: "/", country: "🇩🇪 DE", device: "desktop" },
];

export function listSessions(): ChatSession[] {
  return read().sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
}

export function getSession(id: string): ChatSession | undefined {
  return read().find(s => s.id === id);
}

export function startSession(visitor: Omit<ChatVisitor, "id"> | undefined = undefined): ChatSession {
  const v = visitor ?? SAMPLE_VISITORS[Math.floor(Math.random() * SAMPLE_VISITORS.length)];
  const now = new Date().toISOString();
  const session: ChatSession = {
    id: uid("chat"),
    visitor: { id: uid("vis"), ...v },
    status: "queued",
    startedAt: now,
    unread: 1,
    lastMessageAt: now,
    tags: [],
    messages: [
      {
        id: uid("msg"),
        sender: "system",
        body: `New chat from ${v.name} on ${v.page}`,
        sentAt: now,
      },
    ],
  };
  write([session, ...read()]);
  emit();
  return session;
}

export function appendMessage(sessionId: string, msg: Omit<ChatMessage, "id" | "sentAt">) {
  const all = read();
  const idx = all.findIndex(s => s.id === sessionId);
  if (idx === -1) return;
  const now = new Date().toISOString();
  const message: ChatMessage = { id: uid("msg"), sentAt: now, ...msg };
  all[idx].messages.push(message);
  all[idx].lastMessageAt = now;
  if (msg.sender === "visitor") all[idx].unread = (all[idx].unread ?? 0) + 1;
  write(all);
  emit();
}

export function markRead(sessionId: string) {
  const all = read();
  const s = all.find(x => x.id === sessionId);
  if (!s) return;
  s.unread = 0;
  write(all);
  emit();
}

export function assignAgent(sessionId: string, agentId: string, agentName: string) {
  const all = read();
  const s = all.find(x => x.id === sessionId);
  if (!s) return;
  s.assignedAgentId = agentId;
  s.assignedAgentName = agentName;
  s.status = "active";
  s.messages.push({
    id: uid("msg"),
    sender: "system",
    body: `${agentName} joined the chat`,
    sentAt: new Date().toISOString(),
  });
  s.lastMessageAt = new Date().toISOString();
  write(all);
  emit();
}

export function endSession(sessionId: string, rating?: ChatSession["rating"]) {
  const all = read();
  const s = all.find(x => x.id === sessionId);
  if (!s) return;
  s.status = "ended";
  s.endedAt = new Date().toISOString();
  if (rating) s.rating = rating;
  s.messages.push({
    id: uid("msg"),
    sender: "system",
    body: "Chat ended",
    sentAt: s.endedAt,
  });
  s.lastMessageAt = s.endedAt;
  write(all);
  emit();
}

export function setTags(sessionId: string, tags: string[]) {
  const all = read();
  const s = all.find(x => x.id === sessionId);
  if (!s) return;
  s.tags = tags;
  write(all);
  emit();
}

// Demo seed
export function seedIfEmpty() {
  if (read().length > 0) return;
  const s1 = startSession({ name: "Lena Okonkwo", email: "lena@acme.io", page: "/pricing", country: "🇳🇬 NG", device: "desktop" });
  appendMessage(s1.id, { sender: "visitor", authorName: "Lena Okonkwo", body: "Hi, do you offer annual billing discounts?" });
  const s2 = startSession({ name: "Hiro Tanaka", page: "/docs/api", country: "🇯🇵 JP", device: "mobile" });
  appendMessage(s2.id, { sender: "visitor", authorName: "Hiro Tanaka", body: "The webhook signature header is missing in my callback" });
  appendMessage(s2.id, { sender: "agent", authorName: "Auto-router", body: "Routing you to a developer support agent…" });
}

export function chatStats(sessions: ChatSession[]) {
  return {
    queued: sessions.filter(s => s.status === "queued").length,
    active: sessions.filter(s => s.status === "active").length,
    ended: sessions.filter(s => s.status === "ended").length,
    unread: sessions.reduce((sum, s) => sum + (s.unread ?? 0), 0),
  };
}
