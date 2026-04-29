# API Contract

This document is the **single source of truth** for the backend that powers Connecttly.
The frontend speaks REST with JSON. All endpoints below are consumed by `src/lib/api/*`.

While the backend isn't ready, every call is served by an in-browser mock
(`src/lib/api/mock.ts`) that returns realistic data so the UI is fully usable.

## Conventions

- **Base URL**: configured via `VITE_API_BASE_URL` (e.g. `https://api.connecttly.com`).
  When empty, the frontend uses the mock layer and never hits the network.
- **Content-Type**: `application/json` on every request and response.
- **Auth**: Bearer token in `Authorization: Bearer <token>` header.
  Token is obtained from `POST /auth/login` or `POST /auth/signup`.
- **Errors**: non-2xx responses should return `{ "error": "<human message>" }`.
  HTTP status codes follow standard semantics (400, 401, 403, 404, 409, 422, 500).
- **Timestamps**: ISO 8601 strings (e.g. `"2026-04-29T10:00:00Z"`).
- **IDs**: opaque strings. The mock uses prefixes (`u_`, `t_`, `org_`) but the real backend can use UUIDs.

## Roles

```ts
type AppRole = "admin" | "manager" | "agent" | "resolver" | "requester";
```

---

## 1. Auth

### `POST /auth/login`
Sign in with email + password.

**Request**
```json
{ "email": "admin@demo.com", "password": "demo" }
```

**Response 200**
```json
{
  "token": "jwt-string",
  "user": {
    "id": "u_admin",
    "email": "admin@demo.com",
    "full_name": "Alex Admin",
    "avatar_color": "#6366f1",
    "initials": "AA",
    "role": "admin",
    "org_id": "org_acme",
    "org_name": "Acme Cloud",
    "team_id": "team_ops",
    "team_name": "Operations"
  }
}
```

**Errors**: `401 Invalid email or password`

---

### `POST /auth/signup`
Create a new account + a new organization. Caller becomes its admin.

**Request**
```json
{ "email": "new@example.com", "password": "secret", "full_name": "Jane Doe" }
```

**Response 200**: same shape as `/auth/login`. Newly created `org_id` returned.

**Errors**: `409 Email already registered`, `422 Invalid input`

---

### `POST /auth/logout`
Invalidate the current bearer token. Requires auth.

**Response**: `204 No Content`

---

### `GET /auth/me`
Return the currently authenticated user. Requires auth.

**Response 200**: same `user` object as `/auth/login`.

---

### `GET /auth/memberships`
List orgs the current user belongs to. Requires auth.

**Response 200**
```json
[
  {
    "id": "mem_xxx",
    "org_id": "org_acme",
    "org_name": "Acme Cloud",
    "role": "admin",
    "team_id": "team_ops",
    "team_name": "Operations",
    "is_active": true
  }
]
```

---

## 2. Tickets *(not yet wired — frontend uses local store)*

> The frontend currently reads tickets from `src/lib/store.ts`. When you implement the
> endpoints below, swap each page's store calls with `apiCall(...)` from `src/lib/api/client.ts`.

```
GET    /tickets                    ?status=&priority=&assignee_id=&q=&limit=&offset=
GET    /tickets/:id
POST   /tickets                    body: { title, description, requester_id, assignee_id?, priority, category, channel? }
PATCH  /tickets/:id                body: any subset of ticket fields
DELETE /tickets/:id

GET    /tickets/:id/messages
POST   /tickets/:id/messages       body: { body: string, is_internal: boolean }

GET    /tickets/:id/activity
```

Ticket shape: see `src/lib/types.ts` → `Ticket`.

---

## 3. Incidents

```
GET    /incidents                  ?status=&severity=&owner_id=
GET    /incidents/:id
POST   /incidents                  body: { title, service, severity, owner_id, affected? }
PATCH  /incidents/:id
DELETE /incidents/:id
```

Shape: `src/lib/types.ts` → `Incident`.

---

## 4. Service Requests

```
GET    /service-requests            ?status=&requester_id=
GET    /service-requests/:id
POST   /service-requests            body: { item_id, requester_id }
PATCH  /service-requests/:id        body: { status?, approver? }

GET    /catalog                     # service catalog items
```

Shape: `ServiceRequest`, `ServiceRequestItem` in `types.ts`.

---

## 5. Users / Agents

```
GET    /users                       ?role=&team=&q=
GET    /users/:id
PATCH  /users/:id                   body: { role?, team_id?, full_name? }

GET    /agents                      # users with role=agent + workload stats
GET    /agents/:id
```

Shape: `User`, `Agent` in `types.ts`.

---

## 6. SLA Policies

```
GET    /sla-policies
POST   /sla-policies                body: { name, priority, response_mins, resolution_mins, active }
PATCH  /sla-policies/:id
DELETE /sla-policies/:id
```

Shape: `SlaPolicy` in `types.ts`.

---

## 7. Knowledge Base

```
GET    /kb/articles                 ?category=&q=
GET    /kb/articles/:id
POST   /kb/articles                 body: { title, category, body, author }
PATCH  /kb/articles/:id
DELETE /kb/articles/:id
```

Shape: `KbArticle` in `types.ts`.

---

## 8. Activity Logs

```
GET    /logs                        ?type=&actor=&from=&to=&limit=
```

Shape: `LogEntry` in `types.ts`.

---

## 9. Invites *(planned)*

```
GET    /invites/:token              # public — preview
POST   /invites                     body: { email, role, team_id?, org_id }
POST   /invites/:token/accept       # auth required, joins org
DELETE /invites/:id
```

---

## 10. Health

```
GET /health      → { "status": "ok" }
```
Used by uptime checks. No auth required.
