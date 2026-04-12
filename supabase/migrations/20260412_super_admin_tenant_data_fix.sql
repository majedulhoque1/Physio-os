-- Fix schema drift for super admin patient browsing.
-- Some deployed databases are missing patients.total_sessions, which breaks
-- sa_list_patients at runtime when the Patients tab is opened.

alter table public.patients
  add column if not exists total_sessions int;

update public.patients p
set total_sessions = coalesce(
  (
    select tp.total_sessions
    from public.treatment_plans tp
    where tp.clinic_id = p.clinic_id
      and tp.patient_id = p.id
    order by
      case tp.status
        when 'active' then 0
        when 'completed' then 1
        when 'abandoned' then 2
        else 3
      end,
      tp.created_at desc
    limit 1
  ),
  0
);

alter table public.patients
  alter column total_sessions set default 0;

update public.patients
set total_sessions = 0
where total_sessions is null;

alter table public.patients
  alter column total_sessions set not null;

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
      coalesce(p.total_sessions, 0),
      coalesce(p.completed_sessions, 0),
      t.name as assigned_therapist_name,
      p.created_at
    from public.patients p
    left join public.therapists t on t.id = p.assigned_therapist
    where p.clinic_id = p_clinic_id
    order by p.created_at desc;
end;
$$;
