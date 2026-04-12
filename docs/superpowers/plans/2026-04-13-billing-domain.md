# Basic Plan & Billing Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing subscription scaffolding into a real billing domain with a 7-day trial, hard lock on expiry, manual super-admin approval, upgrade request flow, login popup with trial countdown, and a SA billing page.

**Architecture:** A single SQL migration fixes and finalises all DB/RPC concerns. AuthContext loads subscription state so every React component can read `subscriptionStatus` and `trialEndsAt`. A `TrialBanner` popup is injected into `AppShell` and shown to clinic admins on every login; a `SubscriptionGate` overlay blocks access when the subscription is locked. A new SA `/super-admin/billing` page shows pending upgrade requests and invoice history.

**Tech Stack:** React + TypeScript + Tailwind, Supabase PostgreSQL (SECURITY DEFINER RPCs), React Router v6.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260413_billing_domain.sql` | Fix `provision_clinic_for_current_user` (7-day trial), clean RPCs, seed Basic plan, create `clinic_settings` table |
| Modify | `src/types/index.ts` | Add `ClinicSubscriptionExtRow`, `UpgradeRequestItem` |
| Modify | `src/contexts/AuthContext.tsx` | Load `subscription` state, expose `subscriptionStatus`, `trialEndsAt`, `isAccessLocked`, `upgradeRequested` |
| Create | `src/hooks/useSubscription.ts` | `requestUpgrade()` + `useUpgradePendingList()` hooks |
| Create | `src/components/shared/TrialBanner.tsx` | Login popup: yellow trial countdown → Basic summary → View Plans / Upgrade buttons |
| Create | `src/components/shared/SubscriptionGate.tsx` | Full-page blocked overlay rendered when `isAccessLocked` |
| Modify | `src/components/layout/AppShell.tsx` | Inject `<TrialBanner />` and `<SubscriptionGate />` |
| Create | `src/pages/super-admin/SuperAdminBilling.tsx` | SA billing: plan catalog, pending upgrade requests, invoice list |
| Modify | `src/components/super-admin/SuperAdminShell.tsx` | Add "Billing" nav item |
| Modify | `src/App.tsx` | Add `/super-admin/billing` route |
| Modify | `src/hooks/useSuperAdmin.ts` | Add `approveTenant()` function |
| Modify | `src/components/super-admin/CreateTenantModal.tsx` | Remove trial-end date input; always 7-day trial |

---

## Task 1: SQL Migration — Fix provisioning, RPCs, seed plan

**Files:**
- Create: `supabase/migrations/20260413_billing_domain.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260413_billing_domain.sql
-- Fixes provision_clinic_for_current_user to always use 7-day trial.
-- Creates clinic_settings table.
-- Cleans is_subscription_locked, sa_approve_subscription, request_upgrade.
-- Seeds Basic plan.

-- 1. Ensure upgrade_requested_at column exists
alter table clinic_subscriptions
  add column if not exists upgrade_requested_at timestamptz;

