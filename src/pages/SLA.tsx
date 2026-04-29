import { useState } from "react";
import { useAppStore, useOrgSlaPolicies } from "@/lib/store";
import { PriorityChip } from "@/components/common/Chips";
import { Timer, AlertTriangle, CheckCircle2, Pencil, Trash2, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Priority, SlaPolicy } from "@/lib/types";

export default function SLA() {
  const { tickets } = useAppStore();
  const policies = useOrgSlaPolicies();
  const { addSlaPolicy, updateSlaPolicy, toggleSlaActive, deleteSlaPolicy } = useAppStore();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "admin", "manager");

  const onTrack = tickets.filter(t => t.slaState === "on_track").length;
  const atRisk = tickets.filter(t => t.slaState === "at_risk").length;
  const breached = tickets.filter(t => t.slaState === "breached").length;
  const compliance = tickets.length ? Math.round(((tickets.length - breached) / tickets.length) * 100) : 100;

  const [editing, setEditing] = useState<Partial<SlaPolicy> | null>(null);

  const startNew = () => setEditing({ name: "", priority: "medium", responseMins: 60, resolutionMins: 720 });
  const startEdit = (p: SlaPolicy) => setEditing({ ...p });

  const save = () => {
    if (!editing?.name?.trim()) return toast.error("Policy name is required");
    if (!editing.responseMins || !editing.resolutionMins) return toast.error("Targets must be > 0");
    if (editing.id) {
      updateSlaPolicy(editing.id, {
        name: editing.name!, priority: editing.priority as Priority,
        responseMins: Number(editing.responseMins), resolutionMins: Number(editing.resolutionMins),
      });
      toast.success("Policy updated");
    } else {
      addSlaPolicy({
        name: editing.name!, priority: (editing.priority as Priority) ?? "medium",
        responseMins: Number(editing.responseMins), resolutionMins: Number(editing.resolutionMins),
      });
      toast.success("Policy created");
    }
    setEditing(null);
  };

  const remove = (p: SlaPolicy) => {
    if (!confirm(`Delete policy "${p.name}"?`)) return;
    deleteSlaPolicy(p.id);
    toast.success("Policy deleted");
  };

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
            {canEdit && (
              <button onClick={startNew} className="text-xs px-3 py-1.5 rounded-lg bg-gradient-primary text-primary-foreground font-semibold flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New policy
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface-2/50">
              <tr>
                <th className="text-left px-5 py-3">Policy</th>
                <th className="text-left py-3">Priority</th>
                <th className="text-left py-3">Response target</th>
                <th className="text-left py-3">Resolution target</th>
                <th className="text-left py-3">Status</th>
                {canEdit && <th className="text-right py-3 pr-5">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 && (
                <tr><td colSpan={canEdit ? 6 : 5} className="px-5 py-8 text-center text-muted-foreground text-xs">No SLA policies yet.</td></tr>
              )}
              {policies.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-2/40">
                  <td className="px-5 py-4 font-medium">{p.name}</td>
                  <td className="py-4"><PriorityChip priority={p.priority} /></td>
                  <td className="py-4 text-xs font-mono">{fmt(p.responseMins)}</td>
                  <td className="py-4 text-xs font-mono">{fmt(p.resolutionMins)}</td>
                  <td className="py-4">
                    <button
                      disabled={!canEdit}
                      onClick={() => { toggleSlaActive(p.id); toast.success(p.active ? "Policy disabled" : "Policy enabled"); }}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${p.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"} ${canEdit ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  {canEdit && (
                    <td className="py-4 pr-5 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => startEdit(p)} className="h-7 w-7 rounded-md hover:bg-surface-2 flex items-center justify-center" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove(p)} className="h-7 w-7 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="panel p-5 space-y-3">
            <div className="font-display font-semibold">{editing.id ? "Edit policy" : "New policy"}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Name">
                <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm" />
              </Field>
              <Field label="Priority">
                <select value={editing.priority ?? "medium"} onChange={(e) => setEditing({ ...editing, priority: e.target.value as Priority })}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-sm">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </Field>
              <Field label="Response target (minutes)">
                <input type="number" min={1} value={editing.responseMins ?? 60} onChange={(e) => setEditing({ ...editing, responseMins: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm" />
              </Field>
              <Field label="Resolution target (minutes)">
                <input type="number" min={1} value={editing.resolutionMins ?? 720} onChange={(e) => setEditing({ ...editing, resolutionMins: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm" />
              </Field>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="h-9 px-4 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"><Save className="h-4 w-4" /> Save</button>
              <button onClick={() => setEditing(null)} className="h-9 px-4 rounded-lg bg-surface-2 text-sm flex items-center gap-2"><X className="h-4 w-4" /> Cancel</button>
            </div>
          </div>
        )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
