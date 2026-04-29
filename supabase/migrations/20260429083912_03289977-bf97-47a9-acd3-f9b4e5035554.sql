
-- Internal helpers — only used inside RLS / SQL; no need for client execute.
REVOKE ALL ON FUNCTION public.is_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_any_role(UUID, UUID, public.app_role[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.role_in_org(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- User-facing RPCs — authenticated only, never anon.
REVOKE ALL ON FUNCTION public.create_organization(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.accept_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.switch_org(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_org(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_invite_by_token(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO authenticated;
