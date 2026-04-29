// Unified inbox: aggregates messages from email, chat, SMS, social, and voice
// into a single normalized stream. LocalStorage-backed with seeded demo data.

export type Channel = "email" | "chat" | "sms" | "twitter" | "facebook" | "instagram" | "whatsapp" | "voice";

export interface InboxMessage {
  id: string;
  channel: Channel;
  /** Display name of the sender */
  from: string;
  /** Raw handle / address */
  fromHandle: string;
  avatar?: string;
  subject?: string;
  preview: string;
  body: string;
  receivedAt: string;
  unread: boolean;
  starred: boolean;
  /** Logical thread id - multiple messages can group under one */
  threadId: string;
  /** Optional linked ticket id */
  ticketId?: string;
  attachments?: number;
  sentiment?: "positive" | "neutral" | "negative";
}

const KEY = "ct.inbox.v1";

const FIRST = ["Maya", "Daniel", "Priya", "Marcus", "Lena", "Hiro", "Amina", "Sofia", "Theo", "Wren"];
const LAST  = ["Chen", "Okafor", "Rivera", "Kowalski", "Park", "Singh", "Müller", "Costa", "Kim", "Lopez"];

function pick<T>(a: T[], i: number) { return a[Math.abs(i) % a.length]; }
function uid(p = "msg") { return `${p}_${Math.random().toString(36).slice(2, 9)}`; }

const SAMPLES: Array<Pick<InboxMessage, "channel" | "subject" | "body" | "sentiment">> = [
  { channel: "email",     subject: "Re: Invoice #4821 - partial credit?", body: "Hi team, following up on the credit memo we discussed. Could you confirm the amount and when it will be applied to our next billing cycle?", sentiment: "neutral" },
  { channel: "chat",      body: "Hey 👋 my dashboard widgets keep disappearing after I refresh. Is this a known issue?", sentiment: "negative" },
  { channel: "sms",       body: "Order #A-7741 says delivered but I haven't received it. Can you check?", sentiment: "negative" },
  { channel: "twitter",   body: "@Advora love the new mobile app! the swipe-to-resolve is genuinely delightful 🔥", sentiment: "positive" },
  { channel: "facebook",  body: "I tried updating my payment method 3 times and it keeps failing with a generic error. Help?", sentiment: "negative" },
  { channel: "instagram", body: "DM: Quick question - do you ship to the EU? Couldn't find it in the FAQ.", sentiment: "neutral" },
  { channel: "whatsapp",  body: "Hola, necesito mover mi cita de mañana. ¿Es posible?", sentiment: "neutral" },
  { channel: "voice",     subject: "Voicemail · 1m 14s",   body: "Voicemail transcript: \"Hi, this is John from Acme. Calling about the integration ticket we opened yesterday. Please call back at extension 412. Thanks.\"", sentiment: "neutral" },
  { channel: "email",     subject: "API rate limit increase request", body: "We're hitting 429s consistently between 14:00-16:00 UTC. Could we get bumped to the next tier? Happy to share usage logs.", sentiment: "neutral" },
  { channel: "chat",      body: "Just wanted to say the team that handled my migration was incredible. Five stars ⭐⭐⭐⭐⭐", sentiment: "positive" },
  { channel: "sms",       body: "STOP texting me. I unsubscribed twice already.", sentiment: "negative" },
  { channel: "twitter",   body: "Anyone else seeing 502s on @Advora status page? Status dashboard says all green though.", sentiment: "negative" },
  { channel: "email",     subject: "Security disclosure - XSS in comment renderer", body: "Hello security team - I'd like to report a potential issue. Please confirm a secure channel for details.", sentiment: "neutral" },
  { channel: "whatsapp",  body: "Can you confirm whether my account is on the Pro plan? Billing page is unclear.", sentiment: "neutral" },
];

function seed(): InboxMessage[] {
  const now = Date.now();
  return SAMPLES.map((s, i) => {
    const first = pick(FIRST, i * 7 + s.channel.length);
    const last = pick(LAST, i * 11 + s.channel.length);
    const name = `${first} ${last}`;
    const handle =
      s.channel === "email"   ? `${first}.${last}@${pick(["acme.co","globex.io","initech.com","hooli.dev"], i)}`.toLowerCase() :
      s.channel === "twitter" ? `@${first.toLowerCase()}_${last.toLowerCase()}` :
      s.channel === "instagram" ? `@${first.toLowerCase()}.${last.toLowerCase()}` :
      s.channel === "facebook" ? `fb:${first.toLowerCase()}.${last.toLowerCase()}` :
      s.channel === "sms" || s.channel === "whatsapp" || s.channel === "voice"
        ? `+1${(2025550000 + i * 137).toString().slice(0, 10)}`
        : name;
    const preview = s.body.slice(0, 110);
    return {
      id: uid("m"),
      channel: s.channel,
      from: name,
      fromHandle: handle,
      subject: s.subject,
      body: s.body,
      preview,
      receivedAt: new Date(now - i * 1000 * 60 * (12 + i * 3)).toISOString(),
      unread: i < 6 ? true : Math.random() > 0.7,
      starred: i % 7 === 0,
      threadId: `thr_${i}`,
      attachments: i % 5 === 0 ? 1 + (i % 3) : undefined,
      sentiment: s.sentiment,
    };
  });
}

function read(): InboxMessage[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function write(list: InboxMessage[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const inboxApi = {
  list: () => read().sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt)),
  byId: (id: string) => read().find((m) => m.id === id),
  markRead(id: string, unread = false) {
    const list = read().map((m) => m.id === id ? { ...m, unread } : m);
    write(list);
    return list;
  },
  toggleStar(id: string) {
    const list = read().map((m) => m.id === id ? { ...m, starred: !m.starred } : m);
    write(list);
    return list;
  },
  bulkMarkRead(ids: string[]) {
    const set = new Set(ids);
    const list = read().map((m) => set.has(m.id) ? { ...m, unread: false } : m);
    write(list);
    return list;
  },
  remove(id: string) {
    const list = read().filter((m) => m.id !== id);
    write(list);
    return list;
  },
  /** Convert a message to a ticket reference. */
  convertToTicket(id: string, ticketId: string) {
    const list = read().map((m) => m.id === id ? { ...m, ticketId, unread: false } : m);
    write(list);
    return list;
  },
  reset() {
    localStorage.removeItem(KEY);
    return read();
  },
};

export const CHANNEL_META: Record<Channel, { label: string; color: string; icon: string }> = {
  email:     { label: "Email",     color: "bg-sky-500/15 text-sky-600 border-sky-500/30",         icon: "Mail" },
  chat:      { label: "Live chat", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: "MessageCircle" },
  sms:       { label: "SMS",       color: "bg-violet-500/15 text-violet-600 border-violet-500/30",   icon: "Smartphone" },
  twitter:   { label: "Twitter/X", color: "bg-zinc-700/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30", icon: "Twitter" },
  facebook:  { label: "Facebook",  color: "bg-blue-600/15 text-blue-600 border-blue-600/30",        icon: "Facebook" },
  instagram: { label: "Instagram", color: "bg-pink-500/15 text-pink-600 border-pink-500/30",        icon: "Instagram" },
  whatsapp:  { label: "WhatsApp",  color: "bg-green-500/15 text-green-600 border-green-500/30",     icon: "MessageSquare" },
  voice:     { label: "Voice",     color: "bg-orange-500/15 text-orange-600 border-orange-500/30",  icon: "Phone" },
};
