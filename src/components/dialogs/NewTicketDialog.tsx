import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore, useOrgAgents, useOrgCustomers, useOrgSettings, useCurrentOrgUser } from "@/lib/store";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Priority } from "@/lib/types";

interface Props {
  trigger: React.ReactNode;
  onCreated?: (id: string) => void;
}

export function NewTicketDialog({ trigger, onCreated }: Props) {
  const addTicket = useAppStore(s => s.addTicket);
  const orgAgents = useOrgAgents();
  const orgCustomers = useOrgCustomers();
  const settings = useOrgSettings();
  const me = useCurrentOrgUser();
  const isRequester = me?.role === "requester";
  const nav = useNavigate();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requesterId, setRequesterId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState<string>("");

  // (Re)initialize defaults when dialog opens or org changes
  useEffect(() => {
    if (!open) return;
    const defaultRequester = isRequester
      ? (me?.id ?? orgCustomers[0]?.id ?? "")
      : (orgCustomers[0]?.id ?? "");
    setRequesterId(defaultRequester);
    setAssigneeId(orgAgents[0]?.id ?? "");
    setCategory(settings.categories[0] ?? "General");
  }, [open, orgCustomers, orgAgents, settings.categories, isRequester, me?.id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Please add a title"); return; }
    if (!requesterId) { toast.error("Pick a requester"); return; }
    const t = addTicket({
      title: title.trim(),
      description,
      requesterId,
      assigneeId: assigneeId || undefined,
      priority,
      category: category || (settings.categories[0] ?? "General"),
    });
    toast.success(`Ticket ${t.number} created`);
    setOpen(false);
    setTitle(""); setDescription("");
    onCreated?.(t.id);
    nav("/app/tickets");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create new ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Title">
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              placeholder="Briefly describe the issue…"
              className="w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm" />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="More details…"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm resize-none" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Requester">
              {isRequester ? (
                <input
                  disabled
                  value={me?.name ?? "You"}
                  className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-border text-sm text-muted-foreground"
                />
              ) : (
                <Select value={requesterId} onChange={setRequesterId}
                  options={orgCustomers.map(c => [c.id, c.name] as [string, string])} />
              )}
            </Field>
            <Field label="Assignee">
              <Select value={assigneeId} onChange={setAssigneeId}
                options={[["", "— Unassigned —"], ...orgAgents.map(a => [a.id, a.name] as [string, string])]} />
            </Field>
            <Field label="Priority">
              <Select value={priority} onChange={(v) => setPriority(v as Priority)}
                options={[["low", "Low"], ["medium", "Medium"], ["high", "High"], ["critical", "Critical"]]} />
            </Field>
            <Field label="Category">
              <Select value={category} onChange={setCategory}
                options={(settings.categories.length ? settings.categories : ["General"]).map(c => [c, c] as [string, string])} />
            </Field>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Create ticket</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
