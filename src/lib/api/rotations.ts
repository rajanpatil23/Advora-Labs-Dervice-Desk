// Team scheduling & on-call rotations.
// LocalStorage-backed; supports shifts, rotations, overrides, and "who's on now?".

export type RotationKind = "weekly" | "daily" | "custom";

export interface ShiftBlock {
  /** 0=Sun..6=Sat */
  weekday: number;
  /** "09:00" */
  start: string;
  end: string;
}

export interface Rotation {
  id: string;
  name: string;
  description: string;
  /** Ordered list of agent ids/names participating in the rotation */
  participants: string[];
  /** Length of one person's shift in days */
  rotationDays: number;
  /** Optional restriction: only count these weekly blocks toward "on call" */
  blocks: ShiftBlock[];
  timezone: string;
  /** Anchor date - the first participant starts on this date */
  anchorDate: string;
  enabled: boolean;
  color: string;
}

export interface ScheduleOverride {
  id: string;
  rotationId: string;
  /** Who originally was scheduled */
  originalAgent: string;
  /** Who covers instead */
  coverAgent: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
}

const KEY_R = "ct.rotations.v1";
const KEY_O = "ct.rotations.overrides.v1";

const COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
  "#10b981", "#f59e0b", "#14b8a6", "#a855f7",
];

function uid(p = "id") {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}

function seed(): Rotation[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return [
    {
      id: "rot_primary",
      name: "Primary on-call",
      description: "First responders for urgent / P0 tickets and incidents.",
      participants: ["Maya Chen", "Daniel Okafor", "Priya Rivera", "Marcus Kowalski"],
      rotationDays: 7,
      blocks: [],
      timezone: "UTC",
      anchorDate: monday.toISOString(),
      enabled: true,
      color: COLORS[0],
    },
    {
      id: "rot_secondary",
      name: "Secondary on-call",
      description: "Backup pager - escalates after primary has not responded in 10m.",
      participants: ["Lena Park", "Hiro Singh", "Amina Müller"],
      rotationDays: 7,
      blocks: [],
      timezone: "UTC",
      anchorDate: monday.toISOString(),
      enabled: true,
      color: COLORS[2],
    },
    {
      id: "rot_eu_business",
      name: "EU business hours",
      description: "Daytime cover Mon-Fri 09:00-18:00 CET.",
      participants: ["Sofia Costa", "Theo Kim", "Wren Lopez"],
      rotationDays: 1,
      blocks: [
        { weekday: 1, start: "09:00", end: "18:00" },
        { weekday: 2, start: "09:00", end: "18:00" },
        { weekday: 3, start: "09:00", end: "18:00" },
        { weekday: 4, start: "09:00", end: "18:00" },
        { weekday: 5, start: "09:00", end: "18:00" },
      ],
      timezone: "Europe/Berlin",
      anchorDate: monday.toISOString(),
      enabled: true,
      color: COLORS[4],
    },
  ];
}

