import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Onboarding() {
  const nav = useNavigate();
  const { user, memberships, loading, refresh } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [teamName, setTeamName] = useState("Support");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav("/login", { replace: true });
    if (!loading && memberships.length > 0) nav("/app", { replace: true });
  }, [loading, user, memberships, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("create_organization", {
      _org_name: orgName,
      _team_name: teamName || "Support",
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await refresh();
    setBusy(false);
    toast.success("Workspace created");
    nav("/app", { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background mesh-bg p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-elegant">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-lg">Create your workspace</div>
            <div className="text-xs text-muted-foreground">You'll be the Admin</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Organization name</label>
            <div className="relative mt-1">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Corp" className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-surface-2 border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">First team name</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Support" className="mt-1 w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-border focus:border-ring outline-none focus:ring-4 focus:ring-ring/15 text-sm" />
          </div>
          <button disabled={busy || !orgName.trim()} className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow transition-shadow flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create workspace <ArrowRight className="h-4 w-4" /></>}
          </button>
          <button type="button" onClick={async () => { await supabase.auth.signOut(); nav("/login"); }} className="w-full text-xs text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
