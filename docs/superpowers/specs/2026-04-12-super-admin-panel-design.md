# Super Admin Panel — Design Spec

**Date**: 2026-04-12
**Status**: Approved
**Author**: Shakil + Claude

## Overview

A hidden SaaS management dashboard for Physio OS, accessible only to the platform owner (Shakil). Provides cross-tenant visibility, tenant provisioning, and subscription management. End-users never see or access this panel.

## Architecture

**Approach**: Hybrid A+C — routes inside the existing Vite/React app, all cross-tenant data fetched via Supabase `SECURITY DEFINER` RPC functions. No service role key on the client.

## Auth & Access

- Super admin gated by hardcoded email: `majedulhoqueofficials@gmail.com`
- Login via normal Supabase auth on `/login`
- `isSuperAdmin` boolean derived from `user.email` in `AuthContext`
- `/super-admin/*` routes redirect to `/` if user email doesn't match
- All RPC functions also verify `auth.jwt() ->> 'email'` server-side (double gate)
- Hidden "System" link on login page bottom-right — `text-[10px] text-muted-foreground/30`, nearly invisible

## Routes

| Route | Page | Purpose |
|---|---|---|
| `/super-admin` | `SuperAdminDashboard` | Platform overview stats + recent tenants |
| `/super-admin/tenants` | `SuperAdminTenants` | Searchable tenant list + create tenant modal |
| `/super-admin/tenants/:id` | `SuperAdminTenantDetail` | Tenant usage stats + subscription management |

## Features

### 1. Platform Overview Dashboard (`/super-admin`)

**Stat cards** (top row):
- Total clinics
- Total users (across all clinics)
- Active subscriptions
- MRR (monthly recurring revenue — sum of active subscription plan prices in cents, displayed in USD)

**Recent tenants table** (below stats):
- Last 10 clinics created
- Columns: clinic name, owner email, plan, subscription status, created date
- Each row links to tenant detail view

### 2. Tenant List & Creation (`/super-admin/tenants`)

**Tenant table**:
- Searchable by clinic name or owner email
- Columns: name, slug, owner email, plan_key, subscription status, created date
- Click row → navigate to `/super-admin/tenants/:id`
- Paginated (20 per page)

**Create Tenant modal** (button at top):
- Fields:
  - Clinic name (text, required)
  - Owner email (email, required) — creates new Supabase user or links existing
  - Initial plan (select: starter / pro / enterprise, default: starter)
  - Trial end date (date picker, optional)
- On submit: calls `sa_create_tenant` RPC
- RPC creates: clinic row, user_profile (if new user), clinic_membership (role=clinic_admin, status=active), clinic_subscription

### 3. Tenant Detail (`/super-admin/tenants/:id`)

**Header**: Clinic name, slug, owner name + email, created date

**Usage stat cards**:
- Total patients
- Total therapists
- Total appointments (all time)
- Active treatment plans

**Subscription Management section**:
- Current plan displayed as badge
- Plan dropdown (starter / pro / enterprise) + "Update" button
- Status dropdown (trialing / active / past_due / cancelled) + "Update" button
- Trial end date picker + "Update" button
- Current period start/end display (read-only)
- All updates via `sa_update_subscription` RPC

## Supabase RPC Functions

All functions use `SECURITY DEFINER` and check `auth.jwt() ->> 'email' = 'majedulhoqueofficials@gmail.com'` as the first operation. If the check fails, the function raises an exception.

### `sa_platform_stats()`

Returns JSON:
```json
{
  "total_clinics": 12,
  "total_users": 45,
  "active_subscriptions": 10,
  "mrr_cents": 49900
}
```

Queries: `count(clinics)`, `count(user_profiles)`, `count(clinic_subscriptions where status in ('active','trialing'))`, `sum(subscription_plans.monthly_price_cents) for active subscriptions`.

### `sa_list_tenants(p_search text default null, p_limit int default 20, p_offset int default 0)`

Returns table of:
- `clinic_id`, `clinic_name`, `slug`, `owner_email`, `owner_name`, `plan_key`, `subscription_status`, `created_at`

