import { useAppStore, findAgent } from "@/lib/store";
import { Avatar } from "@/components/common/Chips";
import { timeAgo } from "@/lib/format";
import { AlertOctagon, Activity, ShieldAlert, Layers, Server } from "lucide-react";
import { NewIncidentDialog } from "@/components/dialogs/NewIncidentDialog";
import { toast } from "sonner";
import type { Incident } from "@/lib/types";

const sevColors: Record<number, string> = { 1: "bg-destructive text-destructive-foreground", 2: "bg-accent text-accent-foreground", 3: "bg-warning text-warning-foreground", 4: "bg-info text-info-foreground" };
const statusColor: Record<string,string> = { investigating: "bg-destructive/10 text-destructive", identified: "bg-warning/10 text-warning", monitoring: "bg-info/10 text-info", resolved: "bg-success/10 text-success" };
const statusOrder: Incident["status"][] = ["investigating", "identified", "monitoring", "resolved"];

export default function Incidents() {
  const { incidents, setIncidentStatus } = useAppStore();
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        <Header />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={AlertOctagon} label="Active incidents" value={incidents.filter(i => i.status !== "resolved").length} tone="destructive" />
          <Stat icon={Activity} label="Investigating" value={incidents.filter(i => i.status === "investigating").length} tone="warning" />
          <Stat icon={Layers} label="Monitoring" value={incidents.filter(i => i.status === "monitoring").length} tone="info" />
          <Stat icon={ShieldAlert} label="Severity 1" value={incidents.filter(i => i.severity === 1).length} tone="accent" />
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="font-display font-semibold">Active incidents</div>
            <NewIncidentDialog
              trigger={
                <button className="text-xs px-3 py-1.5 rounded-lg bg-gradient-primary text-primary-foreground font-semibold">+ New incident</button>
              }
            />
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface-2/50">
              <tr>
                <th className="text-left px-5 py-3">Incident</th>
                <th className="text-left py-3">Service</th>
                <th className="text-left py-3">Severity</th>
                <th className="text-left py-3">Status</th>
                <th className="text-left py-3">Owner</th>
                <th className="text-left py-3">Affected</th>
                <th className="text-left py-3 pr-5">Updated</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(i => {
                const owner = findAgent(i.ownerId);
                return (
                  <tr key={i.id} onClick={() => toast.message(`${i.number} · ${i.title}`, { description: `${i.service} · SEV ${i.severity} · ${i.status}` })}
                    className="border-t border-border hover:bg-surface-2/40 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="font-mono text-[10px] text-muted-foreground">{i.number}</div>
                      <div className="font-medium">{i.title}</div>
                    </td>
                    <td className="py-3 text-xs flex items-center gap-1.5"><Server className="h-3 w-3 text-muted-foreground" /> {i.service}</td>
                    <td className="py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sevColors[i.severity]}`}>SEV {i.severity}</span></td>
                    <td className="py-3"><span className={`text-[10px] capitalize font-medium px-2 py-0.5 rounded ${statusColor[i.status]}`}>{i.status}</span></td>
                    <td className="py-3">{owner && <div className="flex items-center gap-2"><Avatar initials={owner.initials} color={owner.avatarColor} size={22} /><span className="text-xs">{owner.name}</span></div>}</td>
                    <td className="py-3 text-xs tabular-nums">{i.affected.toLocaleString()}</td>
                    <td className="py-3 pr-5 text-xs text-muted-foreground">{timeAgo(i.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Incident Management</div>
      <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Incidents</h1>
      <p className="text-sm text-muted-foreground mt-1">Coordinate response, escalations, and resolution.</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: any) {
  return (
    <div className="panel p-5">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-${tone}/10 text-${tone}`}><Icon className="h-4.5 w-4.5" /></div>
      <div className="mt-3 text-2xl font-display font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
