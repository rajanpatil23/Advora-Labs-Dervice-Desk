import { useAppStore, findUser, useOrgCatalog } from "@/lib/store";
import { Avatar } from "@/components/common/Chips";
import { timeAgo } from "@/lib/format";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const statusChip: Record<string,string> = {
  submitted: "bg-info/10 text-info",
  approval: "bg-warning/10 text-warning",
  fulfilling: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export default function Requests() {
  const { requests, addServiceRequest, advanceServiceRequest } = useAppStore();
  const catalog = useOrgCatalog();
  const { hasRole } = useAuth();
  const canAdvance = hasRole("owner", "admin", "manager", "agent");

  const requestItem = (item: typeof catalog[number]) => {
    const sr = addServiceRequest(item.id);
    toast.success(`Request submitted as ${sr.number}`, { description: `Est. delivery: ${item.estimate}` });
  };
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Service Catalog</div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Service Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse the catalog or track active requests.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map(item => {
            const Icon = (Icons as any)[item.icon] ?? Icons.Package;
            return (
              <button key={item.id} onClick={() => requestItem(item)} className="group panel-elev p-5 text-left hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-primary/15 text-primary flex items-center justify-center group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.catalog}</div>
                </div>
                <div className="mt-3 font-display font-semibold">{item.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                <div className="mt-4 text-[11px] text-muted-foreground">Est. delivery · <span className="text-foreground font-medium">{item.estimate}</span></div>
              </button>
            );
          })}
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-display font-semibold">Active requests ({requests.length})</div>
          {requests.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No active requests.</div>
          ) : (
            <div className="divide-y divide-border">
              {requests.map(r => {
                const u = findUser(r.requesterId);
                return (
                  <div key={r.id} className="px-5 py-4 hover:bg-surface-2/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-mono text-muted-foreground w-20 shrink-0">{r.number}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{r.itemTitle}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          {u && <Avatar initials={u.initials} color={u.avatarColor} size={16} />}
                          <span>{u?.name ?? "Unknown"}</span>
                          <span>·</span>
                          <span>Approver: {r.approver}</span>
                        </div>
                      </div>
                      <span className={cn("text-[11px] font-medium capitalize px-2 py-0.5 rounded", statusChip[r.status])}>{r.status}</span>
                      <div className="text-xs text-muted-foreground w-20 text-right shrink-0">{timeAgo(r.updatedAt)}</div>
                      {canAdvance && r.status !== "completed" && r.status !== "rejected" && (
                        <button
                          onClick={() => { advanceServiceRequest(r.id); toast.success("Request advanced"); }}
                          className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary font-semibold"
                        >Advance →</button>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {r.steps.map((s, i) => (
                        <div key={i} className="flex-1">
                          <div className={cn("h-1 rounded-full",
                            s.status === "done" ? "bg-gradient-primary" :
                            s.status === "current" ? "bg-warning" : "bg-surface-2")} />
                          <div className={cn("text-[10px] mt-1 uppercase tracking-wider",
                            s.status === "done" ? "text-primary" :
                            s.status === "current" ? "text-warning" : "text-muted-foreground")}>{s.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