-- 2. Create clinic_settings table
create table if not exists clinic_settings (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid not null unique references clinics(id) on delete cascade,
  auto_thank_you_enabled boolean not null default false,
  auto_reminder_enabled boolean not null default false,
  auto_missed_alert_enabled boolean not null default false,
  auto_followup_enabled boolean not null default false,
  thank_you_delay_minutes integer not null default 60,
  reminder_hours_before integer not null default 24,
  followup_delay_days integer not null default 3,
  abandoned_threshold_days integer not null default 14,
  thank_you_template text,
  reminder_template text,
  missed_template text,
  followup_template text,
  default_session_duration_mins integer not null default 45,
  currency text not null default 'BDT',
  timezone text not null default 'Asia/Dhaka',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Fix provision_clinic_for_current_user (always 7-day trial, plan_key = starter)
create or replace function provision_clinic_for_current_user(
  p_clinic_name text,
  p_requested_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_slug text;
  v_clinic_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_slug := coalesce(nullif(slugify(p_requested_slug), ''), slugify(p_clinic_name));

  if v_slug = '' then
    raise exception 'Clinic slug cannot be empty';
  end if;

  insert into user_profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into clinics (name, slug, owner_user_id)
  values (trim(p_clinic_name), v_slug, v_user_id)
  returning id into v_clinic_id;

  insert into clinic_memberships (clinic_id, user_id, role, status, invited_by)
  values (v_clinic_id, v_user_id, 'clinic_admin', 'active', v_user_id)
  on conflict (clinic_id, user_id) do update
  set role = excluded.role,
      status = excluded.status,
      invited_by = excluded.invited_by,
      updated_at = now();

  update user_profiles
  set default_clinic_id = v_clinic_id,
      updated_at = now()
  where id = v_user_id;

  insert into clinic_subscriptions (
    clinic_id,
    plan_key,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  )
  values (
    v_clinic_id,
    'starter',
    'trialing',
    now() + interval '7 days',
    now(),
    now() + interval '7 days'
  )
  on conflict (clinic_id) do nothing;

  return v_clinic_id;
end;
$$;

-- 4. Fix is_subscription_locked
create or replace function is_subscription_locked(p_clinic_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub record;
begin
  if coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficials@gmail.com' then
    return false;
  end if;

  select status, trial_ends_at into v_sub
  from clinic_subscriptions
  where clinic_id = p_clinic_id;

  if not found then return true; end if;

  if v_sub.status = 'trialing' and v_sub.trial_ends_at < now() then
    return true;
  end if;

  if v_sub.status in ('past_due', 'cancelled', 'incomplete') then
    return true;
  end if;

  return false;
end;
$$;

-- 5. Fix sa_approve_subscription
create or replace function sa_approve_subscription(
  p_clinic_id uuid,
  p_plan_key text default 'starter'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _sa_check_access();

  update clinic_subscriptions
  set
    status = 'active',
    plan_key = p_plan_key,
    upgrade_requested_at = null,
    current_period_start = now(),
    current_period_end = now() + interval '30 days',
    updated_at = now()
  where clinic_id = p_clinic_id;

  insert into subscription_invoices (
    clinic_id, status, amount_due_cents, currency, due_at
  )
  select
    p_clinic_id,
    'open',
    sp.monthly_price_cents,
    'bdt',
    now() + interval '7 days'
  from subscription_plans sp
  where sp.plan_key = p_plan_key;
end;
$$;

-- 6. Fix request_upgrade (use is_active_clinic_member correctly)
create or replace function request_upgrade(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_active_clinic_member(p_clinic_id) then
    raise exception 'Not a member of this clinic';
  end if;

  update clinic_subscriptions
  set upgrade_requested_at = now(),
      updated_at = now()
  where clinic_id = p_clinic_id;
end;
$$;

-- 7. SA RPC: list pending upgrade requests
create or replace function sa_list_upgrade_requests()
returns table(
  clinic_id uuid,
  clinic_name text,
  owner_email text,
  plan_key text,
  subscription_status text,
  upgrade_requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _sa_check_access();

  return query
    select
      c.id as clinic_id,
      c.name as clinic_name,
      au.email::text as owner_email,
      cs.plan_key,
      cs.status as subscription_status,
      cs.upgrade_requested_at
    from clinic_subscriptions cs
    join clinics c on c.id = cs.clinic_id
    left join auth.users au on au.id = c.owner_user_id
    where cs.upgrade_requested_at is not null
    order by cs.upgrade_requested_at asc;
end;
$$;

-- 8. SA RPC: list invoices for a clinic
create or replace function sa_list_invoices(p_clinic_id uuid default null)
returns table(
  id uuid,
  clinic_id uuid,
  clinic_name text,
  status text,
  amount_due_cents integer,
  currency text,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _sa_check_access();

  return query
    select
      si.id,
      si.clinic_id,
      c.name as clinic_name,
      si.status,
      si.amount_due_cents,
      si.currency,
      si.due_at,
      si.paid_at,
      si.created_at
    from subscription_invoices si
    join clinics c on c.id = si.clinic_id
    where (p_clinic_id is null or si.clinic_id = p_clinic_id)
    order by si.created_at desc
    limit 100;
end;
$$;

-- 9. Seed Basic plan (starter key, BDT price)
insert into subscription_plans (
  plan_key, name, monthly_price_cents, allowed_message_types,
  therapist_limit, patient_limit, appointment_limit_monthly
)
values (
  'starter',
  'Basic',
  500000,
  array['session_reminder', 'missed_session'],
  null,
  null,
  null
)
on conflict (plan_key) do update
set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  allowed_message_types = excluded.allowed_message_types,
  updated_at = now();

-- 10. Expose subscription data to clinic members via RPC
create or replace function get_my_subscription()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  result json;
begin
  v_clinic_id := current_clinic_id();

  if v_clinic_id is null then
    return null;
  end if;

  select json_build_object(
    'plan_key', cs.plan_key,
    'status', cs.status,
    'trial_ends_at', cs.trial_ends_at,
    'current_period_end', cs.current_period_end,
    'upgrade_requested_at', cs.upgrade_requested_at,
    'is_locked', is_subscription_locked(v_clinic_id),
    'allowed_message_types', sp.allowed_message_types
  )
  into result
  from clinic_subscriptions cs
  join subscription_plans sp on sp.plan_key = cs.plan_key
  where cs.clinic_id = v_clinic_id;

  return result;
end;
$$;
```

- [ ] **Step 2: Apply to Supabase**

Run this migration against your Supabase project. If using the Supabase MCP tool, call `apply_migration`. If running manually:
```
supabase db push
```
Or paste into the Supabase SQL Editor and run it.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413_billing_domain.sql
git commit -m "feat: billing domain migration - 7d trial, RPCs, Basic plan seed, clinic_settings"
```

---

## Task 2: Types — ClinicSubscriptionExtRow and UpgradeRequestItem

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add types** (after the existing `ClinicSubscriptionRow` interface)

```typescript
export interface ClinicSubscriptionExtRow extends ClinicSubscriptionRow {
  upgrade_requested_at: string | null;
  is_locked: boolean;
  allowed_message_types: string[];
}

export interface UpgradeRequestItem {
  clinic_id: string;
  clinic_name: string;
  owner_email: string | null;
  plan_key: string;
  subscription_status: string;
  upgrade_requested_at: string;
}

export interface SAInvoiceRow {
  id: string;
  clinic_id: string;
  clinic_name: string;
  status: string;
  amount_due_cents: number;
  currency: string;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
}
```

Also update `ClinicSubscriptionRow` to include `upgrade_requested_at`:
```typescript
export interface ClinicSubscriptionRow {
  clinic_id: string;
  created_at: string | null;
  current_period_end: string | null;
  current_period_start: string | null;
  id: string;
  plan_key: SubscriptionPlanKey;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  updated_at: string | null;
  upgrade_requested_at: string | null;  // add this
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ClinicSubscriptionExtRow, UpgradeRequestItem, SAInvoiceRow types"
```

---

## Task 3: AuthContext — Load subscription state

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Add subscription fields to the context value interface**

In `AuthContextValue` interface, add:
```typescript
subscription: ClinicSubscriptionExtRow | null;
subscriptionStatus: SubscriptionStatus | null;
trialEndsAt: string | null;
isAccessLocked: boolean;
upgradeRequested: boolean;
allowedMessageTypes: string[];
```

Also import the new type at the top:
```typescript
import type { ClinicSubscriptionExtRow, SubscriptionStatus, ... } from "@/types";
```

- [ ] **Step 2: Add subscription state variables** (after the existing `useState` declarations)

```typescript
const [subscription, setSubscription] = useState<ClinicSubscriptionExtRow | null>(null);
```

- [ ] **Step 3: Load subscription in `loadUserData`**

After the clinic is resolved (after `setClinic(clinicData ?? null)`), add:
```typescript
if (resolvedClinicId) {
  // existing therapist query stays...

  // Load subscription
  const { data: subData } = await (supabase as any).rpc("get_my_subscription");
  setSubscription((subData as ClinicSubscriptionExtRow | null) ?? null);
} else {
  setClinic(null);
  setLinkedTherapistId(null);
  setSubscription(null);
}
```

- [ ] **Step 4: Clear subscription in `clearAuthState`**

Add `setSubscription(null);` inside `clearAuthState()`.

- [ ] **Step 5: Compute derived values and expose them**

After the existing derived values (`const role = ...`), add:
```typescript
const subscriptionStatus = subscription?.status ?? null;
const trialEndsAt = subscription?.trial_ends_at ?? null;
const isAccessLocked = subscription?.is_locked ?? false;
const upgradeRequested = subscription?.upgrade_requested_at != null;
const allowedMessageTypes = subscription?.allowed_message_types ?? [];
```

- [ ] **Step 6: Add to context value**

In the `<AuthContext.Provider value={{ ... }}>` object, add:
```typescript
subscription,
subscriptionStatus,
trialEndsAt,
isAccessLocked,
upgradeRequested,
allowedMessageTypes,
```

- [ ] **Step 7: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: load subscription state in AuthContext"
```

---

## Task 4: useSubscription hook — requestUpgrade + SA upgrade list

**Files:**
- Create: `src/hooks/useSubscription.ts`

- [ ] **Step 1: Create the file**

```typescript
import { useCallback, useState } from "react";
import { supabase as supabaseClient } from "@/lib/supabase";
import type { UpgradeRequestItem, SAInvoiceRow } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

export async function requestUpgrade(clinicId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.rpc("request_upgrade", { p_clinic_id: clinicId });
  if (error) return { error: error.message };
  return { error: null };
}

export function useUpgradePendingList() {
  const [requests, setRequests] = useState<UpgradeRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_upgrade_requests")
      .then(({ data, error: err }: { data: UpgradeRequestItem[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setRequests(data ?? []);
        setIsLoading(false);
      });
  }, []);

  return { requests, isLoading, error, fetch };
}

export function useSAInvoiceList(clinicId?: string) {
  const [invoices, setInvoices] = useState<SAInvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_invoices", { p_clinic_id: clinicId ?? null })
      .then(({ data, error: err }: { data: SAInvoiceRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setInvoices(data ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { invoices, isLoading, error, fetch };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSubscription.ts
git commit -m "feat: useSubscription hook - requestUpgrade, useUpgradePendingList, useSAInvoiceList"
```

---

## Task 5: TrialBanner — Admin login popup

**Files:**
- Create: `src/components/shared/TrialBanner.tsx`

The banner shows to `clinic_admin` users only. It shows:
- While trialing: yellow countdown card, then slides to plan summary with "View Plans" + "Upgrade" buttons
- If `upgradeRequested`: "Upgrade Requested" state instead of the button
- Dismissed via `sessionStorage` so it only shows once per browser session

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from "react";
import { X, Clock, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { requestUpgrade } from "@/hooks/useSubscription";

const DISMISSED_KEY = "trial_banner_dismissed";

function getDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function TrialBanner() {
  const { role, clinicId, subscriptionStatus, trialEndsAt, upgradeRequested } = useAuth();
  const [phase, setPhase] = useState<"countdown" | "plan">("countdown");
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true);
      return;
    }
    // Show countdown for 3 seconds then slide to plan summary
    const t = setTimeout(() => setPhase("plan"), 3000);
    return () => clearTimeout(t);
  }, []);

  if (role !== "clinic_admin") return null;
  if (subscriptionStatus !== "trialing") return null;
  if (dismissed) return null;

  const daysLeft = getDaysLeft(trialEndsAt);

  function handleDismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleUpgrade() {
    if (!clinicId || requesting) return;
    setRequesting(true);
    await requestUpgrade(clinicId);
    setRequesting(false);
    setRequested(true);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative rounded-xl border border-gray-200 bg-white shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {phase === "countdown" ? (
          /* Trial countdown card */
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Free Trial Active</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {daysLeft === 0
                    ? "Trial expires today"
                    : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-amber-400 transition-all"
                style={{ width: `${Math.min(100, (daysLeft / 7) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          /* Plan summary card */
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Basic Plan</p>
                <p className="text-xs text-amber-600 font-medium">৳5,000 / month</p>
              </div>
            </div>
            <ul className="mb-4 space-y-1.5 text-xs text-gray-600">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Session reminder automation
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Missed session follow-up
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Unlimited patients &amp; therapists
              </li>
            </ul>
            <p className="mb-3 text-xs text-amber-600 font-medium">
              {daysLeft === 0 ? "Trial expired" : `${daysLeft} trial day${daysLeft !== 1 ? "s" : ""} left`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                View Plans
              </button>
              {upgradeRequested || requested ? (
                <span className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-500">
                  Requested
                </span>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={requesting}
                  className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
                >
                  {requesting ? "..." : "Upgrade"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/TrialBanner.tsx
git commit -m "feat: TrialBanner popup with countdown and upgrade request"
```

---

## Task 6: SubscriptionGate — Hard lock overlay

**Files:**
- Create: `src/components/shared/SubscriptionGate.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { requestUpgrade } from "@/hooks/useSubscription";
import { useState } from "react";

export function SubscriptionGate() {
  const { isAccessLocked, isSuperAdmin, clinicId, upgradeRequested } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  if (!isAccessLocked || isSuperAdmin) return null;

  async function handleUpgrade() {
    if (!clinicId || requesting) return;
    setRequesting(true);
    await requestUpgrade(clinicId);
    setRequesting(false);
    setRequested(true);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-950/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Lock className="h-7 w-7 text-red-500" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Access Paused</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your free trial has ended. Request an upgrade to continue using Physio OS.
        </p>
        <div className="mt-6 space-y-2">
          {upgradeRequested || requested ? (
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
              Upgrade request sent — we'll be in touch shortly.
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={requesting}
              className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
            >
              {requesting ? "Sending request..." : "Request Upgrade"}
            </button>
          )}
          <p className="text-xs text-gray-400">
            Contact support if you have questions.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/SubscriptionGate.tsx
git commit -m "feat: SubscriptionGate overlay for locked tenants"
```

---

## Task 7: AppShell — Inject TrialBanner and SubscriptionGate

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Edit AppShell.tsx**

Replace the current content with:
```tsx
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getRouteMeta } from "@/lib/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { TrialBanner } from "@/components/shared/TrialBanner";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";

export function AppShell() {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground lg:h-screen">
      <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />

      <div
        className={`flex min-h-screen flex-col lg:h-screen transition-all duration-200 ease-out ${
          isExpanded ? "lg:ml-60" : "lg:ml-[68px]"
        }`}
      >
        <Header breadcrumbs={routeMeta.breadcrumbs} title={routeMeta.title} />

        <main className="flex-1 overflow-y-auto bg-background px-4 py-5 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 lg:pb-6 lg:px-8">
          <div className="page-enter mx-auto w-full max-w-[1280px]" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>

      <TrialBanner />
      <SubscriptionGate />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: inject TrialBanner and SubscriptionGate into AppShell"
```

---

## Task 8: SA Billing page — Plan catalog, approvals, invoices

**Files:**
- Create: `src/pages/super-admin/SuperAdminBilling.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect } from "react";
import { CheckCircle, CreditCard, Zap } from "lucide-react";
import { useUpgradePendingList, useSAInvoiceList } from "@/hooks/useSubscription";
import { approveTenant } from "@/hooks/useSuperAdmin";

export function SuperAdminBilling() {
  const { requests, isLoading: reqLoading, error: reqError, fetch: fetchRequests } =
    useUpgradePendingList();
  const { invoices, isLoading: invLoading, error: invError, fetch: fetchInvoices } =
    useSAInvoiceList();

  useEffect(() => {
    fetchRequests();
    fetchInvoices();
  }, [fetchRequests, fetchInvoices]);

  async function handleApprove(clinicId: string) {
    const result = await approveTenant({ clinic_id: clinicId, plan_key: "starter" });
    if (!result.error) {
      fetchRequests();
      fetchInvoices();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plan &amp; Billing</h1>
        <p className="mt-1 text-sm text-gray-500">Manage plans, approve upgrades, and view invoice history</p>
      </div>

      {/* Plan Catalog */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Plan Catalog</h2>
        <div className="max-w-xs rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Basic</p>
              <p className="text-sm text-gray-500">৳5,000 / month</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              Session reminder automation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              Missed session follow-up
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              Unlimited patients &amp; therapists
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              7-day free trial
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-400">plan_key: starter · Manual approval · BDT only</p>
        </div>
      </section>

      {/* Pending Upgrade Requests */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Pending Upgrade Requests
          {requests.length > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {requests.length}
            </span>
          )}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {reqLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : reqError ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-red-500">{reqError}</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No pending requests</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.clinic_id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.clinic_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.owner_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {r.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(r.upgrade_requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleApprove(r.clinic_id)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 transition-colors"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invoice History */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-500" />
          Invoice History
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
              </tr>
            </thead>
            <tbody>
              {invLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : invError ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-red-500">{invError}</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No invoices yet</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.clinic_name}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      ৳{(inv.amount_due_cents / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        inv.status === "paid"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : inv.status === "open"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-gray-100 text-gray-600"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/super-admin/SuperAdminBilling.tsx
git commit -m "feat: SuperAdminBilling page with plan catalog, upgrade requests, invoice history"
```

---

## Task 9: useSuperAdmin — Add approveTenant

**Files:**
- Modify: `src/hooks/useSuperAdmin.ts`

- [ ] **Step 1: Add `approveTenant` function** (after the existing `updateSubscription`)

```typescript
export async function approveTenant(params: {
  clinic_id: string;
  plan_key?: string;
}): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase.rpc("sa_approve_subscription", {
    p_clinic_id: params.clinic_id,
    p_plan_key: params.plan_key ?? "starter",
  });

  if (error) return { error: error.message };
  return { error: null };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSuperAdmin.ts
git commit -m "feat: add approveTenant to useSuperAdmin"
```

---

## Task 10: SuperAdminShell + App routes — Add billing

**Files:**
- Modify: `src/components/super-admin/SuperAdminShell.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Billing to navItems in SuperAdminShell.tsx**

Import `CreditCard` from lucide-react and add to the navItems array:
```typescript
import {
  LayoutDashboard,
  Building2,
  CreditCard,  // add
  LogOut,
  Menu,
  X,
  Shield,
  Settings as SettingsIcon,
} from "lucide-react";

const navItems = [
  { to: "/super-admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/super-admin/tenants", icon: Building2, label: "Tenants", end: false },
  { to: "/super-admin/billing", icon: CreditCard, label: "Billing", end: false },  // add
  { to: "/super-admin/settings", icon: SettingsIcon, label: "Settings", end: false },
];
```

- [ ] **Step 2: Add route in App.tsx**

Import `SuperAdminBilling` at the top of App.tsx:
```typescript
import { SuperAdminBilling } from "@/pages/super-admin/SuperAdminBilling";
```

Add the route inside the super-admin `<Route path="/super-admin" ...>` block (after the tenants routes):
```tsx
<Route path="billing" element={<SuperAdminBilling />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/super-admin/SuperAdminShell.tsx src/App.tsx
git commit -m "feat: add /super-admin/billing route and nav item"
```

---

## Task 11: CreateTenantModal — Remove trial-end input

The SA creates tenants; the 7-day trial is now always hardcoded in the RPC. Remove the `trialEnd` state and input.

**Files:**
- Modify: `src/components/super-admin/CreateTenantModal.tsx`

- [ ] **Step 1: Edit CreateTenantModal.tsx**

Remove:
- `const [trialEnd, setTrialEnd] = useState("");`
- The `trial_end: trialEnd || null` line in `createTenant(...)` call (pass `trial_end: null`)
- The entire `<div>` block for "Trial End Date"

The plan dropdown options should show only "Basic" (value="starter"):
```tsx
<select ...>
  <option value="starter">Basic</option>
</select>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/super-admin/CreateTenantModal.tsx
git commit -m "feat: remove trial-end input from CreateTenantModal, hardcode 7-day trial in RPC"
```

---

## Task 12: Verify — Manual test checklist

- [ ] **Step 1: Self-host dev server**

```bash
npm run dev
```

- [ ] **Step 2: Run through each test scenario**

**Test A – New tenant gets 7-day trial:**
1. Register a new clinic account
2. Check `clinic_subscriptions` in Supabase: `status = trialing`, `trial_ends_at = now + 7d`

**Test B – Trial countdown banner shows:**
1. Log in as `clinic_admin`
2. Banner appears in bottom-right with yellow countdown
3. After 3 seconds it transitions to plan summary
4. "Upgrade" button sends request; button becomes "Requested"

**Test C – Hard lock after trial expiry:**
1. In Supabase SQL editor: `update clinic_subscriptions set trial_ends_at = now() - interval '1 hour' where clinic_id = '<your_id>';`
2. Refresh the app
3. SubscriptionGate overlay blocks the UI

**Test D – SA approves upgrade:**
1. Log in as super admin
2. Navigate to /super-admin/billing
3. Pending request is listed; click "Approve"
4. Tenant subscription becomes `active`, invoice row created

**Test E – SA billing page:**
1. Plan catalog shows Basic / ৳5,000
2. Invoice history shows the created invoice

**Test F – SA access never locked:**
1. While tenant is locked, log in as super admin
2. Super admin can still navigate all pages

**Test G – Clinic patient billing page unchanged:**
1. Navigate to /billing as clinic_admin (while active)
2. Patient billing still works independently

- [ ] **Step 3: Commit if any last-minute fixes applied**

```bash
git add -A
git commit -m "fix: billing domain post-test corrections"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| 7-day free trial hardcoded | Task 1 (provision RPC), Task 11 (modal) |
| Hard lock after expiry | Task 1 (`is_subscription_locked`), Task 6 (SubscriptionGate) |
| Manual SA approval | Task 1 (`sa_approve_subscription`), Task 8 (SA billing page), Task 9 (`approveTenant`) |
| Approval sets active + 30-day period + invoice | Task 1 (RPC body) |
| Basic = `starter` key, BDT price | Task 1 (seed), Task 2 (types) |
| `allowed_message_types` seeded correctly | Task 1 (seed: `session_reminder`, `missed_session`) |
| `clinic_settings` table | Task 1 |
| `upgrade_requested_at` column | Task 1 |
| AuthContext exposes subscription state | Task 3 |
| `request_upgrade` RPC + hook | Task 1, Task 4 |
| Trial countdown popup (yellow) | Task 5 |
| Plan summary + View Plans / Upgrade buttons | Task 5 |
| "Upgrade" → "Requested" state | Task 5 |
| Request appears in SA billing | Task 4, Task 8 |
| SA billing page: plan catalog | Task 8 |
| SA billing page: pending approvals | Task 8 |
| SA billing page: invoice history | Task 8 |
| SA nav item "Billing" | Task 10 |
| /super-admin/billing route | Task 10 |
| Super admin never locked | Task 1 (`is_subscription_locked`) |
| Patient billing (/billing) unaffected | No changes to Billing.tsx — unchanged |
| Remove trial-end input from create tenant | Task 11 |
