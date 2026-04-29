import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Upload, Trash2, RotateCcw, Sun, Moon, Monitor, Globe } from "lucide-react";
import { LOCALES, PRESET_COLORS } from "@/lib/api/branding";

export default function Branding() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = role === "owner" || role === "admin";
  const { branding, setBranding, resetBranding, t } = useBranding();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!allowed) return <Navigate to="/app" replace />;

  const onLogo = async (file: File) => {
    if (file.size > 256 * 1024) { toast.error("Logo must be under 256 KB"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setBranding({ logoDataUrl: reader.result as string });
      setUploading(false);
      toast.success("Logo updated");
    };
    reader.onerror = () => { setUploading(false); toast.error("Failed to read file"); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center gap-3">
        <Palette className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("branding.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("branding.subtitle")}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
              <CardDescription>Company name and logo shown across the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("branding.company")}</Label>
                <Input value={branding.companyName} onChange={(e) => setBranding({ companyName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("branding.logo")}</Label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {branding.logoDataUrl
                      ? <img src={branding.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                      : <Palette className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])}
                  />
                  <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1" />
                    {uploading ? t("common.loading") : "Upload"}
                  </Button>
                  {branding.logoDataUrl && (
                    <Button variant="ghost" onClick={() => setBranding({ logoDataUrl: undefined })}>
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WebP. Up to 256 KB.</p>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Colors</CardTitle>
              <CardDescription>Pick the brand colors used throughout the workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ColorSwatchPicker
                label={t("branding.primary")}
                valueHsl={branding.primaryHsl}
                onChange={(v) => setBranding({ primaryHsl: v })}
              />
              <ColorSwatchPicker
                label={t("branding.accent")}
                valueHsl={branding.accentHsl}
                onChange={(v) => setBranding({ accentHsl: v })}
              />
            </CardContent>
          </Card>

          {/* Theme + Locale */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Language</CardTitle>
              <CardDescription>Choose theme mode and default workspace language.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>{t("branding.theme")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <ThemeOption icon={<Sun className="h-4 w-4" />} label={t("theme.light")} active={branding.theme === "light"} onClick={() => setBranding({ theme: "light" })} />
                  <ThemeOption icon={<Moon className="h-4 w-4" />} label={t("theme.dark")} active={branding.theme === "dark"} onClick={() => setBranding({ theme: "dark" })} />
                  <ThemeOption icon={<Monitor className="h-4 w-4" />} label={t("theme.system")} active={branding.theme === "system"} onClick={() => setBranding({ theme: "system" })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> {t("branding.locale")}</Label>
                <Select value={branding.locale} onValueChange={(v) => setBranding({ locale: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCALES.map(l => (
                      <SelectItem key={l.code} value={l.code}>
                        <span className="flex items-center gap-2"><span>{l.flag}</span> {l.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => { resetBranding(); toast.success("Branding reset to defaults"); }}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset to defaults
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Live preview</CardTitle>
            </CardHeader>
            <CardContent>
              <BrandPreview />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ColorSwatchPicker({ label, valueHsl, onChange }: { label: string; valueHsl: string; onChange: (hsl: string) => void }) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(c => (
          <button
            key={c.hsl}
            type="button"
            onClick={() => onChange(c.hsl)}
            title={c.name}
            className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${valueHsl === c.hsl ? "border-foreground ring-2 ring-offset-2 ring-foreground/20" : "border-border"}`}
            style={{ backgroundColor: `hsl(${c.hsl})` }}
            aria-label={c.name}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground">HSL:</span>
        <Input
          value={valueHsl}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs h-8 max-w-[180px]"
          placeholder="215 88% 56%"
        />
      </div>
    </div>
  );
}

function ThemeOption({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors ${active ? "border-primary bg-primary/5 text-foreground" : "border-border hover:bg-muted/50"}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BrandPreview() {
  const { branding, t } = useBranding();
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* mock topbar */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          {branding.logoDataUrl
            ? <img src={branding.logoDataUrl} alt="" className="h-7 w-7 rounded object-contain" />
            : <div className="h-7 w-7 rounded bg-primary" />}
          <span className="font-semibold text-sm">{branding.companyName || "Workspace"}</span>
        </div>
        <div className="h-7 w-7 rounded-full bg-muted" />
      </div>
      {/* mock body */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("preview.welcome")}</p>
          <h3 className="font-semibold">{branding.companyName || "Workspace"}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("preview.sample")}</p>
        <div className="flex gap-2">
          <button
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: `hsl(${branding.primaryHsl})` }}
          >
            {t("preview.cta")}
          </button>
          <button
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: `hsl(${branding.accentHsl})` }}
          >
            {t("nav.kb")}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2">
          {[
            { label: t("nav.tickets"), n: 24 },
            { label: t("nav.incidents"), n: 3 },
            { label: t("nav.requests"), n: 12 },
          ].map(s => (
            <div key={s.label} className="rounded-md border p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="text-base font-semibold">{s.n}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
