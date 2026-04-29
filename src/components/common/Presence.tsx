import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { presenceApi, type Presence } from "@/lib/api/presence";
import { useAuth } from "@/contexts/AuthContext";

function initials(name: string) {
  return name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

/** Floating bubbles + typing indicator for a given ticket/resource. */
export function PresenceBubbles({ ticketId }: { ticketId: string }) {
  const { user, profile } = useAuth();
  const [list, setList] = useState<Presence[]>([]);

  useEffect(() => {
    if (!user || !ticketId) return;
    const me = { id: (user as any).id ?? "me", name: profile?.full_name ?? profile?.email ?? "You" };
    const cleanup = presenceApi.enter(me, ticketId);
    const unsub = presenceApi.subscribe(ticketId, setList);
    return () => { unsub(); cleanup(); };
  }, [ticketId, user, profile]);

  if (!list.length) return null;

  const others = list.filter((p) => p.userId !== ((user as any)?.id ?? "me"));
  const visible = others.slice(0, 4);
  const overflow = others.length - visible.length;
  const typers = others.filter((p) => p.typing);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {visible.map((p) => (
            <Tooltip key={p.userId}>
              <TooltipTrigger asChild>
                <div
                  className="relative h-7 w-7 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-semibold text-white shadow-sm"
                  style={{ background: p.color }}
                >
                  {initials(p.name)}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-xs">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground">{p.typing ? "typing…" : "viewing this ticket"}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {overflow > 0 && (
            <div className="h-7 w-7 rounded-full ring-2 ring-background bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center">
              +{overflow}
            </div>
          )}
        </div>
        {typers.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
            </span>
            <span className="truncate max-w-[140px]">
              {typers.length === 1 ? `${typers[0].name} is typing` : `${typers.length} people typing`}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/** Inline mini variant for list rows — just the colored dots. */
export function PresenceDots({ ticketId }: { ticketId: string }) {
  const [list, setList] = useState<Presence[]>([]);
  useEffect(() => presenceApi.subscribe(ticketId, setList), [ticketId]);
  if (!list.length) return null;
  return (
    <div className="flex -space-x-1">
      {list.slice(0, 3).map((p) => (
        <span
          key={p.userId}
          title={`${p.name}${p.typing ? " (typing)" : ""}`}
          className="h-2.5 w-2.5 rounded-full ring-2 ring-background"
          style={{ background: p.color }}
        />
      ))}
    </div>
  );
}
