// Lightweight chat session store for the portal chat widget.
// Persists in localStorage. Mock conversation flow with bot-first triage
// and simulated agent handoff (real apps would wire this to an edge function
// + presence channel for true real-time).

export type ChatRole = "bot" | "agent" | "user" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  body: string;
  at: string;
  authorName?: string;
  suggestions?: string[]; // quick-reply chips
  articles?: { id: string; title: string; href?: string }[];
}

export interface ChatSession {
  id: string;
  startedAt: string;
  status: "bot" | "queued" | "with_agent" | "ended";
  agentName?: string;
  agentAvatarColor?: string;
  agentInitials?: string;
  messages: ChatMessage[];
  unread: number;
  queuePosition?: number;
}

const KEY = "lov.portal.chat.v1";
const RAND = (n = 6) => Math.random().toString(36).slice(2, 2 + n);
const NOW = () => new Date().toISOString();

function defaultSession(): ChatSession {
  return {
    id: `cs-${RAND(10)}`,
    startedAt: NOW(),
    status: "bot",
    messages: [
      {
        id: RAND(),
        role: "bot",
        authorName: "Advora Assistant",
        at: NOW(),
        body: "Hi there! 👋 I'm the Advora assistant. I can usually help instantly, or hand you off to a human agent. What's going on?",
        suggestions: [
          "I can't sign in",
          "Reset my password",
          "Billing question",
          "Something is broken",
          "Talk to an agent",
        ],
      },
    ],
    unread: 0,
  };
}

function read(): ChatSession {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSession();
    return JSON.parse(raw);
  } catch {
    return defaultSession();
  }
}

function write(s: ChatSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("portal-chat-updated", { detail: s }));
}

const KNOWLEDGE: { match: RegExp; reply: string; articles?: { id: string; title: string }[]; suggestions?: string[] }[] = [
  {
    match: /\b(reset|forgot|change).*(password|pwd)|password.*reset/i,
    reply:
      "To reset your password, click **Forgot password** on the sign-in page. You'll get a reset email within a minute. If it doesn't arrive, check your spam folder or whitelist `noreply@connecttly.com`.",
    articles: [{ id: "kb-pw", title: "Resetting your password" }],
    suggestions: ["I didn't get the email", "Talk to an agent"],
  },
  {
    match: /can'?t (sign|log) in|sign[- ]?in (issue|problem|fail)|locked out/i,
    reply:
      "Sorry you're having trouble signing in. A few quick checks:\n\n• Make sure caps lock is off\n• Try the password reset flow\n• Disable browser extensions and try again\n\nIf you're still stuck after that, I can connect you with an agent.",
    articles: [{ id: "kb-login", title: "Sign-in troubleshooting" }],
    suggestions: ["Reset my password", "Talk to an agent"],
  },
  {
    match: /\b(bill|invoice|charg|payment|subscription|refund)/i,
    reply:
      "For billing questions I can route you to our billing team - they handle invoices, refunds, and plan changes. Want me to connect you now, or open a request you can track?",
    suggestions: ["Talk to an agent", "Open a request"],
  },
  {
    match: /\b(broke|broken|down|outage|not working|error|bug|crash)/i,
    reply:
      "Got it - sounds like something is broken. Can you share **what you were doing**, **what you expected**, and **what happened instead**? A screenshot helps too. I'll create a request for an engineer to look at it.",
    suggestions: ["Open a request", "Talk to an agent"],
  },
  {
    match: /thank|thanks|thx|cheers/i,
    reply: "You're very welcome! 🙌 Anything else I can help with?",
    suggestions: ["Talk to an agent", "All good"],
  },
];

const AGENT_POOL = [
  { name: "Sarah Chen", color: "#6366F1", initials: "SC" },
  { name: "Marcus Reed", color: "#10B981", initials: "MR" },
  { name: "Priya Patel", color: "#F59E0B", initials: "PP" },
  { name: "Diego Alvarez", color: "#EC4899", initials: "DA" },
];

