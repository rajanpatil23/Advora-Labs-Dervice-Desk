# Backend Setup Guide (for the local AI agent)

The frontend is a **multi-tenant SaaS** (each customer company = isolated org). It ships
fully working with mock data. To plug in a real backend:

## 1. Read the contract

Implement the REST endpoints in [`API_CONTRACT.md`](./API_CONTRACT.md). TypeScript shapes
live in [`src/lib/types.ts`](./src/lib/types.ts) — every business entity has an `org_id`
column that is the tenant boundary.

## 2. MVP endpoints

These are the minimum endpoints needed for the frontend to fully replace mocks:

- `POST /auth/login`
- `POST /auth/signup`
- `POST /auth/logout`
- `GET  /auth/me`
- `GET  /auth/memberships`
- `POST /auth/switch-org`
- `GET  /health`

Tickets, incidents, KB etc. can come later — pages currently read from a local
in-memory store (`src/lib/store.ts`) seeded with realistic per-org data.

## 3. Multi-tenancy rules (CRITICAL)

| Rule | Why |
|---|---|
| Every business table has `org_id NOT NULL` + index | Tenant boundary |
| Every list query filters by `org_id = jwt.current_org_id` | Hard isolation |
| Every write checks `has_role(user_id, org_id, required_role)` | Access control |
| JWT carries `sub` + `current_org_id` | Org switching |
| `/auth/switch-org` re-issues the JWT | Session is per-org |
| Use Postgres RLS, not just app-level WHERE | Defence in depth |
| Requesters auto-filtered by `requester_id = user_id` | Customer privacy |

### Recommended Postgres RLS pattern

```sql
-- 1. Roles enum
CREATE TYPE app_role AS ENUM ('owner','admin','manager','agent','resolver','requester');

-- 2. Memberships table
CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role    app_role NOT NULL,
  team_id uuid,
  is_active boolean DEFAULT true,
  UNIQUE(user_id, org_id)
);

-- 3. Security-definer helpers (avoid RLS recursion!)
CREATE FUNCTION has_role(_uid uuid, _org uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = _uid AND org_id = _org AND role = _role AND is_active
  )
$$;

CREATE FUNCTION is_member(_uid uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = _uid AND org_id = _org AND is_active
  )
$$;

-- 4. Example: tickets table with RLS
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  /* ...other columns... */
  CHECK (org_id IS NOT NULL)
);
CREATE INDEX ON tickets (org_id);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read tickets in their org" ON tickets
FOR SELECT TO authenticated
USING ( is_member(auth.uid(), org_id) );

CREATE POLICY "agents+ create tickets in their org" ON tickets
FOR INSERT TO authenticated
WITH CHECK (
  is_member(auth.uid(), org_id)
  AND has_role(auth.uid(), org_id, 'agent')   -- or admin/owner/manager via OR
);
```

## 4. Point the frontend at it

```
VITE_API_BASE_URL=https://your-backend.example.com
```

Restart vite. No frontend code changes needed.

## 5. Fallback behaviour

`src/lib/api/client.ts`:
- Empty `VITE_API_BASE_URL` → all calls hit the in-browser mock.
- Set + reachable → real backend. `4xx` errors surface to user.
- Set + unreachable → silent fallback to mock (so demos never break).

## 6. Seed data

5 demo users, password = `demo`. They span 3 orgs to demonstrate the org switcher:

| Email                  | Memberships |
|------------------------|------------------------------------------------|
| admin@demo.com         | **owner** of Acme Cloud, **admin** of Globex   |
| manager@demo.com       | **manager** of Acme Cloud, **manager** of Initech Health |
| agent@demo.com         | **agent** of Acme Cloud                        |
| resolver@demo.com      | **resolver** of Globex, **resolver** of Initech |
| requester@demo.com     | **requester** of Acme Cloud                    |

Mirror these in your DB for a smooth handoff.

## 7. CORS

Allow the frontend origin. Local dev: `http://localhost:5173`.
