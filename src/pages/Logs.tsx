import { useState } from "react";
import { logs } from "@/lib/mockData";
import { timeAgo } from "@/lib/format";
import { Filter } from "lucide-react";

const typeColor: Record<string, string> = {
  ticket: "bg-primary/10 text-primary",
  incident: "bg-destructive/10 text-destructive",
  user: "bg-info/10 text-info",
  sla: "bg-warning/10 text-warning",
  system: "bg-muted text-muted-foreground",
};

export default function Logs() {
  const [filter, setFilter] = useState("all");
  const list = filter === "all" ? logs : logs.filter(l => l.type === filter);
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Audit</div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Activity Logs</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {["all","ticket","incident","user","sla","system"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground/70 hover:bg-muted"}`}
            >{f}</button>
          ))}
          <button className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-surface-2 flex items-center gap-1.5"><Filter className="h-3 w-3" /> More filters</button>
        </div>

        <div className="panel overflow-hidden">
          <div className="divide-y divide-border">
            {list.map(l => (
              <div key={l.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2/40 transition-colors">
                <div className="text-xs font-mono text-muted-foreground w-32 shrink-0">{timeAgo(l.at)}</div>
                <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded ${typeColor[l.type]}`}>{l.type}</span>
                <div className="flex-1 text-sm">
                  <span className="font-semibold">{l.actor}</span> <span className="text-muted-foreground">{l.action}</span> <span className="font-mono text-xs">{l.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
