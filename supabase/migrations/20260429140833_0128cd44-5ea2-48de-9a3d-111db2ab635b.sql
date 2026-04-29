-- Revoke EXECUTE from anon for all platform-related SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_platform_role(UUID, public.platform_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_any_platform_role(UUID, public.platform_role[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_active(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_suspend_org(UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_resume_org(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_grant_role(UUID, public.platform_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_revoke_role(UUID) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_platform_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_platform_role(UUID, public.platform_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_platform_role(UUID, public.platform_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_suspend_org(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_resume_org(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_grant_role(UUID, public.platform_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_revoke_role(UUID) TO authenticated;