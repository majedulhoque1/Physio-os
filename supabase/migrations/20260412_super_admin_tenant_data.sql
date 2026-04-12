-- Super Admin: Tenant data browsing RPCs
-- All functions are SECURITY DEFINER and verify caller is super admin via _sa_check_access().

-- 1. List patients for a clinic
create or replace function sa_list_patients(p_clinic_id uuid)
returns table(
  id uuid,
  name text,
  phone text,
  age int,
  gender text,
  diagnosis text,
  status text,
  total_sessions int,
  completed_sessions int,
  assigned_therapist_name text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  perform _sa_check_access();

  return query
    select
      p.id,
      p.name,
      p.phone,
      p.age,
      p.gender,
      p.diagnosis,
      p.status,
      p.total_sessions,
      p.completed_sessions,
      t.name as assigned_therapist_name,
      p.created_at
    from patients p
    left join therapists t on t.id = p.assigned_therapist
    where p.clinic_id = p_clinic_id
    order by p.created_at desc;
end;
$$;

-- 2. List therapists for a clinic
create or replace function sa_list_therapists(p_clinic_id uuid)
returns table(
  id uuid,
  name text,
  phone text,
  specialization text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  perform _sa_check_access();

  return query
    select
      t.id,
      t.name,
      t.phone,
      t.specialization,
      t.status,
      t.created_at
    from therapists t
    where t.clinic_id = p_clinic_id
    order by t.created_at desc;
end;
$$;

-- 3. List appointments for a clinic
create or replace function sa_list_appointments(p_clinic_id uuid)
returns table(
  id uuid,
  patient_name text,
  therapist_name text,
  scheduled_at timestamptz,
  status text,
  duration_mins int,
  session_number int,
  notes text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  perform _sa_check_access();

  return query
    select
      a.id,
      p.name as patient_name,
      t.name as therapist_name,
      a.scheduled_at,
      a.status,
      a.duration_mins,
      a.session_number,
      a.notes,
      a.created_at
    from appointments a
    join patients p on p.id = a.patient_id
    join therapists t on t.id = a.therapist_id
    where a.clinic_id = p_clinic_id
    order by a.scheduled_at desc;
end;
$$;

-- 4. List treatment plans for a clinic
create or replace function sa_list_treatment_plans(p_clinic_id uuid)
returns table(
  id uuid,
  patient_name text,
  therapist_name text,
  diagnosis text,
  status text,
  total_sessions int,
  completed_sessions int,
  fee_per_session numeric,
  total_fee numeric,
  started_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  perform _sa_check_access();

  return query
    select
      tp.id,
      p.name as patient_name,
      t.name as therapist_name,
      tp.diagnosis,
      tp.status,
      tp.total_sessions,
      tp.completed_sessions,
      tp.fee_per_session,
      tp.total_fee,
      tp.started_at,
      tp.created_at
    from treatment_plans tp
    join patients p on p.id = tp.patient_id
    join therapists t on t.id = tp.therapist_id
    where tp.clinic_id = p_clinic_id
    order by tp.created_at desc;
end;
$$;
