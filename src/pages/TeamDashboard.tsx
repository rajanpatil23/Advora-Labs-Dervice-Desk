import { useMemo } from "react";
import { Link } from "react-router-dom";
import { UsersRound, ArrowRight, TrendingUp, Clock, AlertTriangle, CheckSquare } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Manager landing page - team-scoped overview.
 * Phase 7 will expand this with workload balancing, drag-drop reassign, team reports.
 */
export default function TeamDashboard() {
  const { tickets, orgAgents } = useAppStore();
  const { user, currentMembership } = useAuth();

  const teamMembers = useMemo(() => {
    if (!currentMembership?.team_name) return orgAgents;
    const filtered = orgAgents.filter((u) => u.team === currentMembership.team_name);
    return filtered.length > 0 ? filtered : orgAgents;
  }, [orgAgents, currentMembership]);

  const teamTickets = useMemo(() => {
    const ids = new Set(teamMembers.map((m) => m.id));
    return tickets.filter((t) => t.assigneeId && ids.has(t.assigneeId));
  }, [tickets, teamMembers]);

  const open = teamTickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const atRisk = open.filter((t) => t.slaState === "at_risk" || t.slaState === "breached");

  const workload = teamMembers
    .map((m) => ({ member: m, count: open.filter((t) => t.assigneeId === m.id).length }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5" /> Team
          </div>
          <h1 className="font-display font-bold text-3xl mt-1">
            {currentMembership?.team_name ?? "Your team"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hi {user?.full_name?.split(" ")[0]}, here's how your team is doing today.
          </p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Team members" value={teamMembers.length} icon={UsersRound} />
          <Stat label="Open tickets" value={open.length} icon={CheckSquare} />
          <Stat label="At risk" value={atRisk.length} icon={Clock} tone="warn" />
          <Stat label="Breached" value={atRisk.filter((t) => t.slaState === "breached").length} icon={AlertTriangle} tone="danger" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Workload
              </h2>
              <Link to="/app/users" className="text-xs text-primary hover:underline">Manage team</Link>
            </div>
            <div className="space-y-2.5">
              {workload.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
              {workload.map(({ member, count }) => {
                const max = Math.max(...workload.map((w) => w.count), 1);
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0" style={{ background: member.avatarColor }}>
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between text-xs mb-1">
                        <span className="font-medium truncate">{member.name}</span>
                        <span className="tabular-nums text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full bg-gradient-primary" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Needs attention
              </h2>
              <Link to="/app/tickets" className="text-xs text-primary hover:underline flex items-center gap-1">
                All tickets <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {atRisk.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nothing at risk. Nice work 🎉</p>
              ) : (
                atRisk.slice(0, 6).map((t) => (
                  <Link key={t.id} to={`/app/tickets?ticket=${t.id}`} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors group">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", t.slaState === "breached" ? "bg-destructive" : "bg-amber-500")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground font-mono">{t.number}</div>
                      <div className="text-sm truncate">{t.title}</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone = "default" }: { label: string; value: number; icon: typeof UsersRound; tone?: "default" | "warn" | "danger" }) {
  const toneCls = {
    default: "border-border bg-surface",
    warn: "border-amber-500/20 bg-amber-500/5",
    danger: "border-destructive/20 bg-destructive/5",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-4", toneCls)}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={cn("h-4 w-4", tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-destructive" : "text-muted-foreground")} />
      </div>
      <div className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
