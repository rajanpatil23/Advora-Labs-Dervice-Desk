import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, AlertCircle, Lightbulb } from "lucide-react";
import { useAppStore, useOrgSettings, useOrgCatalog } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Priority } from "@/lib/types";

export default function PortalNewRequest() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const settings = useOrgSettings();
  const catalog = useOrgCatalog();
  const addTicket = useAppStore((s) => s.addTicket);

  const presetItem = params.get("catalog") ? catalog.find((c) => c.id === params.get("catalog")) : undefined;

  const [title, setTitle] = useState(presetItem?.title ?? "");
  const [description, setDescription] = useState(presetItem?.description ?? "");
  const [category, setCategory] = useState<string>(settings.categories[0] ?? "General");
  const [priority, setPriority] = useState<Priority>("medium");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!category && settings.categories[0]) setCategory(settings.categories[0]);
  }, [settings.categories, category]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      toast.error("Add a short title so we can help faster");
      return;
    }
    setBusy(true);
    try {
      const t = addTicket({
        title: title.trim(),
        description: description.trim(),
        requesterId: user.id,
        priority,
        category,
        channel: "portal",
      });
      toast.success(`Request ${t.number} submitted`);
      nav(`/portal/requests/${t.id}`);
    } catch (err) {
      toast.error((err as Error).message || "Couldn't submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">New request</div>
        <h1 className="font-display font-bold text-3xl mt-1">{presetItem ? presetItem.title : "Tell us what you need"}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          We'll route it to the right team. You'll get email and in-portal updates.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <Field label="What's going on?" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            maxLength={140}
            placeholder="e.g. My laptop screen is flickering"
            className="w-full h-12 px-4 rounded-xl bg-surface border border-border focus:border-ring outline-none text-sm"
          />
        </Field>

        <Field label="More details" hint="Steps to reproduce, screenshots, error messages - anything helps.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="When did it start? What were you doing? Have you tried anything?"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-ring outline-none text-sm resize-y"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface border border-border focus:border-ring outline-none text-sm"
            >
              {(settings.categories.length ? settings.categories : ["General"]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="How urgent?">
            <div className="grid grid-cols-4 gap-1.5">
              {(["low", "medium", "high", "critical"] as Priority[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={
                    "h-12 rounded-xl border text-xs font-medium capitalize transition-colors " +
                    (priority === p
                      ? p === "critical"
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : p === "high"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-foreground text-background border-foreground"
                      : "bg-surface border-border hover:border-ring text-muted-foreground")
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {priority === "critical" && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive">Marked as critical</div>
              <div className="text-muted-foreground mt-0.5">Use this only when work is fully blocked or there's a security/safety issue.</div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
          <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-foreground">Tip:</span> the more detail you give upfront, the faster we can resolve it.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => nav("/portal")}
            className="h-11 px-4 rounded-xl text-sm text-muted-foreground hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="h-11 px-5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:shadow-glow transition-shadow disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit request
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium flex items-center gap-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
