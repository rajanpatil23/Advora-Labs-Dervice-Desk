import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, MailCheck } from "lucide-react";

// Invite acceptance is a no-op in the dummy frontend; the local AI agent should
// implement /invites/:token endpoints (see API_CONTRACT.md) and wire this page.
export default function AcceptInvite() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background mesh-bg p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-elegant">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="font-display font-bold text-lg">Invite preview</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground"><MailCheck className="h-4 w-4" /> Token: <span className="font-mono text-foreground">{token || "-"}</span></div>
          <p className="text-xs text-muted-foreground">
            Invite acceptance will work once the backend implements <code className="text-foreground">/invites/:token</code>.
            For now, sign in with one of the demo accounts on the login page.
          </p>
        </div>
        <button onClick={() => nav("/login", { replace: true })} className="mt-5 w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow">
          Go to sign in
        </button>
      </div>
    </div>
  );
}
