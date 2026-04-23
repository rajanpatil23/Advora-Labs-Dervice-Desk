import { slaPolicies } from "@/lib/mockData";
import { useAppStore } from "@/lib/store";
import { PriorityChip } from "@/components/common/Chips";
import { Timer, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function SLA() {
  const { tickets } = useAppStore();
  const onTrack = tickets.filter(t => t.slaState === "on_track").length;
  const atRisk = tickets.filter(t => t.slaState === "at_risk").length;
  const breached = tickets.filter(t => t.slaState === "breached").length;
  const compliance = Math.round(((tickets.length - breached) / tickets.length) * 100);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Service Levels</div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">SLA Management</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Big icon={Timer} label="Compliance" value={`${compliance}%`} tone="primary" />
          <Big icon={CheckCircle2} label="On track" value={onTrack} tone="success" />
          <Big icon={AlertTriangle} label="At risk" value={atRisk} tone="warning" />
          <Big icon={AlertTriangle} label="Breached" value={breached} tone="destructive" />
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="font-display font-semibold">SLA Policies</div>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-gradient-primary text-primary-foreground font-semibold">+ New policy</button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface-2/50">
              <tr>
                <th className="text-left px-5 py-3">Policy</th>
                <th className="text-left py-3">Priority</th>
                <th className="text-left py-3">Response target</th>
                <th className="text-left py-3">Resolution target</th>
                <th className="text-left py-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {slaPolicies.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-2/40">
                  <td className="px-5 py-4 font-medium">{p.name}</td>
                  <td className="py-4"><PriorityChip priority={p.priority} /></td>
                  <td className="py-4 text-xs font-mono">{fmt(p.responseMins)}</td>
                  <td className="py-4 text-xs font-mono">{fmt(p.resolutionMins)}</td>
                  <td className="py-4 pr-5"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-success/15 text-success">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function fmt(m: number) {
  if (m < 60) return `${m}m`;
  const h = m / 60;
  if (h < 24) return `${h}h`;
  return `${Math.round(h/24)}d`;
}

function Big({ icon: Icon, label, value, tone }: any) {
  return (
    <div className="panel p-5">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-${tone}/10 text-${tone}`}><Icon className="h-4.5 w-4.5" /></div>
      <div className="mt-3 text-3xl font-display font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