Joins: `clinics` → `user_profiles` (via `owner_user_id`) → `auth.users` (for email) → `clinic_subscriptions`.

Search filters on `clinics.name ILIKE` or `auth.users.email ILIKE`.

### `sa_tenant_detail(p_clinic_id uuid)`

Returns JSON:
```json
{
  "clinic": { "id", "name", "slug", "owner_user_id", "created_at" },
  "owner": { "email", "full_name" },
  "subscription": { "plan_key", "status", "trial_ends_at", "current_period_start", "current_period_end" },
  "stats": {
    "total_patients": 120,
    "total_therapists": 5,
    "total_appointments": 800,
    "active_treatment_plans": 30
  }
}
```

### `sa_create_tenant(p_clinic_name text, p_owner_email text, p_plan_key text default 'starter', p_trial_end timestamptz default null)`

Steps (in transaction):
1. Check if user exists in `auth.users` by email. If not, create via `auth.admin_create_user` (requires service role — this function runs as SECURITY DEFINER with superuser).
2. Create `user_profiles` row if not exists.
3. Generate slug from clinic name (lowercase, hyphenated, append random suffix if collision).
4. Insert into `clinics` with `owner_user_id`.
5. Insert into `clinic_memberships` (role=clinic_admin, status=active).
6. Insert into `clinic_subscriptions` with plan_key, status='trialing', trial_ends_at.
7. Return the new clinic_id.

**Note**: `auth.admin_create_user` is only available to superuser/service_role. The SECURITY DEFINER function must be owned by a role with sufficient privileges (e.g., `postgres`). A temporary password will be generated; the owner can reset via forgot-password flow.

### `sa_update_subscription(p_clinic_id uuid, p_plan_key text default null, p_status text default null, p_trial_end timestamptz default null)`

Updates `clinic_subscriptions` for the given clinic. Only non-null parameters are updated. Returns the updated subscription row.

## File Structure

```
src/
  pages/super-admin/
    SuperAdminDashboard.tsx    # Platform overview
    SuperAdminTenants.tsx      # Tenant list + create
    SuperAdminTenantDetail.tsx # Single tenant view + subscription mgmt
  components/super-admin/
    SuperAdminShell.tsx        # Layout with dark sidebar
    CreateTenantModal.tsx      # Tenant creation form modal
    SAStatCard.tsx             # Stat card component for super admin
  hooks/
    useSuperAdmin.ts           # All RPC call hooks
  lib/
    superAdminGuard.ts         # SuperAdminRoute guard component
```

## UI Design

- **SuperAdminShell**: Dark sidebar (slate-900 bg) with navigation links. Distinct from clinic AppShell so it's immediately clear you're in admin mode.
- **Color accent**: Indigo instead of primary teal/blue — visual separation from clinic UI.
- **Layout**: Sidebar left (collapsed on mobile), content area right. Header shows "Super Admin" label + user email + sign out.
- **Components**: Reuse existing shared components (StatCard, StatusBadge, EmptyState, PageHeader) where appropriate, but with super admin color scheme.

## Login Page Modification

Add to bottom-right of login page, after the "Staff accounts are created..." paragraph:

```tsx
<div className="fixed bottom-4 right-4">
  <button
    onClick={() => navigate('/super-admin')}
    className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
  >
    System
  </button>
</div>
```

## Security Considerations

- No service role key in client-side code
- All cross-tenant access via SECURITY DEFINER RPCs with email verification
- Client-side route guard prevents rendering super admin UI for non-authorized users
- Server-side RPC guard prevents data access even if client guard is bypassed
- Super admin email is hardcoded — changing it requires a code deploy + SQL migration
- `sa_create_tenant` generates temporary passwords — owners must reset via email flow

## Out of Scope (Future)

- Tenant list with search/filter as separate page (v1 has basic list on dashboard)
- Impersonate / login-as tenant
- Audit log of super admin actions
- Multi-admin support (additional super admin users)
- Revenue charts / analytics
- Tenant suspension / deletion
