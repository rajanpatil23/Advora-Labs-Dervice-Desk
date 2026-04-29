# API Contract — Multi-Tenant SaaS

This document is the **single source of truth** for the backend that powers Connecttly.
Connecttly is a multi-tenant service desk SaaS — every customer company is an
**organization** with hard data isolation.

## Tenancy model

- **Organization** = tenant boundary. Acme, Globex, Initech each have isolated data.
- **User** = identity (one global record, one email).
- **Membership** = user × org × role × team. A user can belong to multiple orgs.
- **Current org** = the active workspace; every list endpoint is implicitly scoped to it.

### Role hierarchy (per org)

| Role        | Capabilities |
|-------------|---------------------------------------------------------------|
| `owner`     | Billing, delete org, transfer ownership. Full data access. |
| `admin`     | Manage users, teams, SLAs, settings. Full data access. |
| `manager`   | Assign tickets, view reports, manage their team. |
| `agent`     | Handle assigned tickets, reply to requesters. |
| `resolver`  | Specialist for escalated/L2-L3 work. Sees same tickets as agents. |
| `requester` | End user. Sees only own tickets. Cannot access agent UI. |

## Conventions

- **Base URL**: `VITE_API_BASE_URL`. Empty = use in-browser mock.
- **Auth**: `Authorization: Bearer <token>`.
- **Org scope**: server resolves the current org from the JWT (`current_org_id` claim).
  Frontend changes it via `POST /auth/switch-org`. The backend MUST refuse any list/read
  request for data outside the user's current org.
- **Errors**: `{ "error": "<message>" }`. HTTP status follows standard semantics.
- **Timestamps**: ISO 8601 strings.
- **Multi-tenancy enforcement**: every business table (`tickets`, `incidents`, etc.) has an
  `org_id` column. RLS / WHERE clauses must filter by `org_id = current_org_id()`.

---

## 1. Auth

### `POST /auth/login`
**Request**: `{ "email": "...", "password": "..." }`

**Response 200**:
```json
{
  "token": "jwt-string",
  "user": {
    "id": "u_admin",
    "email": "admin@demo.com",
    "full_name": "Alex Admin",
    "avatar_color": "#6366f1",
    "initials": "AA"
  },
  "memberships": [
    {
      "id": "mem_xxx",
      "org_id": "org_acme",
      "org_name": "Acme Cloud",
      "org_slug": "acme",
      "org_industry": "SaaS / Tech",
      "role": "owner",
      "team_id": "team_acme_support",
      "team_name": "Customer Support",
      "is_active": true
    }
  ],
  "current_org_id": "org_acme"
}
```

### `POST /auth/signup`
**Request**: `{ "email", "password", "full_name", "org_name" }`
Creates a new user **and** a new organization. User becomes `owner` of that org.
**Response 200**: same shape as login.

### `POST /auth/logout`  → `204 No Content`

### `GET /auth/me`  → returns the `user` object.

### `GET /auth/memberships`  → returns the `memberships` array.

### `POST /auth/switch-org`
**Request**: `{ "org_id": "org_globex" }`
Updates the JWT's `current_org_id` claim (or a server-side session).
**Response 200**: `{ "current_org_id": "org_globex" }`
**Errors**: `403` if user is not a member of that org.

---

## 2. Organizations

```
GET    /orgs                       # list orgs the user belongs to (same as /auth/memberships)
GET    /orgs/:id                   # org details
PATCH  /orgs/:id                   # admin/owner only — update name, logo, settings
DELETE /orgs/:id                   # owner only — delete the org and all its data
POST   /orgs                       # create a new org (caller becomes owner)
```

---

## 3. Teams (per org)

```
GET    /teams                      # teams in the current org
POST   /teams                      body: { name, description? }       # admin/manager
PATCH  /teams/:id
DELETE /teams/:id
```

---

## 4. Memberships (per org)

```
GET    /memberships                # users in the current org
POST   /memberships                body: { user_id, role, team_id? }   # admin only (typically via invite)
PATCH  /memberships/:id            body: { role?, team_id? }            # admin only
DELETE /memberships/:id            # admin only — removes user from org
```

---

## 5. Invites (per org)

```
GET    /invites/:token             # PUBLIC — preview invite info (org_name, role)
POST   /invites                    body: { email, role, team_id? }      # admin/manager
POST   /invites/:token/accept      # auth required, joins the org as the invited role
DELETE /invites/:id                # admin/manager
```

---

## 6. Tickets

All endpoints scoped to current org by JWT.

```
GET    /tickets                    ?status=&priority=&assignee_id=&q=&limit=&offset=
GET    /tickets/:id
POST   /tickets                    body: { title, description, requester_id, assignee_id?, priority, category, channel? }
PATCH  /tickets/:id
DELETE /tickets/:id

GET    /tickets/:id/messages
POST   /tickets/:id/messages       body: { body, is_internal }

GET    /tickets/:id/activity
```

**Requester restriction**: if `role = requester`, server must enforce `WHERE requester_id = current_user_id()` automatically.

Shape: `src/lib/types.ts` → `Ticket` (note `org_id` field).

---

## 7. Incidents · 8. Service Requests · 9. Knowledge Base · 10. SLA Policies · 11. Logs

Same pattern — all scoped to current org. See `src/lib/types.ts` for shapes (every entity has `org_id`).

```
GET/POST/PATCH/DELETE  /incidents[/:id]
GET/POST/PATCH/DELETE  /service-requests[/:id]
GET                    /catalog
GET/POST/PATCH/DELETE  /kb/articles[/:id]
GET/POST/PATCH/DELETE  /sla-policies[/:id]
GET                    /logs                  ?type=&actor=&from=&to=
```

---

## 12. Users / Agents (within current org)

```
GET    /users                       # all users in current org (memberships joined with profiles)
GET    /agents                      # users with role in (agent, resolver, manager, admin, owner) + workload stats
GET    /users/:id
PATCH  /users/:id                   # admin only
```

---

## 13. Health

`GET /health` → `{ "status": "ok" }`

---

## Multi-tenant enforcement checklist (for the backend AI)

1. Every table that holds business data has `org_id` not-null + indexed.
2. Every list query filters by `org_id = <jwt.current_org_id>`.
3. Every write validates the caller has an active membership in `org_id` AND has the required role.
4. JWT contains: `sub` (user_id), `current_org_id`. On `/auth/switch-org`, issue a new JWT.
5. Implement Postgres RLS (recommended) using a `has_role(user_id, org_id, role)` security-definer function.
6. Cross-org access is **never** allowed, even for owners — owner of Acme cannot see Globex data.
7. Requesters can only see their own tickets and service requests.
