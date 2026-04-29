import { apiCall } from "./client";
import type { PlatformRole, OrgStatus } from "./seedUsers";

export interface PlatformOrg {
  id: string;
  name: string;
  slug: string;
  industry: string;
  domain: string;
  status: OrgStatus;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  created_at: string;
  plan: "free" | "pro" | "enterprise";
  member_count: number;
}

export interface PlatformAdminRow {
  user_id: string;
  role: PlatformRole;
  is_active: boolean;
  created_at: string;
  email: string;
  full_name: string;
  initials: string;
  avatar_color: string;
}

export interface AuditEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action: string;
  target_org_id?: string | null;
  target_org_name?: string | null;
  target_user_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface PlatformStats {
  total_orgs: number;
  active_orgs: number;
  suspended_orgs: number;
  total_users: number;
  total_memberships: number;
  by_plan: Record<string, number>;
}

export const platformApi = {
  listOrgs:    () => apiCall<PlatformOrg[]>({ method: "GET",  path: "/platform/orgs", auth: true }),
  suspendOrg:  (org_id: string, reason?: string) =>
                 apiCall<PlatformOrg>({ method: "POST", path: "/platform/orgs/suspend", body: { org_id, reason }, auth: true }),
  resumeOrg:   (org_id: string) =>
                 apiCall<PlatformOrg>({ method: "POST", path: "/platform/orgs/resume", body: { org_id }, auth: true }),
  listAdmins:  () => apiCall<PlatformAdminRow[]>({ method: "GET", path: "/platform/admins", auth: true }),
  listAudit:   () => apiCall<AuditEntry[]>({ method: "GET", path: "/platform/audit", auth: true }),
  stats:       () => apiCall<PlatformStats>({ method: "GET", path: "/platform/stats", auth: true }),
};
