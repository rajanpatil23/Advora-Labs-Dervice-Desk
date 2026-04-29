import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Onboarding is currently a no-op in the dummy frontend: signup already creates
// a workspace via /auth/signup. Kept around so the route stays valid and so the
// local AI agent can wire it to a real /orgs endpoint later.
export default function Onboarding() {
  const nav = useNavigate();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!user) { nav("/login", { replace: true }); return null; }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background mesh-bg p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-elegant text-center space-y-4">
        <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="font-display font-bold text-xl">You're all set</div>
        <p className="text-sm text-muted-foreground">
          Workspace <span className="font-medium text-foreground">{user.org_name}</span> is ready.
        </p>
        <button onClick={() => nav("/app", { replace: true })} className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-glow">
          Enter workspace
        </button>
        <button onClick={async () => { await signOut(); nav("/login"); }} className="w-full text-xs text-muted-foreground hover:text-foreground">
          Sign out
        </button>
      </div>
    </div>
  );
}
