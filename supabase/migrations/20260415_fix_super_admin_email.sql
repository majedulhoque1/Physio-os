create or replace function _sa_check_access()
returns void
language plpgsql
security definer
as $$
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'majedulhoqueofficial@gmail.com' then
    raise exception 'Access denied: not a super admin';
  end if;
end;
$$;

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
  if coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficial@gmail.com' then
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
