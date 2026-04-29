import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface InvitePreview {
  id: string;
  org_id: string;
  org_name: string;
  email: string;
  role: string;
  team_name: string | null;
  status: string;
  expires_at: string;
}

export default function AcceptInvite() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, refresh, loading } = useAuth();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing invite token");
      return;
    }
    supabase.rpc("get_invite_by_token", { _token: token }).then(({ data, error }) => {
      if (error) setError(error.message);
      else if (!data || (data as unknown as InvitePreview[]).length === 0) setError("Invite not found");
      else setInvite((data as unknown as InvitePreview[])[0]);
    });
  }, [token]);

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("accept_invite", { _token: token });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await refresh();
    setBusy(false);
    toast.success("Joined workspace");
    nav("/app", { replace: true });
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background mesh-bg p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-elegant">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="font-display font-bold text-lg">You've been invited</div>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        {invite && !error && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border p-4 bg-surface-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Organization</div>
              <div className="text-base font-semibold mt-0.5">{invite.org_name}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary capitalize">{invite.role}</span>
                {invite.team_name && <span className="px-2 py-1 rounded-md bg-background border border-border">{invite.team_name}</span>}
              </div>
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                <MailCheck className="h-3 w-3" /> Sent to {invite.email}
              </div>
            </div>

            {!user ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Sign in or create an account with <span className="font-medium text-foreground">{invite.email}</span> to accept.</p>
                <div className="flex gap-2">
                  <button onClick={() => nav(`/login?next=/invite?token=${token}`)} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-surface-2">Sign in</button>
                  <button onClick={() => nav(`/signup?next=/invite?token=${token}`)} className="flex-1 h-10 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold">Create account</button>
                </div>
              </div>
            ) : (
              <button onClick={accept} disabled={busy || invite.status !== "pending"} className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow transition-shadow flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Accept invite <ArrowRight className="h-4 w-4" /></>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
