
-- =========================================================
-- 1. ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent', 'resolver', 'requester');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- =========================================================
-- 2. TIMESTAMP TRIGGER FN
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 3. PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  current_org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 4. ORGANIZATIONS
-- =========================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_orgs_updated
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. TEAMS
-- =========================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_teams_updated
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_teams_org ON public.teams(org_id);

-- =========================================================
-- 6. MEMBERSHIPS  (user ↔ org with role + optional team)
-- =========================================================
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_memberships_updated
BEFORE UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_org ON public.memberships(org_id);

-- =========================================================
-- 7. INVITES
-- =========================================================
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status public.invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_by UUID,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_invites_updated
BEFORE UPDATE ON public.invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_invites_org ON public.invites(org_id);
CREATE INDEX idx_invites_token ON public.invites(token);

-- =========================================================
-- 8. SECURITY-DEFINER HELPERS  (avoid RLS recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND org_id = _org_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND org_id = _org_id AND role = _role AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _org_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND org_id = _org_id AND role = ANY(_roles) AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.role_in_org(_user_id UUID, _org_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.memberships
  WHERE user_id = _user_id AND org_id = _org_id AND is_active = true
  LIMIT 1;
$$;

-- =========================================================
-- 9. RLS POLICIES — PROFILES
-- =========================================================
CREATE POLICY "users read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "users read profiles of co-members"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.memberships m1
    JOIN public.memberships m2 ON m1.org_id = m2.org_id
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = profiles.id
      AND m1.is_active AND m2.is_active
  )
);

CREATE POLICY "users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =========================================================
-- 10. RLS POLICIES — ORGANIZATIONS
-- =========================================================
CREATE POLICY "members read their orgs"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_member(auth.uid(), id));

CREATE POLICY "any authed user can create org"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "admins update their org"
ON public.organizations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), id, 'admin'))
WITH CHECK (public.has_role(auth.uid(), id, 'admin'));

CREATE POLICY "admins delete their org"
ON public.organizations FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), id, 'admin'));

-- =========================================================
-- 11. RLS POLICIES — TEAMS
-- =========================================================
CREATE POLICY "members read teams in their orgs"
ON public.teams FOR SELECT TO authenticated
USING (public.is_member(auth.uid(), org_id));

CREATE POLICY "admins+managers manage teams"
ON public.teams FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), org_id, ARRAY['admin','manager']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), org_id, ARRAY['admin','manager']::public.app_role[]));

-- =========================================================
-- 12. RLS POLICIES — MEMBERSHIPS
-- =========================================================
CREATE POLICY "users read own memberships"
ON public.memberships FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "members read co-members in same org"
ON public.memberships FOR SELECT TO authenticated
USING (public.is_member(auth.uid(), org_id));

-- A user can create their OWN membership only when there is no membership yet
-- for that org (used by org-creation flow + invite-accept flow). Admins/managers
-- create memberships for other users via the accept-invite RPC (security definer).
CREATE POLICY "user inserts own membership"
ON public.memberships FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins update memberships"
ON public.memberships FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), org_id, 'admin'))
WITH CHECK (public.has_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "admins delete memberships"
ON public.memberships FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), org_id, 'admin'));

-- =========================================================
-- 13. RLS POLICIES — INVITES
-- =========================================================
CREATE POLICY "admins+managers read invites in their org"
ON public.invites FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), org_id, ARRAY['admin','manager']::public.app_role[]));

CREATE POLICY "admins+managers create invites"
ON public.invites FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND public.has_any_role(auth.uid(), org_id, ARRAY['admin','manager']::public.app_role[])
);

CREATE POLICY "admins+managers update invites"
ON public.invites FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), org_id, ARRAY['admin','manager']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), org_id, ARRAY['admin','manager']::public.app_role[]));

CREATE POLICY "admins+managers delete invites"
ON public.invites FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), org_id, ARRAY['admin','manager']::public.app_role[]));

-- =========================================================
-- 14. RPCs FOR ONBOARDING
-- =========================================================

-- Create the very first org for the signed-in user, plus a default team,
-- plus an admin membership. Returns the new org id.
CREATE OR REPLACE FUNCTION public.create_organization(
  _org_name TEXT,
  _team_name TEXT DEFAULT 'Support'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_org_id UUID;
  v_team_id UUID;
  v_slug TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _org_name IS NULL OR length(trim(_org_name)) = 0 THEN
    RAISE EXCEPTION 'Organization name required';
  END IF;

  v_slug := lower(regexp_replace(trim(_org_name), '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 6);

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (trim(_org_name), v_slug, v_user)
  RETURNING id INTO v_org_id;

  INSERT INTO public.teams (org_id, name)
  VALUES (v_org_id, COALESCE(NULLIF(trim(_team_name), ''), 'Support'))
  RETURNING id INTO v_team_id;

  INSERT INTO public.memberships (user_id, org_id, role, team_id)
  VALUES (v_user, v_org_id, 'admin', v_team_id);

  UPDATE public.profiles SET current_org_id = v_org_id WHERE id = v_user;

  RETURN v_org_id;
END;
$$;

-- Lookup an invite by token (public-readable through this function only).
-- Returns minimal fields needed to render the accept page.
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  org_name TEXT,
  email TEXT,
  role public.app_role,
  team_id UUID,
  team_name TEXT,
  status public.invite_status,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.org_id, o.name, i.email, i.role, i.team_id, t.name,
         i.status, i.expires_at
  FROM public.invites i
  JOIN public.organizations o ON o.id = i.org_id
  LEFT JOIN public.teams t ON t.id = i.team_id
  WHERE i.token = _token;
$$;

-- Accept an invite: creates the membership, marks invite accepted, sets active org.
CREATE OR REPLACE FUNCTION public.accept_invite(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_invite public.invites%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.invites WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'Invite is not pending'; END IF;
  IF v_invite.expires_at < now() THEN
    UPDATE public.invites SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  INSERT INTO public.memberships (user_id, org_id, role, team_id)
  VALUES (v_user, v_invite.org_id, v_invite.role, v_invite.team_id)
  ON CONFLICT (user_id, org_id) DO UPDATE
    SET role = EXCLUDED.role, team_id = EXCLUDED.team_id, is_active = true;

  UPDATE public.invites
  SET status = 'accepted', accepted_by = v_user, accepted_at = now()
  WHERE id = v_invite.id;

  UPDATE public.profiles SET current_org_id = v_invite.org_id WHERE id = v_user;

  RETURN v_invite.org_id;
END;
$$;

-- Switch the active org for the signed-in user (must be a member).
CREATE OR REPLACE FUNCTION public.switch_org(_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_member(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;
  UPDATE public.profiles SET current_org_id = _org_id WHERE id = auth.uid();
END;
$$;
