import { agents } from "@/lib/mockData";
import { Avatar } from "@/components/common/Chips";
import { Star, Mail, Trophy } from "lucide-react";

export default function AgentsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Team</div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">Workload, performance and availability.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map(a => (
            <div key={a.id} className="panel-elev p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-primary opacity-10 blur-2xl pointer-events-none" />
              <div className="flex items-start gap-3">
                <Avatar initials={a.initials} color={a.avatarColor} size={48} online={a.online} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display font-semibold truncate">{a.name}</div>
                    {a.role === "admin" && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold">Admin</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {a.email}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{a.team}</div>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-warning">
                  <Star className="h-3.5 w-3.5 fill-warning" /> {a.rating}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat label="Workload" value={a.workload} />
                <Stat label="Resolved" value={a.resolved} />
                <Stat label="Avg" value={`${a.avgResolution}h`} />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Capacity</span>
                  <span>{Math.min(100, a.workload * 5)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${Math.min(100, a.workload * 5)}%` }} />
                </div>
              </div>

              {a.resolved > 250 && (
                <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                  <Trophy className="h-3 w-3" /> Top performer
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
      <div className="text-sm font-display font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
