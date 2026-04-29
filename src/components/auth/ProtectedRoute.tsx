import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { orgConfigApi } from "@/lib/api/orgConfig";

export function ProtectedRoute({ roles }: { roles?: AppRole[] }) {
  const { user, loading, currentRole, currentOrgId, isPlatformAdmin, memberships } = useAuth();
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

  // Requesters live in /portal — never the agent app
  if (currentRole === "requester" && loc.pathname.startsWith("/app")) {
    return <Navigate to="/portal" replace />;
  }

  // Owners/admins of an un-onboarded org get sent through the wizard
  if (
    currentOrgId &&
    (currentRole === "owner" || currentRole === "admin") &&
    !orgConfigApi.isOnboarded(currentOrgId) &&
    !loc.pathname.startsWith("/onboarding")
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (roles && currentRole && !roles.includes(currentRole)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

