import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { tourApi } from "@/lib/api/tour";

/**
 * Floating "Take a tour" button (bottom-right).
 * Always available so demo users can re-run the product tour anytime.
 * Shows a small attention pulse for first-time users until the tour is taken.
 */
export function TourLauncher() {
  const { user } = useAuth();
  const userId = (user as any)?.id ?? "anon";
  const [hidden, setHidden] = useState(false);
  const [completed, setCompleted] = useState(true);

  useEffect(() => {
    if (!user) return;
    setCompleted(tourApi.hasCompleted(userId));
    const onDone = () => setCompleted(true);
    window.addEventListener("lov:tour-completed", onDone);
    return () => window.removeEventListener("lov:tour-completed", onDone);
  }, [user, userId]);

  if (!user || hidden) return null;

  const launch = () => window.dispatchEvent(new Event("lov:start-tour"));

  return (
    <div className="fixed bottom-5 right-5 z-40 hidden md:flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button
        onClick={launch}
        className={`group relative flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-foreground text-background shadow-xl ring-1 ring-foreground/20 hover:opacity-90 transition-all ${
          !completed ? "ring-4 ring-primary/30" : ""
        }`}
        aria-label="Take product tour"
      >
        {!completed && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-medium">{completed ? "Take a tour" : "Start guided tour"}</span>
      </button>
      <button
        onClick={() => setHidden(true)}
        className="h-7 w-7 rounded-full bg-foreground/80 text-background flex items-center justify-center shadow-md hover:bg-foreground"
        aria-label="Hide tour launcher"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
