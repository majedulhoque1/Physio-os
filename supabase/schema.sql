create extension if not exists pgcrypto;

create table if not exists therapists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  specialization text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
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

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_leads_updated_at on leads;

create trigger set_leads_updated_at
before update on leads
for each row
execute function set_updated_at();
