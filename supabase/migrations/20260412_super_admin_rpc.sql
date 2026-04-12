-- Super Admin RPC Functions
-- All functions are SECURITY DEFINER and verify the caller is the super admin.

-- Helper: verify super admin email
create or replace function _sa_check_access()
returns void
language plpgsql
security definer
as $$
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'majedulhoqueofficials@gmail.com' then
    raise exception 'Access denied: not a super admin';
  end if;
end;
$$;

-- 1. Platform stats
create or replace function sa_platform_stats()
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  perform _sa_check_access();

  select json_build_object(
    'total_clinics', (select count(*) from clinics),
    'total_users', (select count(*) from user_profiles),
    'active_subscriptions', (
      select count(*) from clinic_subscriptions
      where status in ('active', 'trialing')
    ),
    'mrr_cents', coalesce((
      select sum(sp.monthly_price_cents)
      from clinic_subscriptions cs
      join subscription_plans sp on sp.plan_key = cs.plan_key
      where cs.status in ('active', 'trialing')
    ), 0)
  ) into result;

  return result;
end;
$$;

-- 2. List tenants
create or replace function sa_list_tenants(
  p_search text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table(
  clinic_id uuid,
  clinic_name text,
  slug text,
  owner_email text,
  owner_name text,
  plan_key text,
  subscription_status text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  perform _sa_check_access();

  return query
    select
      c.id as clinic_id,
      c.name as clinic_name,
      c.slug,
      au.email::text as owner_email,
      up.full_name as owner_name,
      cs.plan_key,
      cs.status as subscription_status,
      c.created_at
    from clinics c
    left join auth.users au on au.id = c.owner_user_id
    left join user_profiles up on up.id = c.owner_user_id
    left join clinic_subscriptions cs on cs.clinic_id = c.id
    where (
      p_search is null
      or c.name ilike '%' || p_search || '%'
      or au.email::text ilike '%' || p_search || '%'
    )
    order by c.created_at desc
    limit p_limit
    offset p_offset;
end;
$$;

-- 3. Tenant detail
create or replace function sa_tenant_detail(p_clinic_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  result json;
  v_clinic record;
  v_owner record;
  v_sub record;
  v_stats record;
begin
  perform _sa_check_access();

  -- Clinic
  select id, name, slug, owner_user_id, created_at
  into v_clinic
  from clinics where id = p_clinic_id;

  if not found then
    raise exception 'Clinic not found';
  end if;

  -- Owner
  select au.email::text, up.full_name
  into v_owner
  from auth.users au
  left join user_profiles up on up.id = au.id
  where au.id = v_clinic.owner_user_id;

  -- Subscription
  select cs.plan_key, cs.status, cs.trial_ends_at,
         cs.current_period_start, cs.current_period_end
  into v_sub
  from clinic_subscriptions cs
  where cs.clinic_id = p_clinic_id;

  -- Stats
  select
    (select count(*) from patients where clinic_id = p_clinic_id) as total_patients,
    (select count(*) from therapists where clinic_id = p_clinic_id) as total_therapists,
    (select count(*) from appointments where clinic_id = p_clinic_id) as total_appointments,
    (select count(*) from treatment_plans where clinic_id = p_clinic_id and status = 'active') as active_treatment_plans
  into v_stats;

  select json_build_object(
    'clinic', json_build_object(
      'id', v_clinic.id,
      'name', v_clinic.name,
      'slug', v_clinic.slug,
      'owner_user_id', v_clinic.owner_user_id,
      'created_at', v_clinic.created_at
    ),
    'owner', json_build_object(
      'email', v_owner.email,
      'full_name', v_owner.full_name
    ),
    'subscription', case when v_sub.plan_key is not null then json_build_object(
      'plan_key', v_sub.plan_key,
      'status', v_sub.status,
      'trial_ends_at', v_sub.trial_ends_at,
      'current_period_start', v_sub.current_period_start,
      'current_period_end', v_sub.current_period_end
    ) else null end,
    'stats', json_build_object(
      'total_patients', v_stats.total_patients,
      'total_therapists', v_stats.total_therapists,
      'total_appointments', v_stats.total_appointments,
      'active_treatment_plans', v_stats.active_treatment_plans
    )
  ) into result;

  return result;
end;
$$;

-- 4. Create tenant
create or replace function sa_create_tenant(
  p_clinic_name text,
  p_owner_email text,
  p_plan_key text default 'starter',
  p_trial_end timestamptz default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_clinic_id uuid;
  v_slug text;
  v_counter int := 0;
begin
  perform _sa_check_access();

  p_owner_email := lower(trim(p_owner_email));
  
  -- Find or create user
  select id into v_user_id
  from auth.users
  where lower(email) = p_owner_email;
  
  if v_user_id is null then
    -- Create user with temporary password
    v_user_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, role, aud, created_at, updated_at
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      p_owner_email,
      crypt('TempPass123!', gen_salt('bf')),
      now(),
      'authenticated',
      'authenticated',
        now(),
        now()
      );
  
    -- auth.users inserts already fire handle_new_user_profile(), so keep this idempotent.
    insert into user_profiles (id, full_name)
    values (v_user_id, split_part(p_owner_email, '@', 1))
    on conflict (id) do update
      set full_name = excluded.full_name;
  end if;

  -- Generate slug
  v_slug := lower(regexp_replace(p_clinic_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  -- Handle slug collision
  while exists (select 1 from clinics where slug = v_slug || case when v_counter > 0 then '-' || v_counter::text else '' end) loop
    v_counter := v_counter + 1;
  end loop;

  if v_counter > 0 then
    v_slug := v_slug || '-' || v_counter::text;
  end if;

  -- Create clinic
  insert into clinics (name, slug, owner_user_id)
  values (p_clinic_name, v_slug, v_user_id)
  returning id into v_clinic_id;

  -- Create membership
  insert into clinic_memberships (clinic_id, user_id, role, status)
  values (v_clinic_id, v_user_id, 'clinic_admin', 'active');

  -- Create subscription
  insert into clinic_subscriptions (clinic_id, plan_key, status, trial_ends_at)
  values (
    v_clinic_id,
    p_plan_key,
    'trialing',
    coalesce(p_trial_end, now() + interval '14 days')
  );

  -- Set default clinic
  update user_profiles
  set default_clinic_id = v_clinic_id
  where id = v_user_id
  and default_clinic_id is null;

  return v_clinic_id;
end;
$$;

-- 5. Update subscription
create or replace function sa_update_subscription(
  p_clinic_id uuid,
  p_plan_key text default null,
  p_status text default null,
  p_trial_end timestamptz default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_result json;
begin
  perform _sa_check_access();

  update clinic_subscriptions
  set
    plan_key = coalesce(p_plan_key, plan_key),
    status = coalesce(p_status, status),
    trial_ends_at = case
      when p_trial_end is not null then p_trial_end
      else trial_ends_at
    end,
    updated_at = now()
  where clinic_id = p_clinic_id;

  if not found then
    raise exception 'No subscription found for clinic';
  end if;

  select json_build_object(
    'plan_key', cs.plan_key,
    'status', cs.status,
    'trial_ends_at', cs.trial_ends_at
  ) into v_result
  from clinic_subscriptions cs
  where cs.clinic_id = p_clinic_id;

  return v_result;
end;
$$;
