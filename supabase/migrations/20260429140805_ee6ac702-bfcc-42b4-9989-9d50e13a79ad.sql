-- ============================================================
-- 1. Platform role enum
-- ============================================================
CREATE TYPE public.platform_role AS ENUM ('super_admin', 'support', 'billing_admin');

-- ============================================================
-- 2. Organization status enum + columns
-- ============================================================
CREATE TYPE public.org_status AS ENUM ('active', 'suspended');

ALTER TABLE public.organizations
  ADD COLUMN status public.org_status NOT NULL DEFAULT 'active',
  ADD COLUMN suspended_at TIMESTAMPTZ,
  ADD COLUMN suspended_reason TEXT;

-- ============================================================
-- 3. platform_admins table
-- ============================================================
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role public.platform_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. Helper functions (SECURITY DEFINER, no recursion risk)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id UUID, _role public.platform_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND role = _role AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_platform_role(_user_id UUID, _roles public.platform_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND role = ANY(_roles) AND is_active = true
  );
$$;

-- ============================================================
-- 5. Audit log (append-only)
-- ============================================================
CREATE TABLE public.platform_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_org_id UUID,
  target_user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_audit_actor ON public.platform_audit_log(actor_id);
CREATE INDEX idx_platform_audit_org ON public.platform_audit_log(target_org_id);
CREATE INDEX idx_platform_audit_created ON public.platform_audit_log(created_at DESC);

ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS for platform_admins
-- ============================================================
CREATE POLICY "platform_admins read self"
ON public.platform_admins FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "super_admins read all platform_admins"
ON public.platform_admins FOR SELECT TO authenticated
USING (public.has_platform_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admins insert platform_admins"
ON public.platform_admins FOR INSERT TO authenticated
WITH CHECK (public.has_platform_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admins update platform_admins"
ON public.platform_admins FOR UPDATE TO authenticated
USING (public.has_platform_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_platform_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admins delete platform_admins"
ON public.platform_admins FOR DELETE TO authenticated
USING (public.has_platform_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 7. RLS for platform_audit_log (append-only, gated reads)
-- ============================================================
CREATE POLICY "platform staff read audit log"
ON public.platform_audit_log FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "platform staff insert audit log"
ON public.platform_audit_log FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()) AND actor_id = auth.uid());
-- No UPDATE / DELETE policies => append-only

-- ============================================================
-- 8. Extend existing RLS so platform staff can read tenant data
--    (tenants still scoped by membership; platform staff get an OR branch)
-- ============================================================
CREATE POLICY "platform staff read all orgs"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "platform staff read all memberships"
ON public.memberships FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "platform staff read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Only super_admins can suspend / update orgs platform-wide
CREATE POLICY "super_admins update any org"
ON public.organizations FOR UPDATE TO authenticated
USING (public.has_platform_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_platform_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 9. Suspend / resume RPCs (auto-audit)
-- ============================================================
CREATE OR REPLACE FUNCTION public.platform_suspend_org(_org_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admins can suspend organizations';
  END IF;

  UPDATE public.organizations
  SET status = 'suspended', suspended_at = now(), suspended_reason = _reason
  WHERE id = _org_id;

  INSERT INTO public.platform_audit_log (actor_id, action, target_org_id, metadata)
  VALUES (auth.uid(), 'org.suspend', _org_id, jsonb_build_object('reason', _reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_resume_org(_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admins can resume organizations';
  END IF;

  UPDATE public.organizations
  SET status = 'active', suspended_at = NULL, suspended_reason = NULL
  WHERE id = _org_id;

  INSERT INTO public.platform_audit_log (actor_id, action, target_org_id)
  VALUES (auth.uid(), 'org.resume', _org_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_grant_role(_user_id UUID, _role public.platform_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admins can grant platform roles';
  END IF;

  INSERT INTO public.platform_admins (user_id, role, created_by)
  VALUES (_user_id, _role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, is_active = true, updated_at = now();

  INSERT INTO public.platform_audit_log (actor_id, action, target_user_id, metadata)
  VALUES (auth.uid(), 'platform.grant_role', _user_id, jsonb_build_object('role', _role));
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_revoke_role(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admins can revoke platform roles';
  END IF;

  UPDATE public.platform_admins SET is_active = false, updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.platform_audit_log (actor_id, action, target_user_id)
  VALUES (auth.uid(), 'platform.revoke_role', _user_id);
END;
$$;

-- ============================================================
-- 10. Block writes on suspended orgs (guard at create_organization
--     and add a generic guard helper used by app code & future tables)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_org_active(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT status = 'active' FROM public.organizations WHERE id = _org_id), false);
$$;

-- Prevent invites being created on suspended orgs
CREATE POLICY "no invites on suspended orgs"
ON public.invites FOR INSERT TO authenticated
WITH CHECK (public.is_org_active(org_id));