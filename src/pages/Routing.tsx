import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  listRules, saveRules, listSkills, setSkillsFor, getSkillsFor,
  bulkRoute, routeTicket, type RoutingRule, type RoutingDecision,
} from "@/lib/api/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Route, Settings2, Users, Sparkles, ChevronRight, Plus, Trash2, X,
  Activity, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import type { Priority } from "@/lib/types";

const STRATEGIES = [
  { value: "least_busy", label: "Least busy" },
  { value: "round_robin", label: "Round-robin" },
  { value: "highest_rated", label: "Highest rated" },
  { value: "fastest_resolver", label: "Fastest resolver" },
] as const;

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export default function Routing() {
  const tickets = useAppStore(s => s.tickets);
  const agents = useAppStore(s => s.orgAgents);
  const [rules, setRules] = useState<RoutingRule[]>(() => listRules());
  const [decisions, setDecisions] = useState<RoutingDecision[]>([]);
  const [tick, setTick] = useState(0); // bump to refresh skills view

  function persist(next: RoutingRule[]) {
    const sorted = [...next].sort((a, b) => a.priority - b.priority);
    setRules(sorted);
    saveRules(sorted);
  }

  function runSimulation() {
    const result = bulkRoute(tickets, agents);
    setDecisions(result);
    const assigned = result.filter(r => r.candidateAgentId).length;
    toast.success(`Simulated routing for ${result.length} tickets`, {
      description: `${assigned} would be auto-assigned`,
    });
  }

  const unassignedCount = tickets.filter(
    t => !t.assigneeId && t.status !== "closed" && t.status !== "resolved",
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Route className="h-6 w-6" /> Smart routing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure rules and skill profiles, then simulate auto-assignment for{" "}
            <strong>{unassignedCount}</strong> unassigned tickets.
          </p>
        </div>
        <Button onClick={runSimulation}>
          <Sparkles className="mr-2 h-4 w-4" /> Run simulation
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules"><ListChecks className="mr-2 h-4 w-4" /> Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="skills"><Users className="mr-2 h-4 w-4" /> Agent skills</TabsTrigger>
          <TabsTrigger value="simulation"><Activity className="mr-2 h-4 w-4" /> Simulation ({decisions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => persist([
                ...rules,
                {
                  id: `rule_${Date.now()}`,
                  name: "New rule",
                  enabled: true,
                  priority: (rules[rules.length - 1]?.priority ?? 0) + 10,
                  conditions: {},
                  action: { strategy: "least_busy" },
                },
              ])}
            >
              <Plus className="mr-2 h-4 w-4" /> Add rule
            </Button>
          </div>
          {rules.map(rule => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              onChange={(updated) => persist(rules.map(r => r.id === rule.id ? updated : r))}
              onDelete={() => persist(rules.filter(r => r.id !== rule.id))}
            />
          ))}
        </TabsContent>

        <TabsContent value="skills" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map(a => {
              const profile = getSkillsFor(a.id);
              return (
                <SkillEditor
                  key={`${a.id}_${tick}`}
                  agentName={a.name}
                  agentTeam={a.team}
                  online={a.online}
                  workload={a.workload}
                  initialProfile={profile}
                  onSave={(p) => {
                    setSkillsFor(p);
                    setTick(x => x + 1);
                    toast.success(`Updated skills for ${a.name}`);
                  }}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="simulation" className="mt-4">
          {decisions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                Click "Run simulation" to see how unassigned tickets would route.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {decisions.map(d => {
                    const t = tickets.find(t => t.id === d.ticketId)!;
                    return (
                      <div key={d.ticketId} className="p-4 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{t.channel}</Badge>
                          </div>
                          <div className="font-medium truncate">{t.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {d.reasoning.join(" → ")}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="text-right shrink-0 min-w-[140px]">
                          {d.candidateAgentId ? (
                            <>
                              <div className="font-medium text-sm">{d.candidateName}</div>
                              <div className="text-xs text-muted-foreground">score {d.score}</div>
                            </>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Unassigned</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleEditor({
  rule, onChange, onDelete,
}: {
  rule: RoutingRule;
  onChange: (r: RoutingRule) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const c = rule.conditions;
  const a = rule.action;

  function patch(p: Partial<RoutingRule>) { onChange({ ...rule, ...p }); }
  function patchCond(p: Partial<RoutingRule["conditions"]>) {
    onChange({ ...rule, conditions: { ...c, ...p } });
  }
  function patchAction(p: Partial<RoutingRule["action"]>) {
    onChange({ ...rule, action: { ...a, ...p } });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Switch checked={rule.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
          <Input
            value={rule.name}
            onChange={(e) => patch({ name: e.target.value })}
            className="flex-1 font-medium"
          />
          <Input
            type="number"
            value={rule.priority}
            onChange={(e) => patch({ priority: Number(e.target.value) || 0 })}
            className="w-20"
            title="Lower = evaluated first"
          />
          <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 border-t pt-4">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">When</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ChipMultiSelect
                label="Priorities"
                options={PRIORITIES}
                values={c.priorities ?? []}
                onChange={(v) => patchCond({ priorities: v as Priority[] })}
              />
              <ChipMultiSelect
                label="Channels"
                options={["email", "chat", "portal", "phone"]}
                values={c.channels ?? []}
                onChange={(v) => patchCond({ channels: v as any })}
              />
              <KeywordInput
                label="Keywords (any match)"
                values={c.keywords ?? []}
                onChange={(v) => patchCond({ keywords: v })}
              />
              <KeywordInput
                label="Categories (any match)"
                values={c.categories ?? []}
                onChange={(v) => patchCond({ categories: v })}
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Then assign with</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Strategy</label>
                <Select
                  value={a.strategy}
                  onValueChange={(v) => patchAction({ strategy: v as any })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Prefer team (optional)</label>
                <Input
                  value={a.preferTeam ?? ""}
                  onChange={(e) => patchAction({ preferTeam: e.target.value || undefined })}
                  placeholder="e.g. Billing"
                  className="mt-1"
                />
              </div>
              <KeywordInput
                label="Required skills"
                values={a.requireSkills ?? []}
                onChange={(v) => patchAction({ requireSkills: v })}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ChipMultiSelect({
  label, options, values, onChange,
}: {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);
  }
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o}
            onClick={() => toggle(o)}
            className={`px-2.5 py-1 rounded-full text-xs border capitalize transition-colors ${
              values.includes(o)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function KeywordInput({
  label, values, onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setInput("");
  }
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="type and press Enter"
        />
        <Button variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map(v => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              <button onClick={() => onChange(values.filter(x => x !== v))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function SkillEditor({
  agentName, agentTeam, online, workload, initialProfile, onSave,
}: {
  agentName: string;
  agentTeam?: string;
  online: boolean;
  workload: number;
  initialProfile: ReturnType<typeof getSkillsFor>;
  onSave: (p: ReturnType<typeof getSkillsFor>) => void;
}) {
  const [skills, setSkills] = useState<string[]>(initialProfile.skills);
  const [maxConcurrent, setMaxConcurrent] = useState(initialProfile.maxConcurrent);
  const [awayUntil, setAwayUntil] = useState(initialProfile.awayUntil ?? "");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{agentName}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              {agentTeam && <span>{agentTeam}</span>}
              <span>·</span>
              <span className={online ? "text-emerald-600" : ""}>{online ? "Online" : "Offline"}</span>
              <span>·</span>
              <span>load {workload}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <KeywordInput label="Skills" values={skills} onChange={setSkills} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Max concurrent</label>
            <Input
              type="number"
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(Number(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Away until</label>
            <Input
              type="datetime-local"
              value={awayUntil ? awayUntil.slice(0, 16) : ""}
              onChange={(e) => setAwayUntil(e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => onSave({
              agentId: initialProfile.agentId,
              skills,
              maxConcurrent,
              awayUntil: awayUntil || undefined,
            })}
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
