// Bridges store changes to the sound/desktop notification engine.
// Watches tickets for: new requester messages, SLA breaches, and assignment to current user.
import { useEffect, useRef } from "react";
import { useAppStore, useCurrentOrgUser, findUser } from "@/lib/store";
import { emitNotification } from "@/lib/api/notificationEngine";

export function NotificationBridge() {
  const tickets = useAppStore((s) => s.tickets);
  const me = useCurrentOrgUser();
  const userId = me?.id ?? "anon";

  // Track last seen state per ticket id
  const lastSeen = useRef<Map<string, { msgCount: number; sla: string; assignee?: string }>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    if (!me) return;

    // First pass: just record state, don't fire (avoids notifying on initial load)
    if (!initialized.current) {
      tickets.forEach((t) => {
        lastSeen.current.set(t.id, {
          msgCount: t.messages.length,
          sla: t.slaState,
          assignee: t.assigneeId,
        });
      });
      initialized.current = true;
      return;
    }

    tickets.forEach((t) => {
      const prev = lastSeen.current.get(t.id);
      const requester = findUser(t.requesterId);

      // New ticket arrival
      if (!prev) {
        lastSeen.current.set(t.id, {
          msgCount: t.messages.length,
          sla: t.slaState,
          assignee: t.assigneeId,
        });
        return;
      }

      // New requester message (skip if I authored the latest)
      if (t.messages.length > prev.msgCount) {
        const latest = t.messages[t.messages.length - 1];
        if (latest && latest.authorRole === "requester" && latest.authorId !== me.id) {
          emitNotification({
            userId,
            event: t.assigneeId === me.id ? "ticket_updated" : "ticket_mentioned",
            title: `New reply · ${t.number}`,
            body: `${requester?.name ?? "Customer"}: ${latest.body.slice(0, 120)}`,
            tag: `ticket:${t.id}`,
          });
        }
      }

      // SLA transition
      if (t.slaState !== prev.sla) {
        if (t.slaState === "at_risk") {
          emitNotification({
            userId,
            event: "sla_breach_warning",
            title: `SLA at risk · ${t.number}`,
            body: t.title,
            tag: `sla:${t.id}`,
          });
        } else if (t.slaState === "breached") {
          emitNotification({
            userId,
            event: "sla_breached",
            title: `SLA breached · ${t.number}`,
            body: t.title,
            tag: `sla:${t.id}`,
          });
        }
      }

      // Assigned to me
      if (t.assigneeId !== prev.assignee && t.assigneeId === me.id) {
        emitNotification({
          userId,
          event: "ticket_assigned",
          title: `Assigned to you · ${t.number}`,
          body: t.title,
          tag: `assign:${t.id}`,
        });
      }

      lastSeen.current.set(t.id, {
        msgCount: t.messages.length,
        sla: t.slaState,
        assignee: t.assigneeId,
      });
    });
  }, [tickets, me, userId]);

  return null;
}
