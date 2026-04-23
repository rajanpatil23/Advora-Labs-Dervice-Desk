import type { Priority, TicketStatus, SlaState } from "./types";

export const priorityMeta: Record<Priority, { label: string; dot: string; chip: string; ring: string }> = {
  low:      { label: "Low",      dot: "bg-info",       chip: "bg-info/10 text-info border-info/20",         ring: "ring-info/30" },
  medium:   { label: "Medium",   dot: "bg-warning",    chip: "bg-warning/10 text-warning border-warning/20", ring: "ring-warning/30" },
  high:     { label: "High",     dot: "bg-accent",     chip: "bg-accent/10 text-accent border-accent/20",   ring: "ring-accent/30" },
  critical: { label: "Critical", dot: "bg-destructive",chip: "bg-destructive/10 text-destructive border-destructive/30 font-semibold", ring: "ring-destructive/40" },
};

export const statusMeta: Record<TicketStatus, { label: string; chip: string }> = {
  new:         { label: "New",         chip: "bg-primary/10 text-primary border-primary/20" },
  open:        { label: "Open",        chip: "bg-info/10 text-info border-info/20" },
  in_progress: { label: "In Progress", chip: "bg-warning/10 text-warning border-warning/20" },
  on_hold:     { label: "On Hold",     chip: "bg-muted text-muted-foreground border-border" },
  resolved:    { label: "Resolved",    chip: "bg-success/10 text-success border-success/20" },
  closed:      { label: "Closed",      chip: "bg-muted text-muted-foreground border-border" },
};

export const slaMeta: Record<SlaState, { label: string; chip: string; dot: string }> = {
  on_track: { label: "On track", chip: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  at_risk:  { label: "At risk",  chip: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  breached: { label: "Breached", chip: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
  met:      { label: "Met",      chip: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const sign = diff < 0 ? "-" : "";
  if (mins < 60) return `${sign}${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `${sign}${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${sign}${d}d ${h%24}h`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
