// Frontend-only branding + i18n state. Persisted to localStorage.
// Backend agent: replace these reads/writes with API calls; the context API stays the same.

export type ThemeMode = "light" | "dark" | "system";
export type LocaleCode = "en" | "es" | "fr" | "de" | "pt" | "hi" | "ja" | "zh";

export type Branding = {
  companyName: string;
  logoDataUrl?: string;       // base64 data URL (small logos only)
  primaryHsl: string;         // e.g. "215 88% 56%"
  accentHsl: string;
  theme: ThemeMode;
  locale: LocaleCode;
};

const KEY = "lov.branding.v1";

const defaults: Branding = {
  companyName: "Connecttly",
  primaryHsl: "215 88% 56%",
  accentHsl: "180 60% 42%",
  theme: "system",
  locale: "en",
};

export function readBranding(): Branding {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function writeBranding(b: Branding) {
  localStorage.setItem(KEY, JSON.stringify(b));
}

export const PRESET_COLORS: { name: string; hsl: string }[] = [
  { name: "Blue", hsl: "215 88% 56%" },
  { name: "Indigo", hsl: "243 75% 58%" },
  { name: "Violet", hsl: "262 83% 58%" },
  { name: "Pink", hsl: "330 81% 60%" },
  { name: "Red", hsl: "0 84% 60%" },
  { name: "Orange", hsl: "25 95% 55%" },
  { name: "Amber", hsl: "38 92% 50%" },
  { name: "Emerald", hsl: "152 60% 42%" },
  { name: "Teal", hsl: "180 60% 42%" },
  { name: "Cyan", hsl: "189 94% 43%" },
  { name: "Slate", hsl: "215 20% 35%" },
  { name: "Black", hsl: "0 0% 12%" },
];

export const LOCALES: { code: LocaleCode; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];
