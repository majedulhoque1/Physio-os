-- Allow super admin to set temp password when creating a tenant
create or replace function sa_create_tenant(
  p_clinic_name text,
  p_owner_email text,
  p_plan_key text default 'starter',
  p_trial_end timestamptz default null,
  p_temp_password text default null
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
  v_password text;
begin
  perform _sa_check_access();

  p_owner_email := lower(trim(p_owner_email));

  select id into v_user_id
  from auth.users
  where lower(email) = p_owner_email;

  if v_user_id is null then
    v_password := nullif(trim(coalesce(p_temp_password, '')), '');
    if v_password is null or length(v_password) < 8 then
      raise exception 'Temp password must be at least 8 characters';
    end if;

    v_user_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, role, aud, created_at, updated_at
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      p_owner_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      'authenticated',
      'authenticated',
      now(),
      now()
    );

    insert into user_profiles (id, full_name)
    values (v_user_id, split_part(p_owner_email, '@', 1))
    on conflict (id) do update
      set full_name = excluded.full_name;
  end if;

  v_slug := lower(regexp_replace(p_clinic_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  while exists (select 1 from clinics where slug = v_slug || case when v_counter > 0 then '-' || v_counter::text else '' end) loop
    v_counter := v_counter + 1;
  end loop;

  if v_counter > 0 then
    v_slug := v_slug || '-' || v_counter::text;
  end if;

  insert into clinics (name, slug, owner_user_id)
  values (p_clinic_name, v_slug, v_user_id)
  returning id into v_clinic_id;

  insert into clinic_memberships (clinic_id, user_id, role, status)
  values (v_clinic_id, v_user_id, 'clinic_admin', 'active');

  insert into clinic_subscriptions (clinic_id, plan_key, status, trial_ends_at)
  values (
    v_clinic_id,
    p_plan_key,
    'trialing',
    coalesce(p_trial_end, now() + interval '14 days')
  );

  update user_profiles
  set default_clinic_id = v_clinic_id
  where id = v_user_id
  and default_clinic_id is null;

  return v_clinic_id;
end;
$$;
