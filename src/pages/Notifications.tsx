import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bell, BellOff, Mail, MessageSquare, Inbox, Moon, Clock, AtSign, Slack as SlackIcon,
  Volume2, VolumeX, Monitor, Play,
} from "lucide-react";
import {
  EVENT_DEFINITIONS, MUTE_PRESETS, isMuted, readPrefs, writePrefs, defaultPrefs,
  type Channel, type DigestFrequency, type NotificationPrefs, type NotificationEventKey,
} from "@/lib/api/notifications";
import {
  SOUND_PACKS, readFeedback, writeFeedback, defaultFeedback, previewSound, previewDesktop,
  requestDesktopPermission, desktopPermission,
  type FeedbackPrefs, type SoundPack,
} from "@/lib/api/notificationEngine";
import { Slider } from "@/components/ui/slider";

const CHANNEL_META: { key: Channel; label: string; icon: typeof Inbox }[] = [
  { key: "inApp", label: "In-app", icon: Inbox },
  { key: "email", label: "Email", icon: Mail },
  { key: "slack", label: "Slack", icon: MessageSquare },
];

const FREQUENCIES: { value: DigestFrequency; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "realtime", label: "Real-time" },
  { value: "hourly", label: "Hourly digest" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
];

export default function Notifications() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const userId = (user as any).id ?? "anon";

  const [prefs, setPrefsState] = useState<NotificationPrefs>(() => readPrefs(userId));
  const [feedback, setFeedbackState] = useState<FeedbackPrefs>(() => readFeedback(userId));
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => desktopPermission());

  const update = (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefsState(next);
    writePrefs(userId, next);
  };

  const updateFeedback = (patch: Partial<FeedbackPrefs>) => {
    const next = { ...feedback, ...patch };
    setFeedbackState(next);
    writeFeedback(userId, next);
  };

  const enableDesktop = async () => {
    const result = await requestDesktopPermission();
    setPerm(result);
    if (result === "granted") {
      updateFeedback({ desktopEnabled: true });
      previewDesktop("Desktop notifications enabled", "You'll see alerts here when the app is in the background.");
      toast.success("Desktop notifications enabled");
    } else if (result === "denied") {
      toast.error("Permission denied", { description: "Enable notifications in your browser settings." });
    } else if (result === "unsupported") {
      toast.error("Not supported in this browser");
    }
  };

  const toggleMatrix = (key: NotificationEventKey, channel: Channel, value: boolean) => {
    const matrix = { ...prefs.matrix, [key]: { ...prefs.matrix[key], [channel]: value } };
    update({ matrix });
  };

  const setDigest = (channel: Channel, value: DigestFrequency) => {
    update({ digest: { ...prefs.digest, [channel]: value } });
  };

  const muted = isMuted(prefs);
  const muteFor = (minutes: number) => {
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    update({ mutedUntil: until });
    toast.success(`Notifications muted until ${new Date(until).toLocaleString()}`);
  };
  const unmute = () => { update({ mutedUntil: undefined }); toast.success("Notifications resumed"); };

  const grouped = useMemo(() => {
    const out: Record<string, typeof EVENT_DEFINITIONS> = {};
    EVENT_DEFINITIONS.forEach((e) => { (out[e.group] ??= []).push(e); });
    return out;
  }, []);

  const enabledCount = Object.values(prefs.matrix).filter((row) =>
    Object.values(row).some(Boolean),
  ).length;

  return (
    <div className="space-y-6 p-6 overflow-y-auto h-full">
      <header className="flex flex-wrap items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Choose what you get notified about and where.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">{enabledCount} of {EVENT_DEFINITIONS.length} events on</Badge>
          {muted ? (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">
              <BellOff className="h-3 w-3 mr-1" /> Muted
            </Badge>
          ) : null}
        </div>
      </header>

      {/* Mute / quiet hours */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BellOff className="h-4 w-4 text-primary" /> Snooze notifications</CardTitle>
            <CardDescription>
              {muted
                ? `Muted until ${new Date(prefs.mutedUntil!).toLocaleString()}`
                : "Pause all notifications across channels temporarily."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {muted ? (
              <Button variant="outline" onClick={unmute}>Resume notifications</Button>
            ) : (
              MUTE_PRESETS.map((p) => (
                <Button key={p.minutes} variant="outline" size="sm" onClick={() => muteFor(p.minutes)}>
                  {p.label}
                </Button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Moon className="h-4 w-4 text-primary" /> Quiet hours</CardTitle>
            <CardDescription>Suppress non-urgent notifications during these hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="qh">Enable quiet hours</Label>
              <Switch
                id="qh"
                checked={prefs.quietHours.enabled}
                onCheckedChange={(v) => update({ quietHours: { ...prefs.quietHours, enabled: v } })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start</Label>
                <Input type="time" value={prefs.quietHours.start}
                  onChange={(e) => update({ quietHours: { ...prefs.quietHours, start: e.target.value } })}
                  disabled={!prefs.quietHours.enabled} />
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <Input type="time" value={prefs.quietHours.end}
                  onChange={(e) => update({ quietHours: { ...prefs.quietHours, end: e.target.value } })}
                  disabled={!prefs.quietHours.enabled} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Timezone: {prefs.quietHours.timezone}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sound & Desktop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-4 w-4 text-primary" /> Sound & desktop alerts
          </CardTitle>
          <CardDescription>How notifications get your attention in the browser.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {/* Sound */}
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="snd" className="flex items-center gap-2">
                {feedback.soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                Play sound on new notification
              </Label>
              <Switch
                id="snd"
                checked={feedback.soundEnabled}
                onCheckedChange={(v) => updateFeedback({ soundEnabled: v })}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Sound pack</Label>
              <Select
                value={feedback.soundPack}
                onValueChange={(v) => updateFeedback({ soundPack: v as SoundPack })}
                disabled={!feedback.soundEnabled}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOUND_PACKS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="font-medium">{p.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">— {p.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Volume · {Math.round(feedback.soundVolume * 100)}%
              </Label>
              <Slider
                value={[feedback.soundVolume * 100]}
                onValueChange={([v]) => updateFeedback({ soundVolume: v / 100 })}
                min={0} max={100} step={5}
                disabled={!feedback.soundEnabled}
                className="mt-2"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["low", "med", "high"] as const).map((sev) => (
                <Button
                  key={sev}
                  size="sm"
                  variant="outline"
                  disabled={!feedback.soundEnabled || feedback.soundPack === "off"}
                  onClick={() => previewSound(feedback.soundPack, sev, feedback.soundVolume)}
                >
                  <Play className="h-3 w-3 mr-1.5" /> Preview {sev}
                </Button>
              ))}
            </div>
          </div>

          {/* Desktop */}
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="desk" className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" /> Desktop notifications
              </Label>
              <Switch
                id="desk"
                checked={feedback.desktopEnabled && perm === "granted"}
                onCheckedChange={(v) => {
                  if (v && perm !== "granted") {
                    void enableDesktop();
                  } else {
                    updateFeedback({ desktopEnabled: v });
                  }
                }}
                disabled={perm === "unsupported" || perm === "denied"}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Pop-ups appear when this tab is in the background. Sound is controlled separately.
            </p>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  perm === "granted" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : perm === "denied" ? "bg-destructive/15 text-destructive border-destructive/30"
                  : perm === "unsupported" ? "" : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                }
              >
                Permission: {perm}
              </Badge>
              {perm !== "granted" && perm !== "unsupported" && (
                <Button size="sm" variant="outline" onClick={enableDesktop}>
                  Enable in browser
                </Button>
              )}
              {perm === "granted" && (
                <Button size="sm" variant="outline" onClick={() => previewDesktop()}>
                  <Play className="h-3 w-3 mr-1.5" /> Preview
                </Button>
              )}
            </div>

            {perm === "denied" && (
              <p className="text-[11px] text-muted-foreground">
                Permission was blocked. Re-enable it from your browser's site settings, then return here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery channels</CardTitle>
          <CardDescription>Where notifications can be sent and how often digests are batched.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs flex items-center gap-1"><AtSign className="h-3 w-3" /> Email address</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={prefs.emailAddress ?? ""}
                onChange={(e) => update({ emailAddress: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><SlackIcon className="h-3 w-3" /> Slack handle</Label>
              <Input
                placeholder="@username or #channel"
                value={prefs.slackHandle ?? ""}
                onChange={(e) => update({ slackHandle: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-3">
            {CHANNEL_META.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-primary" /> {label}
                </div>
                <Label className="text-xs text-muted-foreground">Frequency</Label>
                <Select value={prefs.digest[key]} onValueChange={(v) => setDigest(key, v as DigestFrequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Notification matrix</CardTitle>
            <CardDescription>Pick which channels are used for each event.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { const d = defaultPrefs(); update({ matrix: d.matrix }); toast.success("Reset to defaults"); }}>
            Reset to defaults
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{group}</div>
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_repeat(3,80px)] items-center px-4 py-2 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <div>Event</div>
                  {CHANNEL_META.map((c) => <div key={c.key} className="text-center">{c.label}</div>)}
                </div>
                {items.map((ev, i) => (
                  <div key={ev.key}
                    className={`grid grid-cols-[1fr_repeat(3,80px)] items-center px-4 py-3 text-sm ${i > 0 ? "border-t" : ""}`}>
                    <div>
                      <div className="font-medium">{ev.label}</div>
                      <div className="text-xs text-muted-foreground">{ev.description}</div>
                    </div>
                    {CHANNEL_META.map((c) => (
                      <div key={c.key} className="flex justify-center">
                        <Switch
                          checked={prefs.matrix[ev.key]?.[c.key] ?? false}
                          onCheckedChange={(v) => toggleMatrix(ev.key, c.key, v)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
