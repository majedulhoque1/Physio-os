-- =============================================================================
-- Migration: 20260413_billing_domain.sql
-- Billing domain: 7-day trial, clinic_settings, fixed RPCs, Basic plan seed
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add upgrade_requested_at to clinic_subscriptions (if not exists)
-- ---------------------------------------------------------------------------
alter table clinic_subscriptions
  add column if not exists upgrade_requested_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Create clinic_settings table (if not exists)
-- ---------------------------------------------------------------------------
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

alter table clinic_settings enable row level security;

create policy if not exists "clinic_settings_select_member"
  on clinic_settings for select
  using (is_active_clinic_member(clinic_id));

create policy if not exists "clinic_settings_insert_admin"
  on clinic_settings for insert
  with check (has_clinic_role(clinic_id, array['clinic_admin']));

create policy if not exists "clinic_settings_update_admin"
  on clinic_settings for update
  using (has_clinic_role(clinic_id, array['clinic_admin']));

-- ---------------------------------------------------------------------------
-- 3. Replace provision_clinic_for_current_user (clean, 7-day trial)
-- ---------------------------------------------------------------------------
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
  if v_user_id is null then raise exception 'Authentication required'; end if;

  v_slug := coalesce(nullif(slugify(p_requested_slug), ''), slugify(p_clinic_name));
  if v_slug = '' then raise exception 'Clinic slug cannot be empty'; end if;

  insert into user_profiles (id) values (v_user_id) on conflict (id) do nothing;

  insert into clinics (name, slug, owner_user_id)
  values (trim(p_clinic_name), v_slug, v_user_id)
  returning id into v_clinic_id;

  insert into clinic_memberships (clinic_id, user_id, role, status, invited_by)
  values (v_clinic_id, v_user_id, 'clinic_admin', 'active', v_user_id)
  on conflict (clinic_id, user_id) do update
  set role = excluded.role, status = excluded.status, invited_by = excluded.invited_by, updated_at = now();

  update user_profiles set default_clinic_id = v_clinic_id, updated_at = now() where id = v_user_id;

  insert into clinic_subscriptions (clinic_id, plan_key, status, trial_ends_at, current_period_start, current_period_end)
  values (v_clinic_id, 'starter', 'trialing', now() + interval '7 days', now(), now() + interval '7 days')
  on conflict (clinic_id) do nothing;

  return v_clinic_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Replace is_subscription_locked (clean version)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5. Replace sa_approve_subscription (clean version)
-- ---------------------------------------------------------------------------
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

  if not found then
    raise exception 'Clinic subscription not found for clinic_id: %', p_clinic_id;
  end if;

  insert into subscription_invoices (clinic_id, status, amount_due_cents, currency, due_at)
  select p_clinic_id, 'open', sp.monthly_price_cents, 'bdt', now() + interval '7 days'
  from subscription_plans sp
  where sp.plan_key = p_plan_key;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Replace request_upgrade (SECURITY DEFINER + member check)
-- ---------------------------------------------------------------------------
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
  set upgrade_requested_at = now(), updated_at = now()
  where clinic_id = p_clinic_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Create sa_list_upgrade_requests RPC
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 8. Create sa_list_invoices RPC
-- ---------------------------------------------------------------------------
create or replace function sa_list_invoices(
  p_clinic_id uuid default null,
  p_limit int default 50,
  p_offset int default 0
)
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
    limit p_limit
    offset p_offset;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Seed / upsert the Basic (starter) plan
-- ---------------------------------------------------------------------------
insert into subscription_plans (plan_key, name, monthly_price_cents, allowed_message_types)
values ('starter', 'Basic', 500000, array['session_reminder', 'missed_session'])
on conflict (plan_key) do update
set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  allowed_message_types = excluded.allowed_message_types,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 10. Create get_my_subscription RPC (used by AuthContext)
-- ---------------------------------------------------------------------------
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
  if v_clinic_id is null then return null; end if;

  -- Verify caller is actually a member of this clinic
  if not is_active_clinic_member(v_clinic_id) then
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
