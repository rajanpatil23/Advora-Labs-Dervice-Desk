import { ReactNode } from "react";
import { useAuth, AppRole } from "@/contexts/AuthContext";

interface Props {
  roles: AppRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGate({ roles, fallback = null, children }: Props) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return <>{fallback}</>;
  return <>{children}</>;
}
