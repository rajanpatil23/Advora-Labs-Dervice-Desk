// Frontend-only bulk action helpers and global keyboard shortcut registry.

export type ShortcutGroup =
  | "Global"
  | "Navigation"
  | "Tickets"
  | "Ticket detail"
  | "Composer"
  | "Bulk actions"
  | "Dashboard"
  | "Knowledge base"
  | "Accessibility";

export type Shortcut = {
  keys: string[]; // e.g. ["⌘", "K"] or ["G", "T"]
  description: string;
  group: ShortcutGroup;
  context?: string; // e.g. "When a ticket is open"
  hidden?: boolean; // hide from search but keep in catalog
};

export const SHORTCUTS: Shortcut[] = [
  // Global
  { keys: ["⌘", "K"], description: "Open command palette", group: "Global" },
  { keys: ["?"], description: "Show keyboard shortcuts", group: "Global" },
  { keys: ["⌘", "/"], description: "Focus global search", group: "Global" },
  { keys: ["⌘", "B"], description: "Toggle sidebar", group: "Global" },
  { keys: ["⌘", "."], description: "Toggle theme (light/dark)", group: "Global" },
  { keys: ["⌘", "L"], description: "Switch language", group: "Global" },
  { keys: ["Esc"], description: "Close panel / clear selection", group: "Global" },

  // Navigation (G then …)
  { keys: ["G", "D"], description: "Go to dashboard", group: "Navigation" },
  { keys: ["G", "T"], description: "Go to tickets", group: "Navigation" },
  { keys: ["G", "I"], description: "Go to incidents", group: "Navigation" },
  { keys: ["G", "R"], description: "Go to requests", group: "Navigation" },
  { keys: ["G", "Q"], description: "Go to my queue", group: "Navigation" },
  { keys: ["G", "V"], description: "Go to saved views", group: "Navigation" },
  { keys: ["G", "K"], description: "Go to knowledge base", group: "Navigation" },
  { keys: ["G", "A"], description: "Go to automations", group: "Navigation" },
  { keys: ["G", "S"], description: "Go to settings", group: "Navigation" },

  // Tickets list
  { keys: ["C"], description: "New ticket", group: "Tickets" },
  { keys: ["J"], description: "Next ticket", group: "Tickets" },
  { keys: ["K"], description: "Previous ticket", group: "Tickets" },
  { keys: ["X"], description: "Toggle row selection", group: "Tickets" },
  { keys: ["⇧", "X"], description: "Select all visible", group: "Tickets" },
  { keys: ["F"], description: "Open filter panel", group: "Tickets" },
  { keys: ["⌘", "F"], description: "Quick search this view", group: "Tickets" },

  // Ticket detail
  { keys: ["R"], description: "Reply to requester", group: "Ticket detail", context: "When a ticket is open" },
  { keys: ["N"], description: "Add internal note", group: "Ticket detail", context: "When a ticket is open" },
  { keys: ["A"], description: "Assign ticket", group: "Ticket detail", context: "When a ticket is open" },
  { keys: ["P"], description: "Change priority", group: "Ticket detail", context: "When a ticket is open" },
  { keys: ["S"], description: "Change status", group: "Ticket detail", context: "When a ticket is open" },
  { keys: ["⌘", "↵"], description: "Send reply", group: "Composer" },
  { keys: ["⇧", "↵"], description: "New line in composer", group: "Composer" },

  // Bulk
  { keys: ["A"], description: "Assign selected", group: "Bulk actions", context: "With rows selected" },
  { keys: ["P"], description: "Set priority on selected", group: "Bulk actions", context: "With rows selected" },
  { keys: ["S"], description: "Set status on selected", group: "Bulk actions", context: "With rows selected" },
  { keys: ["⌫"], description: "Delete selected", group: "Bulk actions", context: "With rows selected" },

  // Dashboard
  { keys: ["E"], description: "Toggle edit mode", group: "Dashboard", context: "On the dashboard" },
  { keys: ["W"], description: "Open widget library", group: "Dashboard", context: "When editing dashboard" },

  // Knowledge base
  { keys: ["/"], description: "Focus article search", group: "Knowledge base" },
  { keys: ["N"], description: "New article", group: "Knowledge base" },

  // Accessibility
  { keys: ["Tab"], description: "Move focus forward", group: "Accessibility" },
  { keys: ["⇧", "Tab"], description: "Move focus backward", group: "Accessibility" },
  { keys: ["Space"], description: "Activate focused control", group: "Accessibility" },
];

export const GROUP_ORDER: ShortcutGroup[] = [
  "Global",
  "Navigation",
  "Tickets",
  "Ticket detail",
  "Composer",
  "Bulk actions",
  "Dashboard",
  "Knowledge base",
  "Accessibility",
];

// Helpers
export function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
}

export function modKey(): "⌘" | "Ctrl" {
  return isMac() ? "⌘" : "Ctrl";
}

export function displayKey(k: string): string {
  if (k === "⌘") return isMac() ? "⌘" : "Ctrl";
  if (k === "⇧") return "Shift";
  if (k === "↵") return "Enter";
  if (k === "⌫") return "Delete";
  return k;
}

export function shortcutToString(s: Shortcut): string {
  return `${s.keys.map(displayKey).join(" + ")} — ${s.description}`;
}

// Match an event against a single keystroke spec like "mod+k", "shift+x", "?", "Escape"
export function matchKey(e: KeyboardEvent, spec: string): boolean {
  const parts = spec.toLowerCase().split("+").map((p) => p.trim());
  const wantMod = parts.includes("mod");
  const wantShift = parts.includes("shift");
  const wantAlt = parts.includes("alt");
  const key = parts.filter((p) => !["mod", "shift", "alt"].includes(p)).join("+");

  const mod = isMac() ? e.metaKey : e.ctrlKey;
  if (wantMod !== mod) return false;
  if (wantShift !== e.shiftKey) return false;
  if (wantAlt !== e.altKey) return false;
  return e.key.toLowerCase() === key;
}
