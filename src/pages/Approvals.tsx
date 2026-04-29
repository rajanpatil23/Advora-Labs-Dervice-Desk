import { useMemo, useState } from "react";
import { useAppStore, findUser } from "@/lib/store";
import { Avatar } from "@/components/common/Chips";
import { timeAgo } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Check, X, Inbox, Clock, FileText, ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "pending" | "approved" | "rejected";

export default function Approvals() {
  const { hasRole } = useAuth();
  const canApprove = hasRole("owner", "admin", "manager");
  const { requests, approveServiceRequest, rejectServiceRequest } = useAppStore();
  const [tab, setTab] = useState<Tab>("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!canApprove) return <Navigate to="/app" replace />;

  const buckets = useMemo(() => ({
    pending: requests.filter((r) => r.status === "submitted" || r.status === "approval"),
    approved: requests.filter((r) => r.status === "fulfilling" || r.status === "completed"),
    rejected: requests.filter((r) => r.status === "rejected"),
  }), [requests]);

  const list = buckets[tab];

  const onApprove = (id: string, num: string) => {
    approveServiceRequest(id);
    toast.success(`Approved ${num}`, { description: "Routed to fulfillment." });
  };
  const onReject = (id: string, num: string) => {
    rejectServiceRequest(id, reason.trim() || undefined);
    setRejectingId(null);
    setReason("");
    toast(`Rejected ${num}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Approvals
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Approval inbox</h1>
            <p className="text-sm text-muted-foreground mt-1">Review service requests pending your decision. All actions are logged to the audit trail.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            <Stat tone="warning" label="Pending"  value={buckets.pending.length} />
            <Stat tone="success" label="Approved" value={buckets.approved.length} />
            <Stat tone="muted"   label="Rejected" value={buckets.rejected.length} />
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 h-10 text-sm font-medium border-b-2 -mb-px capitalize transition-colors",
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t} <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">({buckets[t].length})</span>
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="panel p-12 text-center">
            <div className="h-12 w-12 mx-auto rounded-xl bg-surface-2 flex items-center justify-center text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </div>
            <div className="mt-3 font-display font-semibold">Nothing here</div>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "pending" ? "You're all caught up — no requests waiting for approval." : `No ${tab} requests yet.`}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => {
              const u = findUser(r.requesterId);
              const isRejecting = rejectingId === r.id;
              return (
                <li key={r.id} className="panel-elev overflow-hidden">
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{r.number}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(r.updatedAt)}</span>
                      </div>
                      <div className="font-medium text-sm mt-0.5 truncate">{r.itemTitle}</div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        {u && <Avatar initials={u.initials} color={u.avatarColor} size={18} />}
                        <span className="truncate">{u?.name ?? "Unknown requester"}</span>
                        {r.approver && tab !== "pending" && (
                          <>
                            <span>·</span>
                            <span className="truncate">decided by <span className="text-foreground/80">{r.approver}</span></span>
                          </>
                        )}
                      </div>
                    </div>
                    {tab === "pending" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setRejectingId(isRejecting ? null : r.id)}
                          className="h-9 px-3 rounded-lg text-sm font-medium bg-surface border border-border hover:border-destructive/40 hover:text-destructive transition-colors flex items-center gap-1.5"
                        >
                          <X className="h-4 w-4" /> Reject
                        </button>
                        <button
                          onClick={() => onApprove(r.id, r.number)}
                          className="h-9 px-3 rounded-lg text-sm font-semibold bg-success/15 text-success border border-success/30 hover:bg-success/25 transition-colors flex items-center gap-1.5"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </button>
                      </div>
                    ) : (
                      <span className={cn(
                        "text-[11px] font-medium capitalize px-2.5 py-1 rounded-full border",
                        r.status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-success/10 text-success border-success/30"
                      )}>{r.status}</span>
                    )}
                  </div>
                  {isRejecting && (
                    <div className="border-t border-border bg-surface/40 px-5 py-3 flex items-center gap-2">
                      <input
                        autoFocus
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:border-ring"
                        onKeyDown={(e) => e.key === "Enter" && onReject(r.id, r.number)}
                      />
                      <button onClick={() => { setRejectingId(null); setReason(""); }} className="h-9 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                      <button onClick={() => onReject(r.id, r.number)} className="h-9 px-3 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:opacity-90">Confirm reject</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "warning" | "success" | "muted" }) {
  const cls = tone === "warning" ? "text-warning bg-warning/10 border-warning/30"
            : tone === "success" ? "text-success bg-success/10 border-success/30"
            : "text-muted-foreground bg-surface border-border";
  return (
    <div className={cn("rounded-xl border px-3 py-2 text-center", cls)}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-xl font-display font-bold tabular-nums leading-tight">{value}</div>
    </div>
  );
}
