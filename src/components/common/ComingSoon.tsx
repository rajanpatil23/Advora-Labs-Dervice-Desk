import { Construction } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  title: string;
  description: string;
  phase: string;
  backTo?: string;
}

/**
 * Lightweight placeholder for routes wired in Phase 2 but built out in later phases.
 * Keeps navigation honest without shipping fake UI.
 */
export function ComingSoon({ title, description, phase, backTo = "/app" }: Props) {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6 sm:p-12">
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mb-5">
            <Construction className="h-6 w-6 text-primary" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{phase}</div>
          <h1 className="font-display font-bold text-3xl mt-1">{title}</h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{description}</p>
          <Link to={backTo} className="inline-block mt-6 text-xs text-primary hover:underline">← Back</Link>
        </div>
      </div>
    </div>
  );
}
