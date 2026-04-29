// Sound + desktop notification engine.
// - Web Audio API generates short, distinct chimes per event (no asset files needed).
// - Notifications API handles desktop pop-ups.
// - All driven by user prefs in `notifications.ts`.

import {
  EVENT_DEFINITIONS,
  isMuted,
  readPrefs,
  type NotificationEventKey,
  type NotificationPrefs,
} from "@/lib/api/notifications";

export type SoundPack = "chime" | "soft" | "retro" | "off";

export const SOUND_PACKS: { value: SoundPack; label: string; description: string }[] = [
  { value: "chime", label: "Chime", description: "Bright modern bells (default)." },
  { value: "soft", label: "Soft", description: "Gentle low-frequency pulses." },
  { value: "retro", label: "Retro", description: "Square-wave 8-bit blips." },
  { value: "off", label: "Off", description: "No sound." },
];

// Severity per event — drives base pitch and desktop notification urgency.
const EVENT_SEVERITY: Record<NotificationEventKey, "low" | "med" | "high"> = {
  ticket_assigned: "med",
  ticket_mentioned: "high",
  ticket_updated: "low",
  ticket_resolved: "low",
  sla_breach_warning: "high",
  sla_breached: "high",
  incident_created: "high",
  incident_updated: "med",
  approval_requested: "med",
  approval_decided: "med",
  csat_received: "low",
  kb_comment: "low",
};

// ─── Web Audio ────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
  delay = 0,
) {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const start = ac.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gainPeak, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playPack(pack: SoundPack, severity: "low" | "med" | "high", volume: number) {
  if (pack === "off") return;
  const v = Math.max(0, Math.min(1, volume)) * 0.25; // safety cap
  if (pack === "chime") {
    const base = severity === "high" ? 880 : severity === "med" ? 659 : 523;
    tone(base, 0.18, "sine", v);
    tone(base * 1.5, 0.22, "sine", v * 0.7, 0.06);
    if (severity === "high") tone(base * 2, 0.25, "sine", v * 0.5, 0.14);
  } else if (pack === "soft") {
    const base = severity === "high" ? 440 : severity === "med" ? 330 : 261;
    tone(base, 0.35, "triangle", v * 0.9);
    tone(base * 1.25, 0.4, "triangle", v * 0.5, 0.12);
  } else if (pack === "retro") {
    const base = severity === "high" ? 800 : severity === "med" ? 600 : 400;
    tone(base, 0.07, "square", v * 0.7);
    tone(base * 1.5, 0.07, "square", v * 0.7, 0.08);
    if (severity === "high") tone(base * 2, 0.08, "square", v * 0.7, 0.16);
  }
}

// ─── Desktop notifications ───────────────────────────────────────────────────

export function desktopPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestDesktopPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied")
    return Notification.permission;
  return await Notification.requestPermission();
}

function showDesktop(title: string, body: string, tag: string, severity: "low" | "med" | "high") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return; // skip when focused
  try {
    new Notification(title, {
      body,
      tag,
      requireInteraction: severity === "high",
      silent: true, // we play our own sound
    });
  } catch {
    /* noop */
  }
}

// ─── Prefs extension (read-through to existing prefs object) ─────────────────

export type FeedbackPrefs = {
  soundEnabled: boolean;
  soundPack: SoundPack;
  soundVolume: number; // 0..1
  desktopEnabled: boolean;
};

const FEEDBACK_KEY = (uid: string) => `lov.notifications.feedback.v1.${uid}`;

export function readFeedback(userId: string): FeedbackPrefs {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY(userId));
    if (!raw) return defaultFeedback();
    const parsed = JSON.parse(raw);
    return { ...defaultFeedback(), ...parsed };
  } catch {
    return defaultFeedback();
  }
}

export function writeFeedback(userId: string, p: FeedbackPrefs) {
  localStorage.setItem(FEEDBACK_KEY(userId), JSON.stringify(p));
}

export function defaultFeedback(): FeedbackPrefs {
  return { soundEnabled: true, soundPack: "chime", soundVolume: 0.6, desktopEnabled: false };
}

// ─── Public emit API ─────────────────────────────────────────────────────────

export interface EmitArgs {
  userId: string;
  event: NotificationEventKey;
  title: string;
  body: string;
  tag?: string;
  prefs?: NotificationPrefs;
  feedback?: FeedbackPrefs;
}

export function emitNotification({
  userId,
  event,
  title,
  body,
  tag,
  prefs,
  feedback,
}: EmitArgs) {
  const p = prefs ?? readPrefs(userId);
  const f = feedback ?? readFeedback(userId);

  // Respect global mute
  if (isMuted(p)) return;

  // Respect per-event in-app toggle (we treat in-app as the gate for sound + desktop)
  const evDef = EVENT_DEFINITIONS.find((e) => e.key === event);
  const inAppOn = p.matrix[event]?.inApp ?? evDef?.defaults.inApp ?? true;
  if (!inAppOn) return;

  const severity = EVENT_SEVERITY[event];

  if (f.soundEnabled) playPack(f.soundPack, severity, f.soundVolume);
  if (f.desktopEnabled) showDesktop(title, body, tag ?? event, severity);
}

// Useful for test buttons in the settings page.
export function previewSound(pack: SoundPack, severity: "low" | "med" | "high" = "med", volume = 0.6) {
  playPack(pack, severity, volume);
}

export function previewDesktop(title = "Notification preview", body = "This is what desktop alerts look like.") {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, tag: "preview", silent: true });
    return true;
  } catch {
    return false;
  }
}
