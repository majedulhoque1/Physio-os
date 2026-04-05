create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists clinics (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  default_clinic_id uuid references clinics(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists clinic_memberships (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (clinic_id, user_id)
);

create table if not exists clinic_invitations (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid not null references clinics(id) on delete cascade,
  email citext not null,
  role text not null,
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists subscription_plans (
  id uuid default gen_random_uuid() primary key,
  plan_key text not null unique,
  name text not null,
  monthly_price_cents integer not null default 0,
  therapist_limit integer,
  patient_limit integer,
  appointment_limit_monthly integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists clinic_subscriptions (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid not null unique references clinics(id) on delete cascade,
  plan_key text not null references subscription_plans(plan_key),
  status text not null default 'trialing',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists subscription_invoices (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid not null references clinics(id) on delete cascade,
  subscription_id uuid references clinic_subscriptions(id) on delete set null,
  stripe_invoice_id text unique,
  status text not null default 'draft',
  amount_due_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  currency text not null default 'usd',
  hosted_invoice_url text,
  invoice_pdf_url text,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists therapists (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  specialization text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id),
  name text not null,
  phone text not null,
  source text default 'manual',
  condition text,
  status text default 'new',
  assigned_to uuid references therapists(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists patients (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id),
  lead_id uuid references leads(id),
  name text not null,
  phone text not null,
  age int,
  gender text,
  diagnosis text,
  assigned_therapist uuid references therapists(id),
  total_sessions int default 0,
  completed_sessions int default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists appointments (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id) not null,
  therapist_id uuid references therapists(id) not null,
  scheduled_at timestamptz not null,
  duration_mins int default 45,
  status text default 'scheduled',
  session_number int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists session_notes (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id),
  appointment_id uuid references appointments(id) not null,
  patient_id uuid references patients(id) not null,
  therapist_id uuid references therapists(id) not null,
  pain_scale int check (pain_scale between 1 and 10),
  mobility_score int check (mobility_score between 1 and 10),
  exercises_done text[],
  progress_notes text,
  next_plan text,
  created_at timestamptz default now()
);

create table if not exists billing (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id) not null,
  appointment_id uuid references appointments(id),
  amount numeric not null,
  payment_method text default 'cash',
  status text default 'due',
  package_name text,
  sessions_included int,
  sessions_used int default 0,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists client_profiles (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id),
  patient_id uuid not null references patients(id) on delete cascade,
  date_of_birth date,
  address text,
  occupation text,
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_history text,
  contraindications text,
  goals text,
  intake_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (patient_id)
);

alter table therapists add column if not exists clinic_id uuid references clinics(id);
alter table therapists add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table leads add column if not exists clinic_id uuid references clinics(id);
alter table patients add column if not exists clinic_id uuid references clinics(id);
alter table appointments add column if not exists clinic_id uuid references clinics(id);
alter table session_notes add column if not exists clinic_id uuid references clinics(id);
alter table billing add column if not exists clinic_id uuid references clinics(id);
alter table client_profiles add column if not exists clinic_id uuid references clinics(id);

insert into clinics (slug, name)
values ('legacy-clinic', 'Legacy Clinic')
on conflict (slug) do nothing;

do $$
declare
  legacy_clinic uuid;
begin
  select id into legacy_clinic
  from clinics
  where slug = 'legacy-clinic'
  limit 1;

  update therapists
  set clinic_id = legacy_clinic
  where clinic_id is null;

  update leads
  set clinic_id = legacy_clinic
  where clinic_id is null;

  update patients
  set clinic_id = legacy_clinic
  where clinic_id is null;

  update appointments
  set clinic_id = legacy_clinic
  where clinic_id is null;

  update session_notes
  set clinic_id = legacy_clinic
  where clinic_id is null;

  update billing
  set clinic_id = legacy_clinic
  where clinic_id is null;

  update client_profiles cp
  set clinic_id = p.clinic_id
  from patients p
  where cp.patient_id = p.id
    and cp.clinic_id is null;
end $$;

alter table therapists alter column clinic_id set not null;
alter table leads alter column clinic_id set not null;
alter table patients alter column clinic_id set not null;
alter table appointments alter column clinic_id set not null;
alter table session_notes alter column clinic_id set not null;
alter table billing alter column clinic_id set not null;
alter table client_profiles alter column clinic_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clinic_memberships_role_check'
  ) then
    alter table clinic_memberships
      add constraint clinic_memberships_role_check
      check (role in ('clinic_admin', 'therapist', 'receptionist'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clinic_memberships_status_check'
  ) then
    alter table clinic_memberships
      add constraint clinic_memberships_status_check
      check (status in ('active', 'invited', 'suspended'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clinic_invitations_role_check'
  ) then
    alter table clinic_invitations
      add constraint clinic_invitations_role_check
      check (role in ('clinic_admin', 'therapist', 'receptionist'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subscription_plans_price_check'
  ) then
    alter table subscription_plans
      add constraint subscription_plans_price_check
      check (monthly_price_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subscription_plans_limits_check'
  ) then
    alter table subscription_plans
      add constraint subscription_plans_limits_check
      check (
        coalesce(therapist_limit, 0) >= 0
        and coalesce(patient_limit, 0) >= 0
        and coalesce(appointment_limit_monthly, 0) >= 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clinic_subscriptions_status_check'
  ) then
    alter table clinic_subscriptions
      add constraint clinic_subscriptions_status_check
      check (status in ('trialing', 'active', 'past_due', 'cancelled', 'incomplete'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subscription_invoices_status_check'
  ) then
    alter table subscription_invoices
      add constraint subscription_invoices_status_check
      check (status in ('draft', 'open', 'paid', 'void', 'uncollectible'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subscription_invoices_amounts_check'
  ) then
    alter table subscription_invoices
      add constraint subscription_invoices_amounts_check
      check (amount_due_cents >= 0 and amount_paid_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'therapists_status_check'
  ) then
    alter table therapists
      add constraint therapists_status_check
      check (status is null or status in ('active', 'inactive'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_source_check'
  ) then
    alter table leads
      add constraint leads_source_check
      check (source is null or source in ('manual', 'facebook', 'whatsapp', 'referral'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_status_check'
  ) then
    alter table leads
      add constraint leads_status_check
      check (
        status is null or status in (
          'new',
          'contacted',
          'booked',
          'visited',
          'ongoing',
          'completed',
          'lost'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'patients_status_check'
  ) then
    alter table patients
      add constraint patients_status_check
      check (status is null or status in ('active', 'completed', 'dropped'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'patients_age_check'
  ) then
    alter table patients
      add constraint patients_age_check
      check (age is null or age between 0 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'patients_session_counts_check'
  ) then
    alter table patients
      add constraint patients_session_counts_check
      check (
        coalesce(total_sessions, 0) >= 0
        and coalesce(completed_sessions, 0) >= 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_status_check'
  ) then
    alter table appointments
      add constraint appointments_status_check
      check (
        status is null or status in (
          'scheduled',
          'confirmed',
          'completed',
          'missed',
          'cancelled'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_duration_check'
  ) then
    alter table appointments
      add constraint appointments_duration_check
      check (duration_mins is null or duration_mins > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_session_number_check'
  ) then
    alter table appointments
      add constraint appointments_session_number_check
      check (session_number is null or session_number > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'billing_status_check'
  ) then
    alter table billing
      add constraint billing_status_check
      check (status is null or status in ('due', 'paid', 'partial'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'billing_payment_method_check'
  ) then
    alter table billing
      add constraint billing_payment_method_check
      check (payment_method is null or payment_method in ('cash', 'bkash', 'nagad', 'card'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'billing_amount_check'
  ) then
    alter table billing
      add constraint billing_amount_check
      check (amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'billing_session_counts_check'
  ) then
    alter table billing
      add constraint billing_session_counts_check
      check (
        coalesce(sessions_included, 0) >= 0
        and coalesce(sessions_used, 0) >= 0
      );
  end if;
end $$;

create unique index if not exists idx_therapists_clinic_id_id
  on therapists(clinic_id, id);

create unique index if not exists idx_leads_clinic_id_id
  on leads(clinic_id, id);

create unique index if not exists idx_patients_clinic_id_id
  on patients(clinic_id, id);

create unique index if not exists idx_appointments_clinic_id_id
  on appointments(clinic_id, id);

create unique index if not exists idx_session_notes_clinic_id_id
  on session_notes(clinic_id, id);

create unique index if not exists idx_billing_clinic_id_id
  on billing(clinic_id, id);

create unique index if not exists idx_client_profiles_clinic_id_id
  on client_profiles(clinic_id, id);

create unique index if not exists idx_client_profiles_clinic_patient
  on client_profiles(clinic_id, patient_id);

create unique index if not exists idx_therapists_user_id_per_clinic
  on therapists(clinic_id, user_id)
  where user_id is not null;

create index if not exists idx_clinic_memberships_user_active
  on clinic_memberships(user_id, status, clinic_id);

create index if not exists idx_clinic_memberships_clinic_role
  on clinic_memberships(clinic_id, status, role);

create unique index if not exists idx_clinic_invitations_pending_email
  on clinic_invitations(clinic_id, email)
  where accepted_at is null and revoked_at is null;

create index if not exists idx_subscription_invoices_clinic_created_at
  on subscription_invoices(clinic_id, created_at desc);

create index if not exists idx_therapists_clinic_status_name
  on therapists(clinic_id, status, name);

create index if not exists idx_leads_clinic_status_created_at
  on leads(clinic_id, status, created_at desc);

create index if not exists idx_leads_clinic_assigned_to
  on leads(clinic_id, assigned_to);

create index if not exists idx_patients_clinic_status_created_at
  on patients(clinic_id, status, created_at desc);

create index if not exists idx_patients_clinic_assigned_therapist
  on patients(clinic_id, assigned_therapist);

create index if not exists idx_appointments_clinic_patient_schedule
  on appointments(clinic_id, patient_id, scheduled_at);

create index if not exists idx_appointments_clinic_therapist_schedule
  on appointments(clinic_id, therapist_id, scheduled_at);

create index if not exists idx_appointments_clinic_status
  on appointments(clinic_id, status);

create index if not exists idx_session_notes_clinic_patient_created_at
  on session_notes(clinic_id, patient_id, created_at desc);

create index if not exists idx_session_notes_clinic_therapist_created_at
  on session_notes(clinic_id, therapist_id, created_at desc);

create index if not exists idx_billing_clinic_patient_created_at
  on billing(clinic_id, patient_id, created_at desc);

create index if not exists idx_billing_clinic_status
  on billing(clinic_id, status);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_clinic_assigned_to_fkey'
  ) then
    alter table leads
      add constraint leads_clinic_assigned_to_fkey
      foreign key (clinic_id, assigned_to)
      references therapists(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'patients_clinic_lead_id_fkey'
  ) then
    alter table patients
      add constraint patients_clinic_lead_id_fkey
      foreign key (clinic_id, lead_id)
      references leads(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'patients_clinic_assigned_therapist_fkey'
  ) then
    alter table patients
      add constraint patients_clinic_assigned_therapist_fkey
      foreign key (clinic_id, assigned_therapist)
      references therapists(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_clinic_patient_id_fkey'
  ) then
    alter table appointments
      add constraint appointments_clinic_patient_id_fkey
      foreign key (clinic_id, patient_id)
      references patients(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_clinic_therapist_id_fkey'
  ) then
    alter table appointments
      add constraint appointments_clinic_therapist_id_fkey
      foreign key (clinic_id, therapist_id)
      references therapists(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'session_notes_clinic_appointment_id_fkey'
  ) then
    alter table session_notes
      add constraint session_notes_clinic_appointment_id_fkey
      foreign key (clinic_id, appointment_id)
      references appointments(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'session_notes_clinic_patient_id_fkey'
  ) then
    alter table session_notes
      add constraint session_notes_clinic_patient_id_fkey
      foreign key (clinic_id, patient_id)
      references patients(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'session_notes_clinic_therapist_id_fkey'
  ) then
    alter table session_notes
      add constraint session_notes_clinic_therapist_id_fkey
      foreign key (clinic_id, therapist_id)
      references therapists(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'billing_clinic_patient_id_fkey'
  ) then
    alter table billing
      add constraint billing_clinic_patient_id_fkey
      foreign key (clinic_id, patient_id)
      references patients(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'billing_clinic_appointment_id_fkey'
  ) then
    alter table billing
      add constraint billing_clinic_appointment_id_fkey
      foreign key (clinic_id, appointment_id)
      references appointments(clinic_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'client_profiles_clinic_patient_id_fkey'
  ) then
    alter table client_profiles
      add constraint client_profiles_clinic_patient_id_fkey
      foreign key (clinic_id, patient_id)
      references patients(clinic_id, id);
  end if;
end $$;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function slugify(value text)
returns text as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$ language sql immutable;

create or replace function current_clinic_id()
returns uuid as $$
  select nullif(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'clinic_id',
      auth.jwt() ->> 'clinic_id'
    ),
    ''
  )::uuid;
$$ language sql stable;

create or replace function current_app_role()
returns text as $$
  select nullif(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'app_role',
      auth.jwt() ->> 'app_role'
    ),
    ''
  );
$$ language sql stable;

create or replace function is_active_clinic_member(target_clinic_id uuid)
returns boolean as $$
  -- If a clinic_id JWT claim exists, enforce it; otherwise fall back to membership table.
  -- This allows the app to work without a custom access token hook while still being secure.
  select
    auth.uid() is not null
    and target_clinic_id is not null
    and (current_clinic_id() is null or target_clinic_id = current_clinic_id())
    and exists (
      select 1
      from clinic_memberships cm
      where cm.user_id = auth.uid()
        and cm.clinic_id = target_clinic_id
        and cm.status = 'active'
    );
$$ language sql stable;

create or replace function has_clinic_role(target_clinic_id uuid, allowed_roles text[])
returns boolean as $$
  select
    auth.uid() is not null
    and target_clinic_id is not null
    and (current_clinic_id() is null or target_clinic_id = current_clinic_id())
    and exists (
      select 1
      from clinic_memberships cm
      where cm.user_id = auth.uid()
        and cm.clinic_id = target_clinic_id
        and cm.status = 'active'
        and cm.role = any(allowed_roles)
    );
$$ language sql stable;

create or replace function is_current_user_therapist(target_clinic_id uuid, target_therapist_id uuid)
returns boolean as $$
  select
    is_active_clinic_member(target_clinic_id)
    and exists (
      select 1
      from therapists t
      where t.clinic_id = target_clinic_id
        and t.id = target_therapist_id
        and t.user_id = auth.uid()
    );
$$ language sql stable;

create or replace function enforce_row_clinic_id()
returns trigger as $$
declare
  claim_clinic_id uuid;
begin
  claim_clinic_id := current_clinic_id();

  if new.clinic_id is null then
    if claim_clinic_id is null then
      raise exception 'clinic_id must be supplied or available in JWT claim';
    end if;

    new.clinic_id := claim_clinic_id;
  end if;

  if tg_op = 'UPDATE' and old.clinic_id is distinct from new.clinic_id then
    raise exception 'clinic_id is immutable';
  end if;

  if claim_clinic_id is not null and new.clinic_id <> claim_clinic_id then
    raise exception 'clinic_id must match JWT claim';
  end if;

  return new;
end;
$$ language plpgsql;

create or replace function sync_patient_completed_sessions()
returns trigger as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update patients
    set completed_sessions = (
      select count(*)
      from appointments
      where patient_id = old.patient_id
        and clinic_id = old.clinic_id
        and status = 'completed'
    )
    where id = old.patient_id
      and clinic_id = old.clinic_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    update patients
    set completed_sessions = (
      select count(*)
      from appointments
      where patient_id = new.patient_id
        and clinic_id = new.clinic_id
        and status = 'completed'
    )
    where id = new.patient_id
      and clinic_id = new.clinic_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

create or replace function get_user_jwt_claims(p_user_id uuid)
returns jsonb as $$
  with preferred_membership as (
    select
      cm.clinic_id,
      cm.role,
      cm.status
    from clinic_memberships cm
    left join user_profiles up
      on up.id = cm.user_id
    where cm.user_id = p_user_id
      and cm.status = 'active'
    order by (cm.clinic_id = up.default_clinic_id) desc, cm.created_at asc
    limit 1
  )
  select coalesce(
    (
      select jsonb_build_object(
        'clinic_id', clinic_id,
        'app_role', role,
        'membership_status', status
      )
      from preferred_membership
    ),
    '{}'::jsonb
  );
$$ language sql stable;

-- Use this function from your Supabase custom access token hook
-- so issued JWTs carry clinic_id and app_role claims for tenant RLS.

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
    now() + interval '14 days',
    now(),
    now() + interval '14 days'
  )
  on conflict (clinic_id) do nothing;

  return v_clinic_id;
end;
$$;

create or replace function accept_clinic_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_invitation clinic_invitations%rowtype;
begin
  v_user_id := auth.uid();
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_invitation
  from clinic_invitations
  where token = p_token
    and accepted_at is null
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    raise exception 'Invitation not found or expired';
  end if;

  if v_email = '' or lower(v_invitation.email::text) <> v_email then
    raise exception 'Invitation email does not match authenticated user';
  end if;

  insert into user_profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into clinic_memberships (clinic_id, user_id, role, status, invited_by)
  values (
    v_invitation.clinic_id,
    v_user_id,
    v_invitation.role,
    'active',
    v_invitation.invited_by
  )
  on conflict (clinic_id, user_id) do update
  set role = excluded.role,
      status = 'active',
      invited_by = excluded.invited_by,
      updated_at = now();

  update clinic_invitations
  set accepted_at = now(),
      updated_at = now()
  where id = v_invitation.id;

  update user_profiles
  set default_clinic_id = coalesce(default_clinic_id, v_invitation.clinic_id),
      updated_at = now()
  where id = v_user_id;

  return v_invitation.clinic_id;
end;
$$;

create or replace function handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function handle_new_user_profile();

drop trigger if exists set_clinics_updated_at on clinics;
create trigger set_clinics_updated_at
before update on clinics
for each row
execute function set_updated_at();

drop trigger if exists set_user_profiles_updated_at on user_profiles;
create trigger set_user_profiles_updated_at
before update on user_profiles
for each row
execute function set_updated_at();

drop trigger if exists set_clinic_memberships_updated_at on clinic_memberships;
create trigger set_clinic_memberships_updated_at
before update on clinic_memberships
for each row
execute function set_updated_at();

drop trigger if exists set_clinic_invitations_updated_at on clinic_invitations;
create trigger set_clinic_invitations_updated_at
before update on clinic_invitations
for each row
execute function set_updated_at();

drop trigger if exists set_clinic_subscriptions_updated_at on clinic_subscriptions;
create trigger set_clinic_subscriptions_updated_at
before update on clinic_subscriptions
for each row
execute function set_updated_at();

drop trigger if exists set_subscription_invoices_updated_at on subscription_invoices;
create trigger set_subscription_invoices_updated_at
before update on subscription_invoices
for each row
execute function set_updated_at();

drop trigger if exists set_leads_updated_at on leads;
create trigger set_leads_updated_at
before update on leads
for each row
execute function set_updated_at();

drop trigger if exists set_client_profiles_updated_at on client_profiles;
create trigger set_client_profiles_updated_at
before update on client_profiles
for each row
execute function set_updated_at();

drop trigger if exists enforce_therapists_clinic_id on therapists;
create trigger enforce_therapists_clinic_id
before insert or update on therapists
for each row
execute function enforce_row_clinic_id();

drop trigger if exists enforce_leads_clinic_id on leads;
create trigger enforce_leads_clinic_id
before insert or update on leads
for each row
execute function enforce_row_clinic_id();

drop trigger if exists enforce_patients_clinic_id on patients;
create trigger enforce_patients_clinic_id
before insert or update on patients
for each row
execute function enforce_row_clinic_id();

drop trigger if exists enforce_appointments_clinic_id on appointments;
create trigger enforce_appointments_clinic_id
before insert or update on appointments
for each row
execute function enforce_row_clinic_id();

drop trigger if exists enforce_session_notes_clinic_id on session_notes;
create trigger enforce_session_notes_clinic_id
before insert or update on session_notes
for each row
execute function enforce_row_clinic_id();

drop trigger if exists enforce_billing_clinic_id on billing;
create trigger enforce_billing_clinic_id
before insert or update on billing
for each row
execute function enforce_row_clinic_id();

drop trigger if exists enforce_client_profiles_clinic_id on client_profiles;
create trigger enforce_client_profiles_clinic_id
before insert or update on client_profiles
for each row
execute function enforce_row_clinic_id();

drop trigger if exists sync_patient_completed_sessions_trigger on appointments;
create trigger sync_patient_completed_sessions_trigger
after insert or update or delete on appointments
for each row
execute function sync_patient_completed_sessions();

insert into subscription_plans (
  plan_key,
  name,
  monthly_price_cents,
  therapist_limit,
  patient_limit,
  appointment_limit_monthly
)
values
  ('starter', 'Starter', 4900, 3, 300, 600),
  ('pro', 'Pro', 14900, 15, 2500, 6000),
  ('enterprise', 'Enterprise', 0, null, null, null)
on conflict (plan_key) do update
set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  therapist_limit = excluded.therapist_limit,
  patient_limit = excluded.patient_limit,
  appointment_limit_monthly = excluded.appointment_limit_monthly,
  updated_at = now();

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table clinics enable row level security;
alter table user_profiles enable row level security;
alter table clinic_memberships enable row level security;
alter table clinic_invitations enable row level security;
alter table subscription_plans enable row level security;
alter table clinic_subscriptions enable row level security;
alter table subscription_invoices enable row level security;
alter table therapists enable row level security;
alter table leads enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table session_notes enable row level security;
alter table billing enable row level security;
alter table client_profiles enable row level security;

drop policy if exists clinics_select on clinics;
create policy clinics_select
  on clinics
  for select
  to authenticated
  using (is_active_clinic_member(id));

drop policy if exists clinics_insert on clinics;
create policy clinics_insert
  on clinics
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists clinics_update on clinics;
create policy clinics_update
  on clinics
  for update
  to authenticated
  using (has_clinic_role(id, array['clinic_admin']))
  with check (has_clinic_role(id, array['clinic_admin']));

drop policy if exists user_profiles_select on user_profiles;
create policy user_profiles_select
  on user_profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from clinic_memberships self_cm
      join clinic_memberships target_cm
        on target_cm.clinic_id = self_cm.clinic_id
      where self_cm.user_id = auth.uid()
        and self_cm.status = 'active'
        and self_cm.role = 'clinic_admin'
        and target_cm.user_id = user_profiles.id
        and target_cm.status = 'active'
    )
  );

drop policy if exists user_profiles_insert on user_profiles;
create policy user_profiles_insert
  on user_profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists user_profiles_update on user_profiles;
create policy user_profiles_update
  on user_profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists clinic_memberships_select on clinic_memberships;
create policy clinic_memberships_select
  on clinic_memberships
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or has_clinic_role(clinic_id, array['clinic_admin'])
  );

drop policy if exists clinic_memberships_insert on clinic_memberships;
create policy clinic_memberships_insert
  on clinic_memberships
  for insert
  to authenticated
  with check (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists clinic_memberships_update on clinic_memberships;
create policy clinic_memberships_update
  on clinic_memberships
  for update
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']))
  with check (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists clinic_memberships_delete on clinic_memberships;
create policy clinic_memberships_delete
  on clinic_memberships
  for delete
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists clinic_invitations_select on clinic_invitations;
create policy clinic_invitations_select
  on clinic_invitations
  for select
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists clinic_invitations_insert on clinic_invitations;
create policy clinic_invitations_insert
  on clinic_invitations
  for insert
  to authenticated
  with check (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists clinic_invitations_update on clinic_invitations;
create policy clinic_invitations_update
  on clinic_invitations
  for update
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']))
  with check (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists clinic_invitations_delete on clinic_invitations;
create policy clinic_invitations_delete
  on clinic_invitations
  for delete
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists subscription_plans_select on subscription_plans;
create policy subscription_plans_select
  on subscription_plans
  for select
  to authenticated
  using (true);

drop policy if exists clinic_subscriptions_select on clinic_subscriptions;
create policy clinic_subscriptions_select
  on clinic_subscriptions
  for select
  to authenticated
  using (is_active_clinic_member(clinic_id));

drop policy if exists clinic_subscriptions_manage on clinic_subscriptions;
create policy clinic_subscriptions_manage
  on clinic_subscriptions
  for all
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']))
  with check (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists subscription_invoices_select on subscription_invoices;
create policy subscription_invoices_select
  on subscription_invoices
  for select
  to authenticated
  using (is_active_clinic_member(clinic_id));

drop policy if exists subscription_invoices_manage on subscription_invoices;
create policy subscription_invoices_manage
  on subscription_invoices
  for all
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']))
  with check (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists therapists_select on therapists;
create policy therapists_select
  on therapists
  for select
  to authenticated
  using (is_active_clinic_member(clinic_id));

drop policy if exists therapists_manage on therapists;
create policy therapists_manage
  on therapists
  for all
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']))
  with check (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists leads_select on leads;
create policy leads_select
  on leads
  for select
  to authenticated
  using (is_active_clinic_member(clinic_id));

drop policy if exists leads_manage on leads;
create policy leads_manage
  on leads
  for all
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']))
  with check (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']));

drop policy if exists patients_select on patients;
create policy patients_select
  on patients
  for select
  to authenticated
  using (is_active_clinic_member(clinic_id));

drop policy if exists patients_manage on patients;
create policy patients_manage
  on patients
  for all
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']))
  with check (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']));

drop policy if exists client_profiles_select on client_profiles;
create policy client_profiles_select
  on client_profiles
  for select
  to authenticated
  using (is_active_clinic_member(clinic_id));

drop policy if exists client_profiles_insert on client_profiles;
create policy client_profiles_insert
  on client_profiles
  for insert
  to authenticated
  with check (
    has_clinic_role(clinic_id, array['clinic_admin', 'receptionist', 'therapist'])
  );

drop policy if exists client_profiles_update on client_profiles;
create policy client_profiles_update
  on client_profiles
  for update
  to authenticated
  using (
    has_clinic_role(clinic_id, array['clinic_admin', 'receptionist', 'therapist'])
  )
  with check (
    has_clinic_role(clinic_id, array['clinic_admin', 'receptionist', 'therapist'])
  );

drop policy if exists client_profiles_delete on client_profiles;
create policy client_profiles_delete
  on client_profiles
  for delete
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin']));

drop policy if exists appointments_select on appointments;
create policy appointments_select
  on appointments
  for select
  to authenticated
  using (is_active_clinic_member(clinic_id));

drop policy if exists appointments_manage_admin on appointments;
create policy appointments_manage_admin
  on appointments
  for all
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']))
  with check (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']));

drop policy if exists appointments_update_own_therapist on appointments;
create policy appointments_update_own_therapist
  on appointments
  for update
  to authenticated
  using (is_current_user_therapist(clinic_id, therapist_id))
  with check (is_current_user_therapist(clinic_id, therapist_id));

drop policy if exists session_notes_select on session_notes;
create policy session_notes_select
  on session_notes
  for select
  to authenticated
  using (is_active_clinic_member(clinic_id));

drop policy if exists session_notes_manage on session_notes;
create policy session_notes_manage
  on session_notes
  for all
  to authenticated
  using (
    has_clinic_role(clinic_id, array['clinic_admin'])
    or is_current_user_therapist(clinic_id, therapist_id)
  )
  with check (
    has_clinic_role(clinic_id, array['clinic_admin'])
    or is_current_user_therapist(clinic_id, therapist_id)
  );

drop policy if exists billing_select on billing;
create policy billing_select
  on billing
  for select
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']));

drop policy if exists billing_manage on billing;
create policy billing_manage
  on billing
  for all
  to authenticated
  using (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']))
  with check (has_clinic_role(clinic_id, array['clinic_admin', 'receptionist']));
