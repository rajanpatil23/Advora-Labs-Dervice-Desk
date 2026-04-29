// Frontend-only bulk action helpers and global keyboard shortcut registry.

export type Shortcut = {
  keys: string[];      // e.g. ["⌘", "K"] or ["G", "T"]
  description: string;
  group: "Navigation" | "Tickets" | "Composer" | "Global";
};

export const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], description: "Open command palette", group: "Global" },
  { keys: ["?"],      description: "Show keyboard shortcuts", group: "Global" },
  { keys: ["⌘", "/"], description: "Focus search", group: "Global" },
  { keys: ["G", "D"], description: "Go to dashboard", group: "Navigation" },
  { keys: ["G", "T"], description: "Go to tickets", group: "Navigation" },
  { keys: ["G", "I"], description: "Go to incidents", group: "Navigation" },
  { keys: ["G", "Q"], description: "Go to my queue", group: "Navigation" },
  { keys: ["G", "V"], description: "Go to saved views", group: "Navigation" },
  { keys: ["C"],      description: "New ticket", group: "Tickets" },
  { keys: ["X"],      description: "Toggle row selection", group: "Tickets" },
  { keys: ["⇧", "X"], description: "Select all visible", group: "Tickets" },
  { keys: ["A"],      description: "Assign selected", group: "Tickets" },
  { keys: ["P"],      description: "Set priority on selected", group: "Tickets" },
  { keys: ["S"],      description: "Set status on selected", group: "Tickets" },
  { keys: ["⌫"],      description: "Delete selected", group: "Tickets" },
  { keys: ["⌘", "↵"], description: "Send reply", group: "Composer" },
  { keys: ["Esc"],    description: "Close panel / clear selection", group: "Global" },
];

// Helpers
export function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
}

export function modKey(): "⌘" | "Ctrl" {
  return isMac() ? "⌘" : "Ctrl";
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
