import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  color: string; // bg-* class
  onAction: () => void;
}

interface SwipeableRowProps {
  left?: SwipeAction;
  right?: SwipeAction;
  children: ReactNode;
  className?: string;
  threshold?: number;
}

/**
 * Touch-friendly swipeable row.
 * Drag right to reveal `left` action, drag left to reveal `right` action.
 * Past threshold the action fires automatically on release.
 */
export function SwipeableRow({ left, right, children, className, threshold = 80 }: SwipeableRowProps) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const trackingId = useRef<number | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    trackingId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current == null || trackingId.current !== e.pointerId) return;
    const delta = e.clientX - startX.current;
    const clamped = Math.max(-160, Math.min(160, delta));
    if ((clamped > 0 && !left) || (clamped < 0 && !right)) return;
    setDx(clamped);
  };

  const finish = () => {
    if (dx > threshold && left) left.onAction();
    else if (dx < -threshold && right) right.onAction();
    setDx(0);
    startX.current = null;
    trackingId.current = null;
  };

  return (
    <div className={cn("relative overflow-hidden touch-pan-y select-none", className)}>
      {/* Left action background */}
      {left && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start pl-5 text-white font-medium transition-opacity",
            left.color,
          )}
          style={{ width: Math.max(0, dx), opacity: dx > 10 ? 1 : 0 }}
        >
          <div className="flex items-center gap-2">
            {left.icon}
            {dx > threshold && <span className="text-sm">{left.label}</span>}
          </div>
        </div>
      )}
      {/* Right action background */}
      {right && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end pr-5 text-white font-medium transition-opacity",
            right.color,
          )}
          style={{ width: Math.max(0, -dx), opacity: dx < -10 ? 1 : 0 }}
        >
          <div className="flex items-center gap-2">
            {dx < -threshold && <span className="text-sm">{right.label}</span>}
            {right.icon}
          </div>
        </div>
      )}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        style={{
          transform: `translateX(${dx}px)`,
          transition: startX.current == null ? "transform 200ms ease-out" : "none",
        }}
        className="bg-card relative"
      >
        {children}
      </div>
    </div>
  );
}
