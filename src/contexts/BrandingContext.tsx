import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readBranding, writeBranding, type Branding, type LocaleCode, type ThemeMode } from "@/lib/api/branding";
import { tFor } from "@/lib/i18n";

type BrandingContextValue = {
  branding: Branding;
  setBranding: (b: Partial<Branding>) => void;
  resetBranding: () => void;
  t: (key: string, fallback?: string) => string;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function applyToDOM(b: Branding) {
  const root = document.documentElement;
  root.style.setProperty("--primary", b.primaryHsl);
  root.style.setProperty("--accent", b.accentHsl);

  // Theme mode
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const isDark = b.theme === "dark" || (b.theme === "system" && prefersDark);
  root.classList.toggle("dark", isDark);

  // Locale
  root.lang = b.locale;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<Branding>(() => readBranding());

  useEffect(() => { applyToDOM(branding); }, [branding]);

  // Re-apply when system theme changes (only if "system" mode)
  useEffect(() => {
    if (branding.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyToDOM(branding);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [branding]);

  const setBranding = useCallback((patch: Partial<Branding>) => {
    setBrandingState(prev => {
      const next = { ...prev, ...patch };
      writeBranding(next);
      return next;
    });
  }, []);

  const resetBranding = useCallback(() => {
    localStorage.removeItem("lov.branding.v1");
    setBrandingState(readBranding());
  }, []);

  const t = useMemo(() => tFor(branding.locale), [branding.locale]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding, resetBranding, t }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used inside BrandingProvider");
  return ctx;
}

export function useT() {
  return useBranding().t;
}

export type { ThemeMode, LocaleCode };
