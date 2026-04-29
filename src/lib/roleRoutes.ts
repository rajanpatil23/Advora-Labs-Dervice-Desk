import type { AppRole, PlatformRole } from "@/contexts/AuthContext";

/**
 * Default landing route per role (see ROLES_AND_FEATURES.md §5).
 * Requesters live in a separate /portal experience (built in Phase 3).
 */
export function tenantRoleHome(role: AppRole | null): string {
  switch (role) {
    case "owner":
    case "admin":
      return "/app/dashboard";
    case "manager":
      return "/app/team";
    case "agent":
      return "/app/my-queue";
    case "resolver":
      return "/app/my-queue?filter=escalated";
    case "requester":
      return "/portal";
    default:
      return "/app";
  }
}

export function platformRoleHome(role: PlatformRole | null): string {
  switch (role) {
    case "super_admin":
      return "/platform";
    case "support":
      return "/platform?tab=tenants";
    case "billing_admin":
      return "/platform?tab=billing";
    default:
      return "/platform";
  }
}

/**
 * Decide the post-login destination for a user.
 * - Platform-only users (no tenant memberships) → platform console.
 * - Otherwise → tenant role home.
 */
export function postLoginRedirect(opts: {
  platformRole: PlatformRole | null;
  hasMemberships: boolean;
  tenantRole: AppRole | null;
  fallback?: string;
}): string {
  const { platformRole, hasMemberships, tenantRole, fallback } = opts;
  if (platformRole && !hasMemberships) return platformRoleHome(platformRole);
  if (tenantRole) return tenantRoleHome(tenantRole);
  return fallback ?? "/app";
}
