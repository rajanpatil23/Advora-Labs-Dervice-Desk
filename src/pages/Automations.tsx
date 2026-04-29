import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Zap, Plus, Trash2, Play, ChevronRight, Workflow, CheckCircle2, XCircle, MinusCircle,
  Copy, ArrowUp, ArrowDown, Sparkles,
} from "lucide-react";
import {
  ACTION_OPTIONS, CONDITION_FIELDS, CONDITION_OPS, TRIGGER_OPTIONS,
  automationsApi, type Action, type Condition, type Rule, type RunLog,
} from "@/lib/api/automations";
import { RULE_TEMPLATES } from "@/lib/api/automationTemplates";
import { FlowPreview } from "@/components/automations/FlowPreview";

export default function Automations() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin" || role === "manager";

  const [state, setState] = useState(automationsApi.get());
  const [editing, setEditing] = useState<Rule | null>(null);

  const refresh = () => setState(automationsApi.get());
  useEffect(() => { refresh(); }, []);

  if (!allowed) return <Navigate to="/app" replace />;

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
            <p className="text-sm text-muted-foreground">If-this-then-that rules to route, escalate, and notify automatically.</p>
          </div>
        </div>
        <Button onClick={() => setEditing(automationsApi.newRule())}>
          <Plus className="h-4 w-4 mr-1" /> New rule
        </Button>
      </header>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules ({state.rules.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="runs">Recent runs</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-3">
          {state.rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Workflow className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No automation rules yet. Create your first one or start from a template.</p>
              </CardContent>
            </Card>
          ) : (
            state.rules.map((rule, idx) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                index={idx}
                total={state.rules.length}
                onEdit={() => setEditing({ ...rule })}
                onChanged={refresh}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {RULE_TEMPLATES.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{tpl.category}</Badge>
                </div>
                <CardDescription className="text-xs">{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const created = automationsApi.createFromTemplate(tpl.build());
                    toast.success("Rule created from template");
                    refresh();
                    setEditing({ ...created });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Use template
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>Run history</CardTitle>
              <CardDescription>Last 100 executions across all rules.</CardDescription>
            </CardHeader>
            <CardContent>
              {state.logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No runs yet. Test a rule to generate sample logs.</p>
              ) : (
                <div className="space-y-2">
                  {state.logs.map(log => <RunLogRow key={log.id} log={log} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RuleEditor rule={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </div>
  );
}

function RuleRow({ rule, index, total, onEdit, onChanged }: { rule: Rule; index: number; total: number; onEdit: () => void; onChanged: () => void }) {
  const triggerLabel = TRIGGER_OPTIONS.find(t => t.value === rule.trigger)?.label ?? rule.trigger;
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex flex-col -my-1">
          <button
            className="h-5 w-5 rounded hover:bg-muted disabled:opacity-30 flex items-center justify-center"
            disabled={index === 0}
            onClick={() => { automationsApi.moveRule(rule.id, "up"); onChanged(); }}
            title="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            className="h-5 w-5 rounded hover:bg-muted disabled:opacity-30 flex items-center justify-center"
            disabled={index === total - 1}
            onClick={() => { automationsApi.moveRule(rule.id, "down"); onChanged(); }}
            title="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
        <Switch checked={rule.enabled} onCheckedChange={() => { automationsApi.toggleRule(rule.id); onChanged(); }} />
        <button onClick={onEdit} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{rule.name || "Untitled rule"}</span>
            {!rule.enabled && <Badge variant="outline" className="text-xs">paused</Badge>}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{triggerLabel}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}</span>
          </div>
        </button>
        <div className="hidden md:block text-right text-xs text-muted-foreground">
          <div className="font-mono">{rule.runCount} runs</div>
          {rule.lastRunAt && <div>Last: {new Date(rule.lastRunAt).toLocaleString()}</div>}
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const log = automationsApi.runTest(rule.id);
          if (log) toast.success(`Test: ${log.outcome}`, { description: log.detail });
          onChanged();
        }}>
          <Play className="h-3.5 w-3.5 mr-1" /> Test
        </Button>
        <Button variant="ghost" size="icon" title="Duplicate" onClick={() => { automationsApi.duplicateRule(rule.id); toast.success("Rule duplicated"); onChanged(); }}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Delete" onClick={() => { automationsApi.deleteRule(rule.id); onChanged(); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function RunLogRow({ log }: { log: RunLog }) {
  const icon = log.outcome === "matched"
    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
    : log.outcome === "skipped"
      ? <MinusCircle className="h-4 w-4 text-muted-foreground" />
      : <XCircle className="h-4 w-4 text-destructive" />;
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{log.ruleName}</p>
        <p className="text-xs text-muted-foreground">{log.detail}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.at).toLocaleString()}</span>
    </div>
  );
}

function RuleEditor({ rule, onClose, onSaved }: { rule: Rule | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Rule | null>(rule);
  useEffect(() => { setDraft(rule); }, [rule]);

  if (!draft) return null;

  const update = (patch: Partial<Rule>) => setDraft({ ...draft, ...patch });

  const addCondition = () => update({
    conditions: [...draft.conditions, { id: crypto.randomUUID(), field: "priority", op: "equals", value: "" }],
  });
  const updateCondition = (id: string, patch: Partial<Condition>) =>
    update({ conditions: draft.conditions.map(c => c.id === id ? { ...c, ...patch } : c) });
  const removeCondition = (id: string) =>
    update({ conditions: draft.conditions.filter(c => c.id !== id) });

  const addAction = () => update({
    actions: [...draft.actions, { id: crypto.randomUUID(), type: "assign_agent", value: "" }],
  });
  const updateAction = (id: string, patch: Partial<Action>) =>
    update({ actions: draft.actions.map(a => a.id === id ? { ...a, ...patch } : a) });
  const removeAction = (id: string) =>
    update({ actions: draft.actions.filter(a => a.id !== id) });

  const save = () => {
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    if (draft.actions.length === 0) { toast.error("At least one action is required"); return; }
    automationsApi.saveRule(draft);
    toast.success("Rule saved");
    onSaved(); onClose();
  };

  return (
    <Sheet open={!!rule} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{rule?.runCount ? "Edit rule" : "New rule"}</SheetTitle>
          <SheetDescription>Trigger → optional conditions → one or more actions.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="Auto-assign urgent tickets" />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={draft.description ?? ""} onChange={(e) => update({ description: e.target.value })} placeholder="What this rule does" />
          </div>

          {/* Live flow preview */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Flow preview</Label>
            <FlowPreview rule={draft} />
          </div>

          {/* Trigger */}
          <Section step="1" title="When">
            <Select value={draft.trigger} onValueChange={(v) => update({ trigger: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Section>

          {/* Conditions */}
          <Section
            step="2"
            title="If"
            extra={
              draft.conditions.length > 1 && (
                <Select value={draft.matchAll ? "all" : "any"} onValueChange={(v) => update({ matchAll: v === "all" })}>
                  <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Match ALL</SelectItem>
                    <SelectItem value="any">Match ANY</SelectItem>
                  </SelectContent>
                </Select>
              )
            }
          >
            <div className="space-y-2">
              {draft.conditions.map(c => (
                <div key={c.id} className="grid grid-cols-12 gap-2 items-center">
                  <Select value={c.field} onValueChange={(v) => updateCondition(c.id, { field: v as any })}>
                    <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={c.op} onValueChange={(v) => updateCondition(c.id, { op: v as any })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    className="col-span-4"
                    value={c.value}
                    onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                    placeholder={c.op === "in" ? "value1,value2" : "value"}
                  />
                  <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeCondition(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add condition
              </Button>
              {draft.conditions.length === 0 && (
                <p className="text-xs text-muted-foreground">No conditions — rule will run on every trigger event.</p>
              )}
            </div>
          </Section>

          {/* Actions */}
          <Section step="3" title="Then">
            <div className="space-y-2">
              {draft.actions.map(a => {
                const opt = ACTION_OPTIONS.find(o => o.value === a.type);
                return (
                  <div key={a.id} className="grid grid-cols-12 gap-2 items-center">
                    <Select value={a.type} onValueChange={(v) => updateAction(a.id, { type: v as any })}>
                      <SelectTrigger className="col-span-5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-6"
                      value={a.value}
                      onChange={(e) => updateAction(a.id, { value: e.target.value })}
                      placeholder={opt?.placeholder}
                    />
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeAction(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add action
              </Button>
            </div>
          </Section>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">Enabled</p>
              <p className="text-xs text-muted-foreground">Active rules run on matching events.</p>
            </div>
            <Switch checked={draft.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save rule</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Section({ step, title, extra, children }: { step: string; title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">{step}</span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}
