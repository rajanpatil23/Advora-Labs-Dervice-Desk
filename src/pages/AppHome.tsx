import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { tenantRoleHome } from "@/lib/roleRoutes";

/**
 * Renders at /app — sends the user to the right home based on their role.
 * (Phase 2 of the role-aware shell.)
 */
export default function AppHome() {
  const { currentRole, isPlatformAdmin, memberships } = useAuth();

  if (isPlatformAdmin && memberships.length === 0) {
    return <Navigate to="/platform" replace />;
  }
  return <Navigate to={tenantRoleHome(currentRole)} replace />;
}