function readRotations(): Rotation[] {
  try {
    const raw = localStorage.getItem(KEY_R);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  localStorage.setItem(KEY_R, JSON.stringify(s));
  return s;
}

function writeRotations(list: Rotation[]) {
  localStorage.setItem(KEY_R, JSON.stringify(list));
}

function readOverrides(): ScheduleOverride[] {
  try {
    const raw = localStorage.getItem(KEY_O);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function writeOverrides(list: ScheduleOverride[]) {
  localStorage.setItem(KEY_O, JSON.stringify(list));
}

export const rotationApi = {
  list: () => readRotations(),
  get: (id: string) => readRotations().find((r) => r.id === id),
  create(name: string): Rotation {
    const list = readRotations();
    const today = new Date();
    const r: Rotation = {
      id: uid("rot"),
      name,
      description: "",
      participants: [],
      rotationDays: 7,
      blocks: [],
      timezone: "UTC",
      anchorDate: today.toISOString(),
      enabled: true,
      color: COLORS[list.length % COLORS.length],
    };
    list.unshift(r);
    writeRotations(list);
    return r;
  },
  update(id: string, patch: Partial<Rotation>) {
    const list = readRotations();
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return;
    list[i] = { ...list[i], ...patch };
    writeRotations(list);
    return list[i];
  },
  remove(id: string) {
    writeRotations(readRotations().filter((r) => r.id !== id));
    writeOverrides(readOverrides().filter((o) => o.rotationId !== id));
  },
  addParticipant(id: string, name: string) {
    const r = this.get(id);
    if (!r || !name.trim() || r.participants.includes(name)) return r;
    return this.update(id, { participants: [...r.participants, name.trim()] });
  },
  removeParticipant(id: string, name: string) {
    const r = this.get(id);
    if (!r) return;
    return this.update(id, { participants: r.participants.filter((p) => p !== name) });
  },
  reorderParticipants(id: string, names: string[]) {
    return this.update(id, { participants: names });
  },
  /** Compute who is on call for a rotation at a given moment. */
  whoIsOn(rotationId: string, when = new Date()): string | null {
    const r = this.get(rotationId);
    if (!r || !r.enabled || r.participants.length === 0) return null;
    if (r.blocks.length > 0) {
      const wd = when.getDay();
      const hhmm = `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
      const inBlock = r.blocks.some((b) => b.weekday === wd && hhmm >= b.start && hhmm < b.end);
      if (!inBlock) return null;
    }
    const anchor = new Date(r.anchorDate).getTime();
    const elapsedDays = Math.floor((when.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const slot = Math.floor(elapsedDays / Math.max(1, r.rotationDays));
    const idx = ((slot % r.participants.length) + r.participants.length) % r.participants.length;
    const baseAgent = r.participants[idx];
    // Check overrides
    const ov = readOverrides().find((o) =>
      o.rotationId === rotationId &&
      o.originalAgent === baseAgent &&
      when.getTime() >= +new Date(o.startsAt) &&
      when.getTime() <  +new Date(o.endsAt),
    );
    return ov ? ov.coverAgent : baseAgent;
  },
  /** Generate the schedule for a date range in day buckets. */
  schedule(rotationId: string, fromDate: Date, days: number) {
    const out: Array<{ date: Date; agent: string | null; isOverride: boolean }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate);
      d.setDate(d.getDate() + i);
      d.setHours(12, 0, 0, 0);
      const r = this.get(rotationId);
      const baseAgent = r ? this.whoIsOnBase(r, d) : null;
      const override = readOverrides().find((o) =>
        o.rotationId === rotationId &&
        baseAgent === o.originalAgent &&
        d.getTime() >= +new Date(o.startsAt) &&
        d.getTime() <  +new Date(o.endsAt),
      );
      out.push({
        date: d,
        agent: override ? override.coverAgent : baseAgent,
        isOverride: !!override,
      });
    }
    return out;
  },
  whoIsOnBase(r: Rotation, when: Date): string | null {
    if (!r.enabled || r.participants.length === 0) return null;
    const anchor = new Date(r.anchorDate).getTime();
    const elapsedDays = Math.floor((when.getTime() - anchor) / (1000 * 60 * 60 * 24));
    const slot = Math.floor(elapsedDays / Math.max(1, r.rotationDays));
    const idx = ((slot % r.participants.length) + r.participants.length) % r.participants.length;
    return r.participants[idx];
  },
  // Overrides
  listOverrides: () => readOverrides(),
  overridesForRotation(rotationId: string) {
    return readOverrides().filter((o) => o.rotationId === rotationId);
  },
  addOverride(o: Omit<ScheduleOverride, "id">) {
    const list = readOverrides();
    const created: ScheduleOverride = { ...o, id: uid("ov") };
    list.unshift(created);
    writeOverrides(list);
    return created;
  },
  removeOverride(id: string) {
    writeOverrides(readOverrides().filter((o) => o.id !== id));
  },
};

export function fmtDate(d: Date) {
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function shortDay(d: Date) {
  return d.toLocaleDateString([], { weekday: "short" });
}
