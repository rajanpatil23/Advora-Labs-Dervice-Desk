import { ArrowRight, Filter, Play, Workflow, Zap } from "lucide-react";
import {
  ACTION_OPTIONS, CONDITION_FIELDS, CONDITION_OPS, TRIGGER_OPTIONS,
  type Rule,
} from "@/lib/api/automations";

export function FlowPreview({ rule }: { rule: Rule }) {
  const trigger = TRIGGER_OPTIONS.find((t) => t.value === rule.trigger)?.label ?? rule.trigger;

  return (
    <div className="rounded-xl border bg-gradient-to-br from-muted/30 to-background p-4 overflow-x-auto">
      <div className="flex items-stretch gap-3 min-w-max">
        {/* Trigger node */}
        <Node tone="primary" icon={<Zap className="h-3.5 w-3.5" />} title="WHEN" body={trigger} />

        <Connector />

        {/* Conditions node */}
        <Node
          tone="amber"
          icon={<Filter className="h-3.5 w-3.5" />}
          title={rule.conditions.length === 0 ? "ALWAYS" : `IF (${rule.matchAll ? "all" : "any"})`}
          body={
            rule.conditions.length === 0 ? (
              <span className="italic opacity-70">no conditions</span>
            ) : (
              <ul className="space-y-0.5">
                {rule.conditions.slice(0, 3).map((c) => {
                  const fl = CONDITION_FIELDS.find((f) => f.value === c.field)?.label ?? c.field;
                  const ol = CONDITION_OPS.find((o) => o.value === c.op)?.label ?? c.op;
                  return (
                    <li key={c.id} className="font-mono text-[11px] truncate max-w-[180px]">
                      {fl} <span className="opacity-60">{ol}</span> {c.value || "-"}
                    </li>
                  );
                })}
                {rule.conditions.length > 3 && (
                  <li className="text-[11px] opacity-60">+{rule.conditions.length - 3} more</li>
                )}
              </ul>
            )
          }
        />

        <Connector />

        {/* Actions node */}
        <Node
          tone="green"
          icon={<Play className="h-3.5 w-3.5" />}
          title="THEN"
          body={
            rule.actions.length === 0 ? (
              <span className="italic opacity-70">no actions</span>
            ) : (
              <ul className="space-y-0.5">
                {rule.actions.slice(0, 3).map((a) => {
                  const al = ACTION_OPTIONS.find((o) => o.value === a.type)?.label ?? a.type;
                  return (
                    <li key={a.id} className="font-mono text-[11px] truncate max-w-[200px]">
                      {al}{a.value ? ` → ${a.value}` : ""}
                    </li>
                  );
                })}
                {rule.actions.length > 3 && (
                  <li className="text-[11px] opacity-60">+{rule.actions.length - 3} more</li>
                )}
              </ul>
            )
          }
        />
      </div>
      {!rule.enabled && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Workflow className="h-3.5 w-3.5" /> This rule is paused - it will not run on matching events.
        </div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="self-center text-muted-foreground/60">
      <ArrowRight className="h-5 w-5" />
    </div>
  );
}

type Tone = "primary" | "amber" | "green";
function Node({
  tone, icon, title, body,
}: { tone: Tone; icon: React.ReactNode; title: string; body: React.ReactNode }) {
  const toneClass =
    tone === "primary" ? "border-primary/30 bg-primary/5 text-primary"
    : tone === "amber" ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400";
  return (
    <div className={`min-w-[180px] max-w-[260px] rounded-lg border-2 p-3 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
        {icon} {title}
      </div>
      <div className="mt-1.5 text-foreground text-xs leading-relaxed">{body}</div>
    </div>
  );
}
