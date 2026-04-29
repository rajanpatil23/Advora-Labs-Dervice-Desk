// @mention parsing + lookup helpers.
import type { Agent, User } from "@/lib/types";

export type Mentionable = {
  id: string;
  name: string;
  handle: string; // e.g. "alex.kim"
  initials: string;
  avatarColor?: string;
  role?: string;
};

export function toHandle(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
}

export function toMentionable(p: Agent | User): Mentionable {
  return {
    id: p.id,
    name: p.name,
    handle: toHandle(p.name),
    initials: p.initials,
    avatarColor: p.avatarColor,
    role: (p as Agent).role ?? (p as User).role,
  };
}

// Detect a mention trigger in a text input, returning the partial query and its
// start index — e.g. "Hey @al|" → { query: "al", start: 4 }
export function detectMention(text: string, caret: number): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  // require start-of-string or whitespace before @
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const frag = before.slice(at + 1);
  if (/\s/.test(frag)) return null;
  if (frag.length > 30) return null;
  return { query: frag, start: at };
}

export function rankMentions(people: Mentionable[], query: string, limit = 6): Mentionable[] {
  const q = query.toLowerCase();
  if (!q) return people.slice(0, limit);
  const scored = people
    .map((p) => {
      const h = p.handle;
      const n = p.name.toLowerCase();
      let score = -1;
      if (h.startsWith(q) || n.startsWith(q)) score = 100;
      else if (h.includes(q) || n.includes(q)) score = 50;
      return { p, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
  return scored.slice(0, limit).map((x) => x.p);
}

// Extract handles like @alex.kim → list of {handle, start, end}
const MENTION_RE = /(?:^|\s)@([a-z0-9.]+)/gi;
export function extractMentionHandles(text: string): string[] {
  const out: string[] = [];
  let m;
  while ((m = MENTION_RE.exec(text)) !== null) {
    out.push(m[1].toLowerCase());
  }
  return Array.from(new Set(out));
}

// Render plain text with mentions highlighted to React nodes.
export function renderWithMentions(
  text: string,
  isKnown: (handle: string) => boolean,
): Array<{ type: "text" | "mention"; value: string; known?: boolean }> {
  const parts: Array<{ type: "text" | "mention"; value: string; known?: boolean }> = [];
  let last = 0;
  const re = /(^|\s)@([a-z0-9.]+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const fullStart = m.index + m[1].length;
    if (fullStart > last) parts.push({ type: "text", value: text.slice(last, fullStart) });
    parts.push({ type: "mention", value: "@" + m[2], known: isKnown(m[2].toLowerCase()) });
    last = fullStart + 1 + m[2].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
