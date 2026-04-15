-- Fix get_my_subscription to work even when JWT has no clinic_id claim.
-- current_clinic_id() reads from app_metadata which is not set for users created
-- via provision_clinic_for_current_user, so the RPC was always returning null.

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
  -- Try JWT claim first
  v_clinic_id := current_clinic_id();

  -- Fall back to active membership lookup when JWT has no clinic_id claim
  if v_clinic_id is null then
    select cm.clinic_id into v_clinic_id
    from clinic_memberships cm
    join user_profiles up on up.id = auth.uid()
    where cm.user_id = auth.uid()
      and cm.status = 'active'
      and (up.default_clinic_id is null or cm.clinic_id = up.default_clinic_id)
    order by (cm.clinic_id = up.default_clinic_id) desc
    limit 1;
  end if;

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
