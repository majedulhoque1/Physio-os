# Multi-Product SaaS Admin — Design Spec

**Date:** 2026-04-15
**Status:** Draft, pending implementation plan

## Context

Today's Super Admin dashboard is Physio-OS-only. A second product (Construction OS, separate Supabase project `rxhylzbhefghieonnlny`) was bolted on via an edge-function bridge, but:

1. The bridge currently fails with `Construction OS bridge failed (400)` — the remote `admin-bridge` target is either not deployed, not reachable, or rejects the current payload shape / auth.
2. Billing, subscriptions, and tenant lifecycle are modeled around a single product (`clinic_*` tables). There is no abstraction for future products (PetSheba, Noore, etc.).
3. Subscription management actions (`sa_approve_subscription`, etc.) only cover Physio OS clinics.

Goal: evolve this project into a **product-agnostic SaaS control plane** that owns tenants, users, subscriptions, and billing centrally, and talks to each product's own Supabase project through a standard bridge contract. New products plug in by (a) inserting a row in a `products` registry and (b) implementing the bridge contract.

## Part 1 — Bridge 400 Fix (immediate)

**Diagnosis steps (to run before coding):**

1. Check the deployed `construction-os-bridge` edge function on *this* project — confirm `SUPER_ADMIN_EMAIL` and `PRODUCT_B_ADMIN_SECRET` secrets are set.
2. `curl` the remote `https://rxhylzbhefghieonnlny.supabase.co/functions/v1/admin-bridge` directly with the `x-admin-secret` header and body `{"action":"list_tenants"}` to see its real response.
3. If the remote returns 400, the remote function's expected payload shape differs — align contracts (see Part 3).

