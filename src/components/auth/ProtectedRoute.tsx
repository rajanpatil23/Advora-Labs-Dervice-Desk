import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ roles }: { roles?: AppRole[] }) {
  const { user, loading, currentRole, isPlatformAdmin, memberships } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;

  // Platform-only users (no tenant memberships) can only see /platform
  if (isPlatformAdmin && memberships.length === 0 && !loc.pathname.startsWith("/platform")) {
    return <Navigate to="/platform" replace />;
  }

  if (roles && currentRole && !roles.includes(currentRole)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

