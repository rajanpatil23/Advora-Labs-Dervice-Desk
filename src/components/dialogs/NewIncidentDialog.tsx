import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore, useOrgAgents } from "@/lib/store";
import { toast } from "sonner";

interface Props { trigger: React.ReactNode; }

const services = ["Auth Service", "Database", "CDN", "Email Gateway", "Payment API", "Core API", "Storage"];

export function NewIncidentDialog({ trigger }: Props) {
  const addIncident = useAppStore(s => s.addIncident);
  const orgAgents = useOrgAgents();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [service, setService] = useState(services[0]);
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4>(3);
  const [ownerId, setOwnerId] = useState("");
  const [affected, setAffected] = useState(100);

  useEffect(() => { if (open) setOwnerId(orgAgents[0]?.id ?? ""); }, [open, orgAgents]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Please add a title"); return; }
    if (!ownerId) { toast.error("Pick an owner"); return; }
    const inc = addIncident({ title: title.trim(), service, severity, ownerId, affected });
    toast.success(`Incident ${inc.number} opened`);
    setOpen(false); setTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>Open new incident</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              placeholder="What's happening?"
              className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Service</label>
              <select value={service} onChange={e => setService(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-border text-sm">
                {services.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Severity</label>
              <select value={severity} onChange={e => setSeverity(Number(e.target.value) as 1 | 2 | 3 | 4)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-border text-sm">
                <option value={1}>SEV 1 — Critical</option><option value={2}>SEV 2 — High</option>
                <option value={3}>SEV 3 — Medium</option><option value={4}>SEV 4 — Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Owner</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-border text-sm">
                {orgAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Affected users</label>
              <input type="number" min={0} value={affected} onChange={e => setAffected(Number(e.target.value))}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-border text-sm" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Open incident</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
