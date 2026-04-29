import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ roles }: { roles?: AppRole[] }) {
  const { user, loading, memberships, currentRole } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (memberships.length === 0) return <Navigate to="/onboarding" replace />;
  if (roles && currentRole && !roles.includes(currentRole)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