export const portalChat = {
  get: () => read(),

  reset: () => {
    const s = defaultSession();
    write(s);
    return s;
  },

  end: () => {
    const s = read();
    s.status = "ended";
    s.messages = [
      ...s.messages,
      { id: RAND(), role: "system", at: NOW(), body: "Chat ended. Thanks for reaching out!" },
    ];
    write(s);
    return s;
  },

  markRead: () => {
    const s = read();
    s.unread = 0;
    write(s);
    return s;
  },

  sendUser: (body: string): ChatSession => {
    const s = read();
    if (s.status === "ended") {
      // Reopen
      Object.assign(s, defaultSession(), { id: `cs-${RAND(10)}`, status: "bot" });
    }
    const msg: ChatMessage = { id: RAND(), role: "user", at: NOW(), body };
    s.messages.push(msg);
    write(s);
    return s;
  },

  /**
   * Simulates the bot or agent reply. Returns the next message to display.
   * Caller should typically wrap this in a setTimeout to mimic latency.
   */
  computeReply: (userBody: string): { reply: ChatMessage | null; sessionPatch: Partial<ChatSession> } => {
    const wantsHuman = /\b(human|agent|person|representative|talk to (an? )?(human|agent)|real person)\b/i.test(userBody);
    const s = read();

    if (wantsHuman && s.status === "bot") {
      return {
        reply: {
          id: RAND(),
          role: "bot",
          authorName: "Advora Assistant",
          at: NOW(),
          body: "On it - I'm finding an available agent for you. You're in the queue.",
        },
        sessionPatch: { status: "queued", queuePosition: 1 + Math.floor(Math.random() * 3) },
      };
    }

    if (s.status === "with_agent") {
      const agent = AGENT_POOL.find((a) => a.name === s.agentName) ?? AGENT_POOL[0];
      const replies = [
        "Got it. Let me check that for you.",
        "Thanks for the details - looking into it now.",
        "Could you share a screenshot of the error?",
        "I see the issue. Give me one moment to fix this.",
        "Done! Can you refresh and let me know if it's resolved?",
      ];
      return {
        reply: {
          id: RAND(),
          role: "agent",
          at: NOW(),
          authorName: agent.name,
          body: replies[Math.floor(Math.random() * replies.length)],
        },
        sessionPatch: {},
      };
    }

    // Bot knowledge match
    for (const k of KNOWLEDGE) {
      if (k.match.test(userBody)) {
        return {
          reply: {
            id: RAND(),
            role: "bot",
            authorName: "Advora Assistant",
            at: NOW(),
            body: k.reply,
            articles: k.articles,
            suggestions: k.suggestions,
          },
          sessionPatch: {},
        };
      }
    }

    return {
      reply: {
        id: RAND(),
        role: "bot",
        authorName: "Advora Assistant",
        at: NOW(),
        body: "Hmm, I'm not 100% sure I caught that. Could you give me a bit more detail, or would you like me to connect you with a human agent?",
        suggestions: ["Talk to an agent", "Open a request"],
      },
      sessionPatch: {},
    };
  },

  applyReply: (msg: ChatMessage, patch: Partial<ChatSession>, focused: boolean) => {
    const s = read();
    s.messages.push(msg);
    Object.assign(s, patch);
    if (!focused) s.unread += 1;
    write(s);
    return s;
  },

  /**
   * Promote queued chat to "with_agent" by assigning an agent. Adds a system + agent intro.
   */
  assignAgent: (focused: boolean) => {
    const s = read();
    if (s.status !== "queued") return s;
    const agent = AGENT_POOL[Math.floor(Math.random() * AGENT_POOL.length)];
    s.status = "with_agent";
    s.agentName = agent.name;
    s.agentAvatarColor = agent.color;
    s.agentInitials = agent.initials;
    s.queuePosition = undefined;
    s.messages.push({
      id: RAND(),
      role: "system",
      at: NOW(),
      body: `${agent.name} joined the chat`,
    });
    s.messages.push({
      id: RAND(),
      role: "agent",
      authorName: agent.name,
      at: NOW(),
      body: `Hi! I'm ${agent.name.split(" ")[0]} from the support team. I've read the conversation so far - how can I help?`,
    });
    if (!focused) s.unread += 2;
    write(s);
    return s;
  },
};
