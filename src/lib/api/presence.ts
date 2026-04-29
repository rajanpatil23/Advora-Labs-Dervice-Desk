// Frontend-only presence + typing simulation. BroadcastChannel cross-tab sync.
// Backend agent: replace with Supabase Realtime channels keyed by `ticket:{id}`.
// API shape stays stable.

export type Presence = {
  userId: string;
  name: string;
  color: string;          // hsl color string
  ticketId: string;
  lastSeen: number;       // epoch ms
  typing?: boolean;
};

const COLORS = [
  "hsl(215, 88%, 56%)", "hsl(330, 81%, 60%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)", "hsl(0, 84%, 60%)",
  "hsl(189, 94%, 43%)", "hsl(25, 95%, 55%)",
];

// Simulated teammates that auto-pop into ticket views to demo presence.
const SIM_TEAMMATES = [
  { userId: "sim_alex", name: "Alex Rivera" },
  { userId: "sim_morgan", name: "Morgan Lee" },
  { userId: "sim_sam", name: "Sam Patel" },
  { userId: "sim_jordan", name: "Jordan Kim" },
];

const STORAGE_KEY = "lov.presence.v1";
const STALE_MS = 12_000;

function read(): Record<string, Presence> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}
function write(map: Record<string, Presence>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
function key(p: Pick<Presence, "userId" | "ticketId">) { return `${p.ticketId}:${p.userId}`; }

let bc: BroadcastChannel | null = null;
function getChannel() {
  if (!bc && typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel("lov.presence");
  }
  return bc;
}

export function colorFor(userId: string): string {
  const idx = Math.abs([...userId].reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length;
  return COLORS[idx];
}

export const presenceApi = {
  /** Announce that `user` is viewing `ticketId`. Returns cleanup fn. */
  enter(user: { id: string; name: string }, ticketId: string) {
    const me: Presence = {
      userId: user.id, name: user.name, color: colorFor(user.id),
      ticketId, lastSeen: Date.now(), typing: false,
    };
    const all = read();
    all[key(me)] = me;
    write(all);
    getChannel()?.postMessage({ type: "enter", presence: me });

    // Heartbeat
    const hb = setInterval(() => {
      const cur = read();
      cur[key(me)] = { ...(cur[key(me)] ?? me), lastSeen: Date.now() };
      write(cur);
      getChannel()?.postMessage({ type: "heartbeat", presence: cur[key(me)] });
    }, 4000);

    // Inject simulated teammates 1-2 seconds in to demo presence
    const simTimers: number[] = [];
    SIM_TEAMMATES.slice(0, 1 + Math.floor(Math.random() * 2)).forEach((sim, i) => {
      const t = window.setTimeout(() => {
        const cur = read();
        const simP: Presence = {
          userId: sim.userId, name: sim.name, color: colorFor(sim.userId),
          ticketId, lastSeen: Date.now(),
        };
        cur[key(simP)] = simP;
        write(cur);
        getChannel()?.postMessage({ type: "enter", presence: simP });

        // Random typing bursts
        const typingTimer = window.setInterval(() => {
          if (Math.random() < 0.25) {
            const c = read();
            c[key(simP)] = { ...simP, typing: true, lastSeen: Date.now() };
            write(c);
            getChannel()?.postMessage({ type: "typing", presence: c[key(simP)] });
            window.setTimeout(() => {
              const c2 = read();
              if (c2[key(simP)]) {
                c2[key(simP)] = { ...c2[key(simP)], typing: false, lastSeen: Date.now() };
                write(c2);
                getChannel()?.postMessage({ type: "typing", presence: c2[key(simP)] });
              }
            }, 2500 + Math.random() * 2500);
          }
        }, 6000);
        simTimers.push(typingTimer);
      }, 1000 + i * 1500);
      simTimers.push(t);
    });

    return () => {
      clearInterval(hb);
      simTimers.forEach((t) => clearTimeout(t));
      const cur = read();
      delete cur[key(me)];
      // Remove simulated peers when leaving
      SIM_TEAMMATES.forEach((sim) => delete cur[`${ticketId}:${sim.userId}`]);
      write(cur);
      getChannel()?.postMessage({ type: "leave", presence: me });
    };
  },

  setTyping(user: { id: string }, ticketId: string, typing: boolean) {
    const cur = read();
    const k = key({ userId: user.id, ticketId });
    if (!cur[k]) return;
    cur[k] = { ...cur[k], typing, lastSeen: Date.now() };
    write(cur);
    getChannel()?.postMessage({ type: "typing", presence: cur[k] });
  },

  /** Snapshot of current presences for a ticket, excluding stale entries. */
  list(ticketId: string): Presence[] {
    const all = read();
    const now = Date.now();
    return Object.values(all)
      .filter((p) => p.ticketId === ticketId && now - p.lastSeen < STALE_MS)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  subscribe(ticketId: string, cb: (list: Presence[]) => void): () => void {
    const fire = () => cb(presenceApi.list(ticketId));
    fire();
    const ch = getChannel();
    const onMsg = () => fire();
    ch?.addEventListener("message", onMsg);
    const poll = setInterval(fire, 2500);
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) fire(); };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      clearInterval(poll);
      window.removeEventListener("storage", onStorage);
    };
  },
};
