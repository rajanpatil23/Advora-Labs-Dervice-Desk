# Connecttly — Roles, Features & Multi-Tenant Blueprint

> Single source of truth for the product's role model, tenant lifecycle, and per-role feature surface.
> Modeled on production ITSM SaaS: **Jira Service Management, Freshservice, ServiceNow, Zendesk**.

---

## 1. Product positioning

**Connecttly is a multi-tenant IT Service Desk (ITSM) SaaS.**

- **Customer** = a company (tenant / organization).
- Each tenant gets isolated data, users, settings, branding, billing.
- Inside a tenant: IT staff handle **incidents**, **service requests**, **problems**, **changes**, **assets**, with **SLAs** and a **knowledge base**.
- **End users (employees of the tenant company) = requesters** — they only see a clean self-service portal.
- Above all tenants sits a **Platform layer** (Connecttly's own staff) that operates the SaaS: support, suspension, billing, audit.

### Inspiration map

| Capability | Reference product |
|---|---|
| Tenant model, role hierarchy | Freshservice, JSM |
| Requester portal + service catalog | ServiceNow Employee Center, JSM portal |
| SLA + business hours + escalations | Freshservice, Zendesk |
| Approvals on service requests | ServiceNow, JSM |
| Knowledge base | Zendesk Guide |
| Platform/operator console | Intercom internal, Linear admin |

---

## 2. Two-layer role model

```
┌─────────────────────────────────────────────────────┐
│ PLATFORM LAYER (Connecttly staff — operates SaaS)   │
│   super_admin   │  support  │  billing_admin        │
└─────────────────────────────────────────────────────┘
                         ▲
                         │ operates / supports
                         ▼
┌─────────────────────────────────────────────────────┐
│ TENANT LAYER (per organization — fully isolated)    │
│   owner → admin → manager → agent / resolver        │
│                              └→ requester (end user)│
└─────────────────────────────────────────────────────┘
```

### 2.1 Tenant roles (scoped to ONE org)

| Role | Who they are | Default home |
|---|---|---|
| **owner** | Founder / billing contact. Exactly one (transferable). | Dashboard + Billing alerts |
| **admin** | IT lead / workspace admin. Full config rights, no billing. | Dashboard |
| **manager** | Team lead for a group of agents/resolvers. | Team Dashboard |
| **agent** | L1 — handles tickets day-to-day. | My Queue |
| **resolver** | L2/L3 specialist for escalated work. | My Queue (escalated filter) |
| **requester** | End user / employee. Submits & tracks own requests. | **Portal** (separate UI) |

### 2.2 Platform roles (cross-tenant — Connecttly staff)

| Role | Purpose | Default home |
|---|---|---|
| **super_admin** | Full platform control: suspend orgs, grant platform roles, all data. | Platform Overview |
| **support** | Read-only across tenants for customer support. Can comment on platform tickets. | Platform Tenants |
| **billing_admin** | Manage plans, invoices, dunning across tenants. | Platform Billing |

> A user can be **both** a tenant member AND a platform admin (rare — typically founders during early days).

---

## 3. Tenant lifecycle

```
Sign up ──► Org created (free trial)
   │
   ├─► Onboarding wizard (5 steps)
   │     1. Org profile (name, logo, industry, timezone)
   │     2. Invite team (admins, agents)
   │     3. Pick categories (Hardware, Software, Access, …)
   │     4. SLA defaults (response/resolution per priority)
   │     5. Business hours + holidays
   │
   ├─► Active (trial → paid)
   │     • Usage tracked: agents, tickets/mo, storage
   │     • Plan upgrades, downgrades, add-ons
   │     • Invite flow ongoing
   │
   ├─► Past_due (failed payment)
   │     • Banner + grace period (7d)
   │
   ├─► Suspended (by platform OR non-payment)
   │     • Read-only banner; agents locked out; requesters can still read
   │     • is_org_active() RLS guard already exists ✓
   │
   └─► Deleted (owner-initiated, 30-day soft delete + export)
```

### Org settings the tenant controls

Branding (logo, color, subdomain) · Business hours & holidays · Categories & subcategories · Custom ticket fields · SLA policies · Automations (round-robin, auto-assign, auto-close) · Email channels & forwarding · Webhook endpoints · API tokens · Single Sign-On (SAML/OIDC) · Data retention · Export & delete.

---

## 4. Role × Feature matrix

Legend: ✅ full · 👁 read-only · 🚫 hidden · ⚠ scoped (own/team only)

### 4.1 Tickets / Incidents

| Capability | owner | admin | manager | agent | resolver | requester |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Create ticket on behalf of others | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 |
| Submit own ticket | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all org tickets | ✅ | ✅ | ✅ | 👁 | 👁 | 🚫 |
| View team tickets | — | — | ✅ | — | — | — |
| View own assigned | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| View own submitted | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign / reassign | ✅ | ✅ | ✅ (team) | ⚠ self only | ⚠ self only | 🚫 |
| Change priority / status | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 |
| Internal notes | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 |
| Public reply | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (own) |
| Merge / split tickets | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| Bulk actions | ✅ | ✅ | ✅ (team) | 🚫 | 🚫 | 🚫 |
| Delete ticket | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Escalate to L2 | ✅ | ✅ | ✅ | ✅ | — | 🚫 |
| Convert ticket → KB article | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 |

### 4.2 Service Requests & Catalog

| Capability | owner | admin | manager | agent | resolver | requester |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Browse catalog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit request | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit catalog items | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Approve requests | ✅ | ✅ | ✅ (team) | 🚫 | 🚫 | 🚫 |
| Fulfill requests | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 |

### 4.3 Knowledge Base

| Capability | owner | admin | manager | agent | resolver | requester |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Read public articles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read internal articles | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 |
| Author / edit | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 |
| Publish | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| Delete / archive | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |

### 4.4 Reports & Analytics

| Capability | owner | admin | manager | agent | resolver | requester |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Org-wide reports | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Team reports | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| Personal performance | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 |
| Export CSV | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 |

### 4.5 Org administration

| Capability | owner | admin | manager | agent | resolver | requester |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Invite users | ✅ | ✅ | ✅ (agent only) | 🚫 | 🚫 | 🚫 |
| Change user roles | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Remove users | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Manage teams | ✅ | ✅ | ✅ (own) | 🚫 | 🚫 | 🚫 |
| Edit org settings | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| SLA policies | ✅ | ✅ | 👁 | 👁 | 👁 | 🚫 |
| Automations | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Audit logs | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| **Billing & plan** | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Delete org** | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Transfer ownership** | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

### 4.6 Platform layer

| Capability | super_admin | support | billing_admin |
|---|:-:|:-:|:-:|
| List all tenants | ✅ | ✅ | ✅ |
| Suspend / resume tenant | ✅ | 🚫 | ✅ |
| Delete tenant | ✅ | 🚫 | 🚫 |
| Read tenant data (audited) | ✅ | ✅ | 👁 (billing only) |
| Impersonate tenant user (audited) | ✅ | ✅ | 🚫 |
| Manage plans & invoices | ✅ | 🚫 | ✅ |
| Grant / revoke platform roles | ✅ | 🚫 | 🚫 |
| Read audit log | ✅ | ✅ | ✅ |

---

## 5. Per-role information architecture

### Sidebar — what each role sees

```
owner / admin              manager           agent / resolver     requester (Portal)
─────────────────          ─────────────     ─────────────────    ──────────────────
Dashboard                  Team Dashboard    My Queue             Home
Tickets (all)              Team Tickets      Tickets (read)       Submit a Request
Incidents                  Incidents         Incidents (assigned) My Requests
Service Requests           Approvals         Service Requests     Service Catalog
Knowledge Base             Knowledge Base    Knowledge Base       Knowledge Base
Reports                    Team Reports      My Performance       —
Users & Teams              My Team           —                    —
SLA                        SLA (read)        SLA (read)           —
Automations (admin)        —                 —                    —
Audit Log (admin)          —                 —                    —
Settings                   —                 —                    Profile
Billing (owner only)       —                 —                    —
```

### Default landing page after login

| Role | Lands on |
|---|---|
| owner | `/app/dashboard` (with billing alerts widget) |
| admin | `/app/dashboard` |
| manager | `/app/team` |
| agent | `/app/my-queue` |
| resolver | `/app/my-queue?filter=escalated` |
| requester | `/portal` |
| super_admin | `/platform` |
| support | `/platform/tenants` |
| billing_admin | `/platform/billing` |

---

## 6. User journeys ("a day in the life")

### 6.1 Owner — Maya, founder of Acme
1. Logs in → Dashboard. Sees billing alert: "3 days left in trial."
2. Clicks **Upgrade** → picks Pro plan → Stripe checkout.
3. Reviews **Audit log** for the week (who changed SLAs, who removed users).
4. Goes to **Settings → Branding**, uploads logo.
5. Promotes a senior admin to co-owner (transfer ownership flow with email confirm).

### 6.2 Admin — Alex
1. **Dashboard** — checks SLA-at-risk count.
2. **Users** — invites 3 new agents, assigns them to Tier-1 team.
3. **Settings → SLA** — edits Critical priority response from 30 → 15 min.
4. **Automations** — creates rule: `if category=Network and priority=high → assign to NetOps team`.
5. **Service Catalog** — adds new item "Request VPN access" with manager-approval step.

### 6.3 Manager — Morgan, leads Customer Support team
1. **Team Dashboard** — 47 open, 3 SLA-at-risk, agent workload chart.
2. Reassigns 2 tickets from overloaded agent to a free one (drag-drop).
3. **Approvals** — 4 service requests awaiting → approves 3, rejects 1 with reason.
4. **Team Reports** — exports weekly CSAT/CSV for ops review.
5. Replies internally on a ticket flagged by an agent for guidance.

### 6.4 Agent — Avery
1. Lands on **My Queue** — 12 assigned tickets, sorted by SLA urgency.
2. Opens top one → public reply with steps from KB → status `in_progress`.
3. Internal note tagging resolver `@Riley please check the auth logs`.
4. Uses **canned responses** for a duplicate question.
5. Converts solved ticket into a KB draft (admin will publish).

### 6.5 Resolver — Riley, L2 specialist
1. **My Queue (escalated)** — 4 escalations.
2. Picks one → adds root-cause notes → links to **Incident**.
3. Updates **workaround** field; KB draft auto-suggested.
4. Hands back to agent with internal note.

### 6.6 Requester — Quinn, employee at Acme
1. Goes to `acme.connecttly.com/portal` — sees **Submit a Request**, **My Requests**, **Knowledge Base**.
2. Submits "Laptop screen flickering" → category auto-suggested → confirmation page with ticket #.
3. **My Requests** — tracks status, gets email + in-portal updates.
4. Replies to agent's question with screenshot.
5. After resolution → CSAT rating + comment.

### 6.7 super_admin — Sam (Connecttly staff)
1. **Platform Overview** — MRR, active tenants, suspended count, top users by ticket volume.
2. **Tenants** — searches "Initech" → sees plan, usage, last login.
3. Suspends a delinquent tenant with reason "non-payment" (logged to audit).
4. **Platform Admins** — grants `support` role to new hire.
5. **Audit Log** — reviews yesterday's impersonation events.

### 6.8 support — Sky (Connecttly staff)
1. **Tenants** → opens ticket from in-app help: "Acme can't see new agents."
2. Impersonates Acme's admin (audited, time-limited 30min) → reproduces issue.
3. Adds findings to internal ticket; escalates to engineering.

### 6.9 billing_admin
1. **Platform Billing** — failed-payment list, overdue invoices.
2. Sends dunning emails, applies credit, downgrades plan.

---

## 7. Gap analysis vs Freshservice / JSM / ServiceNow

| Area | We have | Missing (priority) |
|---|---|---|
| **Tenant onboarding** | Org+admin via signup | 🔴 5-step wizard, no defaults seeded |
| **Requester portal** | Tickets page (agent-style) | 🔴 Separate portal UI, catalog browse, CSAT |
| **Role-gated nav** | Partial | 🔴 Sidebar still shows admin items to agents |
| **Default landings** | Everyone → Dashboard | 🔴 Per-role home redirect |
| **Service catalog UI** | Data model only | 🟠 Item cards, request form, approval chain |
| **Approvals** | Field on ServiceRequest | 🟠 Manager approval inbox + actions |
| **SLA escalations** | Policies CRUD | 🟠 Background timer, breach actions, business hours |
| **Automations** | None | 🟠 Rule builder (trigger → condition → action) |
| **Custom fields** | None | 🟡 Per-org ticket fields |
| **Email channel** | None | 🟡 Inbound email → ticket (Mailgun/SES) |
| **CSAT** | None | 🟡 Post-resolution survey |
| **Reports** | Basic page | 🟡 Per-role scoping, exports |
| **Audit log (tenant)** | None | 🟡 Settings/role/data changes |
| **Plans & billing** | Mock only | 🟠 Stripe via Lovable Payments |
| **Suspension enforcement** | RLS guard exists | 🟠 UI banner + agent lockout, requester read-only |
| **Impersonation (platform)** | None | 🟠 Time-limited, audited token swap |
| **SSO (SAML/OIDC)** | None | 🟢 Enterprise plan |
| **Asset management** | None | 🟢 Phase 2 product |
| **Change management** | None | 🟢 Phase 2 product |

🔴 P0 (blocks "real SaaS") · 🟠 P1 · 🟡 P2 · 🟢 P3

---

## 8. Build phases (execution plan)

| Phase | Scope | Outcome |
|---|---|---|
| **1** | This document | Shared blueprint ✅ |
| **2** | Role-gated sidebar + per-role landing | Each role only sees what they need |
| **3** | Requester Portal at `/portal` | End-user self-service experience |
| **4** | Onboarding wizard | New tenants get a guided first run |
| **5** | Org settings hub | Admins configure branding/SLA/automations/billing |
| **6** | Approvals + service catalog flow | Requests flow through manager approval |
| **7** | Manager features | Team dashboard, workload, team reports |
| **8** | Platform console hardening | Suspension enforcement, impersonation, audit |

Each phase ends with frontend done, mock API updated, and a backend contract update in `API_CONTRACT.md`. Real Supabase wiring (RLS, RPCs, edge functions) follows in a parallel "backend" pass once the frontend shape is locked.

---

## 9. North-star principles

1. **Tenant isolation is sacred.** No cross-org reads, ever — except through the platform layer with audit.
2. **Roles narrow, never expand.** Lower roles get strict subsets. We never check "if not requester then…" — we check "if has role X".
3. **Requesters never see agent UI.** Different layout, different routes, different vocabulary ("request" not "ticket").
4. **Every destructive action is audited** — both inside tenants and at the platform layer.
5. **Defaults that just work.** New tenants ship with sensible categories, SLAs, business hours — they can edit later.
6. **Mobile-first for requesters, desktop-first for agents.** Different audiences, different ergonomics.