**Short-term fix:** update [src/lib/constructionOsBridge.ts:55-69](src/lib/constructionOsBridge.ts#L55-L69) `getBridgeErrorMessage` to surface the *remote* error body instead of collapsing to the generic `Construction OS bridge failed (400)` — so the real cause surfaces in the UI. Pass through `data` JSON when present.

**Structural fix:** replace the hardcoded `BRIDGE_URL` in [supabase/functions/construction-os-bridge/index.ts:10](supabase/functions/construction-os-bridge/index.ts#L10) with a lookup into the new `products` table (Part 2) so each product's bridge URL + secret are configured, not hardcoded.

## Part 2 — Data Model (Hub-Owned, Product-Agnostic)

New / renamed tables (hub-owned):

```
products (registry)
  product_key text primary key        -- 'physio_os', 'construction_os', 'petsheba'
  display_name text
  supabase_url text                   -- each product's Supabase project URL
  bridge_secret_name text             -- env var name in hub (e.g. 'PRODUCT_B_ADMIN_SECRET')
  status text                         -- 'active' | 'disabled'
  created_at timestamptz

tenants (rename-or-view over existing clinics)
  id uuid primary key
  product_key text references products
  external_id text                    -- id in the product's own project (e.g. clinic_id, org_id)
  name text
  owner_email text
  status text                         -- 'active' | 'suspended' | 'deleted'
  created_at timestamptz
  unique (product_key, external_id)

tenant_subscriptions (rename from clinic_subscriptions, add product_key)
  id uuid
  tenant_id uuid references tenants
  product_key text references products
  plan_key text references subscription_plans
  status text                         -- 'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete'
  trial_ends_at, current_period_start, current_period_end, upgrade_requested_at
  ...

subscription_plans
  plan_key text primary key
  product_key text references products  -- plans are per-product
  display_name, monthly_price_cents, currency, features jsonb

subscription_invoices (add product_key, rename clinic_id → tenant_id)
```

Physio OS tenants keep existing `clinic_id` as `external_id`. A view `v_physio_clinics` preserves current queries; the actual clinics table inside Physio OS's own domain stays where it is — the hub's `tenants` row just *references* it by `external_id`.

**Migration path:**
1. Create `products` table, seed `physio_os` + `construction_os`.
2. Create `tenants`, backfill from `clinics` (one row per clinic with `product_key='physio_os'`, `external_id=clinic_id`).
3. Add `product_key`, `tenant_id` columns to `clinic_subscriptions` + `subscription_invoices`; backfill.
4. Rename tables (`clinic_subscriptions` → `tenant_subscriptions`, etc.) in a second migration once callers updated.
5. Update RPCs (`sa_approve_subscription`, `sa_create_tenant_*`, `is_subscription_locked`, `get_my_subscription`) to take `tenant_id` + `product_key` instead of `clinic_id`.

## Part 3 — Bridge Contract (Standard Per-Product)

Every product's admin edge function must implement the same JSON contract. One generic hub edge function `product-bridge` replaces the product-specific `construction-os-bridge`:

**Hub request to product (server→server, from hub edge function):**
```json
POST {products.supabase_url}/functions/v1/admin-bridge
Header: x-admin-secret: <env[products.bridge_secret_name]>
Body: { "action": "<action>", ...params }
```

**Actions (all products must support):**
- `list_tenants` → `{ tenants: [{ external_id, name, user_count, created_at }] }`
- `get_tenant` → `{ tenant, tables: {...} }`
- `list_users` → `{ users: [...] }`
- `disable_user`, `enable_user`, `reassign_user`
- `suspend_tenant`, `resume_tenant`, `delete_tenant`

**Response envelope (standardized):**
```json
{ "success": true, "result": ... }   // or
{ "success": false, "error": "..." }
```

Both Physio OS (in-project, no bridge needed — direct DB access) and Construction OS (via bridge) surface through the same client-side abstraction:

```ts
// src/lib/productBridge.ts
getProductClient(product_key).listTenants()
// routes to direct supabase query for in-project products,
// or to product-bridge edge function for remote ones.
```

## Part 4 — Subscription Management (Cross-Product)

All subscription RPCs become product-agnostic:

- `sa_approve_subscription(p_tenant_id, p_plan_key)` — validates plan belongs to tenant's product
- `sa_change_plan(p_tenant_id, p_plan_key)`
- `sa_cancel_subscription(p_tenant_id)`
- `sa_extend_trial(p_tenant_id, p_days)`

Billing dashboard shows **unified MRR/ARR across products**, filterable by `product_key`. Invoice list, overdue tenants, trial expirations — all one view.

Subscription lock enforcement (`is_subscription_locked`) stays product-local — each product checks its own tenant's subscription via a lightweight RPC `check_tenant_subscription(external_id, product_key)` exposed from hub.

## Part 5 — Super Admin UI

Sidebar already has the `Products` dropdown. Formalize:

- `/super-admin` — unified dashboard (total tenants, MRR across products, alerts, recent actions)
- `/super-admin/products/:product_key` — product-specific tenant list (driven by registry, not hardcoded)
- `/super-admin/products/:product_key/tenants/:id` — tenant detail (subscription, users, actions)
- `/super-admin/billing` — cross-product billing
- `/super-admin/settings/products` — manage registry (add/disable products, edit bridge config)

Tenant detail page exposes actions: **suspend, resume, delete, change plan, approve subscription, extend trial, disable/enable users, reassign user, reset password, impersonate** (if product supports). Each action maps to either a hub RPC (subscription stuff) or a bridge call (tenant/user stuff).

Drop hardcoded `productItems` in [src/components/super-admin/SuperAdminShell.tsx:23-26](src/components/super-admin/SuperAdminShell.tsx#L23-L26); load from `products` registry via new `useProducts()` hook.

## Critical Files

- [src/lib/constructionOsBridge.ts](src/lib/constructionOsBridge.ts) → rename/generalize to `src/lib/productBridge.ts`
- [src/hooks/useConstructionOsTenants.ts](src/hooks/useConstructionOsTenants.ts) → `useProductTenants(product_key)`
- [src/components/super-admin/SuperAdminShell.tsx](src/components/super-admin/SuperAdminShell.tsx) — dynamic nav from registry
- [supabase/functions/construction-os-bridge/index.ts](supabase/functions/construction-os-bridge/index.ts) → `supabase/functions/product-bridge/index.ts` (generic, reads registry)
- [supabase/migrations/20260415_fix_super_admin_email.sql](supabase/migrations/20260415_fix_super_admin_email.sql) — existing subscription RPCs to be generalized
- New migrations: `products` table, `tenants` table, rename/extend `clinic_subscriptions`
- [src/pages/super-admin/SuperAdminBilling.tsx](src/pages/super-admin/SuperAdminBilling.tsx) — rework for cross-product
- [src/pages/super-admin/products/ConstructionOsTenants.tsx](src/pages/super-admin/products/ConstructionOsTenants.tsx) — generalize into a single `ProductTenants` component driven by route param

## Verification

1. **Bridge bug:** load `/super-admin/products/construction-os`. Expect real error text from remote project, OR successful tenant list if env + remote are healthy.
2. **Registry:** insert a dummy third product row in `products`; confirm it appears in sidebar and renders an empty tenants page without code changes.
3. **Subscription actions:** on a Physio OS tenant detail page, call `sa_approve_subscription` via UI → confirm row updates + invoice inserted. Repeat on a Construction OS tenant — same RPC, same result.
4. **Cross-product billing:** billing dashboard shows both Physio OS and Construction OS MRR; filter toggle works.
5. **Data integrity:** after migration, existing Physio OS queries still work (verify `useTreatmentPlans`, `AdminDashboard`, clinic user signup path).
6. **RLS:** confirm non-super-admin users cannot query `products`, `tenants`, other products' subscriptions.

## Out of Scope (Future)

- Actual Stripe / payment gateway integration (still manual invoice approval flow)
- Impersonation tokens (needs separate security design)
- Multi-super-admin with roles (current single-email gate stays)
- PetSheba / Noore onboarding (spec'd as "product registry supports it" — actual integration is its own project)
