import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { PRODUCT_TOUR, tourApi, type TourStep } from "@/lib/api/tour";
import { useAuth } from "@/contexts/AuthContext";

const PADDING = 8;
const POPOVER_W = 340;
const POPOVER_H = 200;

type Rect = { top: number; left: number; width: number; height: number };

function useTargetRect(selector?: string): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    if (!selector) { setRect(null); return; }
    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    const target = document.querySelector(selector);
    if (target) ro.observe(target);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const i = window.setInterval(measure, 500); // catch lazy-mounted nodes
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearInterval(i);
    };
  }, [selector]);
  return rect;
}

function popoverPosition(rect: Rect | null, placement: TourStep["placement"]) {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (!rect || placement === "center") {
    return { top: vh / 2 - POPOVER_H / 2, left: vw / 2 - POPOVER_W / 2 };
  }
  switch (placement) {
    case "top":    return { top: Math.max(16, rect.top - POPOVER_H - 16),                          left: clampX(rect.left + rect.width / 2 - POPOVER_W / 2) };
    case "bottom": return { top: Math.min(vh - POPOVER_H - 16, rect.top + rect.height + 16),       left: clampX(rect.left + rect.width / 2 - POPOVER_W / 2) };
    case "left":   return { top: clampY(rect.top + rect.height / 2 - POPOVER_H / 2),               left: Math.max(16, rect.left - POPOVER_W - 16) };
    case "right":
    default:       return { top: clampY(rect.top + rect.height / 2 - POPOVER_H / 2),               left: Math.min(vw - POPOVER_W - 16, rect.left + rect.width + 16) };
  }
  function clampX(x: number) { return Math.min(vw - POPOVER_W - 16, Math.max(16, x)); }
  function clampY(y: number) { return Math.min(vh - POPOVER_H - 16, Math.max(16, y)); }
}

export function ProductTour() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const userId = (user as any)?.id ?? "anon";
  const step = PRODUCT_TOUR.steps[stepIdx];
  const rect = useTargetRect(step?.target);

  // Auto-start for first-time users
  useEffect(() => {
    if (!user) return;
    if (!tourApi.hasCompleted(userId)) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [user, userId]);

  // Allow other components to launch the tour
  useEffect(() => {
    const onLaunch = () => { setStepIdx(0); setOpen(true); };
    window.addEventListener("lov:start-tour", onLaunch);
    return () => window.removeEventListener("lov:start-tour", onLaunch);
  }, []);

  // Navigate when the step requests a route
  useEffect(() => {
    if (!open || !step?.route) return;
    if (window.location.pathname !== step.route) nav(step.route);
  }, [open, step, nav]);

  if (!open || !step) return null;

  const finish = () => {
    tourApi.markComplete(userId);
    setOpen(false);
    setStepIdx(0);
  };
  const next = () => stepIdx < PRODUCT_TOUR.steps.length - 1 ? setStepIdx(stepIdx + 1) : finish();
  const prev = () => setStepIdx(Math.max(0, stepIdx - 1));

  const pos = popoverPosition(rect, step.placement);
  const hasTarget = rect && step.placement !== "center";

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dim overlay with cut-out */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={finish}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {hasTarget && (
              <rect
                x={rect.left - PADDING} y={rect.top - PADDING}
                width={rect.width + PADDING * 2} height={rect.height + PADDING * 2}
                rx={10} ry={10} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
      </svg>

      {/* Spotlight ring */}
      {hasTarget && (
        <div
          className="absolute rounded-[10px] ring-2 ring-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25)] animate-pulse pointer-events-none"
          style={{
            top: rect.top - PADDING, left: rect.left - PADDING,
            width: rect.width + PADDING * 2, height: rect.height + PADDING * 2,
          }}
        />
      )}

      {/* Popover */}
      <div
        className="absolute pointer-events-auto rounded-xl border border-border bg-card shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200"
        style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
      >
        <div className="flex items-start gap-2 mb-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Step {stepIdx + 1} of {PRODUCT_TOUR.steps.length}
            </div>
            <h3 className="font-display font-semibold text-base leading-tight">{step.title}</h3>
          </div>
          <button onClick={finish} className="text-muted-foreground hover:text-foreground" aria-label="Close tour">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mb-4">
          {PRODUCT_TOUR.steps.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
            Skip tour
          </Button>
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <Button variant="outline" size="sm" onClick={prev}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {stepIdx === PRODUCT_TOUR.steps.length - 1 ? "Finish" : "Next"}
              {stepIdx < PRODUCT_TOUR.steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Helper to launch the tour from anywhere. */
export function startProductTour() {
  window.dispatchEvent(new Event("lov:start-tour"));
}
