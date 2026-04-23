import { cn } from "@/lib/utils";
import { priorityMeta, statusMeta, slaMeta } from "@/lib/format";
import type { Priority, TicketStatus, SlaState } from "@/lib/types";

export function PriorityChip({ priority, className }: { priority: Priority; className?: string }) {
  const m = priorityMeta[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border", m.chip, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function StatusChip({ status, className }: { status: TicketStatus; className?: string }) {
  const m = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border", m.chip, className)}>
      {m.label}
    </span>
  );
}

export function SlaChip({ state, className }: { state: SlaState; className?: string }) {
  const m = slaMeta[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border", m.chip, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot, state === "at_risk" || state === "breached" ? "pulse-dot" : "")} />
      {m.label}
    </span>
  );
}

export function Avatar({ initials, color, size = 32, online }: { initials: string; color: string; size?: number; online?: boolean }) {
  return (
    <div className="relative inline-block">
      <div
        className="rounded-full flex items-center justify-center font-semibold text-white shadow-sm"
        style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span className={cn(
          "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-surface",
          online ? "bg-success" : "bg-muted-foreground"
        )} />
      )}
    </div>
  );
}
