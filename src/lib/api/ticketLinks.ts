// Ticket merging & linking API with localStorage persistence
export type LinkKind = "duplicate" | "related" | "blocks" | "blocked_by" | "parent" | "child" | "merged_into";

export interface TicketLink {
  id: string;
  fromTicketId: string;
  toTicketId: string;
  kind: LinkKind;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export interface MergeRecord {
  id: string;
  sourceTicketId: string; // closed/merged
  targetTicketId: string; // surviving
  reason?: string;
  mergedAt: string;
  mergedBy: string;
  messagesMoved: number;
}

const LINKS_KEY = "ticket_links_v1";
const MERGES_KEY = "ticket_merges_v1";

function read<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
}
function write<T>(k: string, v: T[]) {
  localStorage.setItem(k, JSON.stringify(v));
}

const inverseKind: Partial<Record<LinkKind, LinkKind>> = {
  blocks: "blocked_by",
  blocked_by: "blocks",
  parent: "child",
  child: "parent",
  duplicate: "duplicate",
  related: "related",
  merged_into: "merged_into",
};

export function listLinks(ticketId?: string): TicketLink[] {
  const all = read<TicketLink>(LINKS_KEY);
  if (!ticketId) return all;
  return all.filter(l => l.fromTicketId === ticketId || l.toTicketId === ticketId);
}

export function addLink(input: Omit<TicketLink, "id" | "createdAt">): TicketLink {
  const all = read<TicketLink>(LINKS_KEY);
  // prevent duplicates
  const exists = all.find(l =>
    l.fromTicketId === input.fromTicketId &&
    l.toTicketId === input.toTicketId &&
    l.kind === input.kind
  );
  if (exists) return exists;

  const link: TicketLink = {
    ...input,
    id: `lnk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  all.push(link);

  // mirror inverse for clarity
  const inv = inverseKind[input.kind];
  if (inv) {
    all.push({
      ...link,
      id: `lnk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_i`,
      fromTicketId: input.toTicketId,
      toTicketId: input.fromTicketId,
      kind: inv,
    });
  }

  write(LINKS_KEY, all);
  return link;
}

export function removeLink(linkId: string) {
  const all = read<TicketLink>(LINKS_KEY);
  const target = all.find(l => l.id === linkId);
  if (!target) return;
  // remove its inverse too
  const remaining = all.filter(l =>
    l.id !== linkId &&
    !(l.fromTicketId === target.toTicketId &&
      l.toTicketId === target.fromTicketId &&
      l.kind === inverseKind[target.kind])
  );
  write(LINKS_KEY, remaining);
}

export function listMerges(): MergeRecord[] {
  return read<MergeRecord>(MERGES_KEY);
}

export function mergeTickets(input: {
  sourceTicketId: string;
  targetTicketId: string;
  reason?: string;
  mergedBy: string;
  messagesMoved?: number;
}): MergeRecord {
  if (input.sourceTicketId === input.targetTicketId) {
    throw new Error("Cannot merge a ticket into itself");
  }
  const all = read<MergeRecord>(MERGES_KEY);
  const record: MergeRecord = {
    id: `mrg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sourceTicketId: input.sourceTicketId,
    targetTicketId: input.targetTicketId,
    reason: input.reason,
    mergedAt: new Date().toISOString(),
    mergedBy: input.mergedBy,
    messagesMoved: input.messagesMoved ?? 0,
  };
  all.push(record);
  write(MERGES_KEY, all);

  // automatically create a merged_into link
  addLink({
    fromTicketId: input.sourceTicketId,
    toTicketId: input.targetTicketId,
    kind: "merged_into",
    note: input.reason,
    createdBy: input.mergedBy,
  });

  return record;
}

export function findMergeFor(sourceTicketId: string): MergeRecord | undefined {
  return read<MergeRecord>(MERGES_KEY).find(m => m.sourceTicketId === sourceTicketId);
}

export const linkKindLabels: Record<LinkKind, string> = {
  duplicate: "Duplicate of",
  related: "Related to",
  blocks: "Blocks",
  blocked_by: "Blocked by",
  parent: "Parent of",
  child: "Child of",
  merged_into: "Merged into",
};
