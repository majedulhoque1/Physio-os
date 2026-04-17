-- =============================================================================
-- Migration: 20260417_prescriptions.sql
-- Zero-Friction Prescription Builder: prescriptions + protocol_templates
-- + bangla_advice_library. Uses existing is_active_clinic_member and
-- has_clinic_role helpers (see 20260413_billing_domain.sql).
-- =============================================================================

-- 1. prescriptions table
create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  therapist_id uuid not null,
  treatment_plan_id uuid references treatment_plans(id) on delete set null,
  chief_complaints text[] not null default '{}',
  body_parts text[] not null default '{}',
  pain_vas int2 check (pain_vas is null or (pain_vas between 1 and 10)),
  diagnosis text,
  modalities text[] not null default '{}',
  exercises text[] not null default '{}',
  advice_en text[] not null default '{}',
  advice_bn text[] not null default '{}',
  notes text,
  template_used_id uuid,
  cloned_from_id uuid references prescriptions(id) on delete set null,
  handwriting_svg text,
  handwriting_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id)
);

create index if not exists prescriptions_patient_idx on prescriptions (patient_id, created_at desc);
create index if not exists prescriptions_clinic_idx on prescriptions (clinic_id, created_at desc);
create index if not exists prescriptions_therapist_idx on prescriptions (therapist_id, created_at desc);

alter table prescriptions enable row level security;

create policy if not exists "prescriptions_select_member"
  on prescriptions for select
  using (is_active_clinic_member(clinic_id));

create policy if not exists "prescriptions_insert_clinical"
  on prescriptions for insert
  with check (has_clinic_role(clinic_id, array['clinic_admin','therapist']));

create policy if not exists "prescriptions_update_clinical"
  on prescriptions for update
  using (has_clinic_role(clinic_id, array['clinic_admin','therapist']));

create policy if not exists "prescriptions_delete_admin"
  on prescriptions for delete
  using (has_clinic_role(clinic_id, array['clinic_admin']));

-- 2. protocol_templates
create table if not exists protocol_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  name text not null,
  diagnosis text,
  default_modalities text[] not null default '{}',
  default_exercises text[] not null default '{}',
  default_advice_en text[] not null default '{}',
  default_advice_bn text[] not null default '{}',
  default_body_parts text[] not null default '{}',
  is_active boolean not null default true,
  sort_order int2 not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists protocol_templates_clinic_idx on protocol_templates (clinic_id, is_active, sort_order);

alter table protocol_templates enable row level security;

create policy if not exists "protocol_templates_select_all_members"
  on protocol_templates for select
  using (clinic_id is null or is_active_clinic_member(clinic_id));

create policy if not exists "protocol_templates_insert_admin"
  on protocol_templates for insert
  with check (clinic_id is not null and has_clinic_role(clinic_id, array['clinic_admin']));

create policy if not exists "protocol_templates_update_admin"
  on protocol_templates for update
  using (clinic_id is not null and has_clinic_role(clinic_id, array['clinic_admin']));

create policy if not exists "protocol_templates_delete_admin"
  on protocol_templates for delete
  using (clinic_id is not null and has_clinic_role(clinic_id, array['clinic_admin']));

-- 3. bangla_advice_library
create table if not exists bangla_advice_library (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  category text not null check (category in (
    'posture','diabetes','exercise','follow_up','lifestyle','medication','diet','rest'
  )),
  text_bn text not null,
  text_en text,
  is_active boolean not null default true,
  sort_order int2 not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists bangla_advice_category_idx on bangla_advice_library (clinic_id, category, is_active, sort_order);

alter table bangla_advice_library enable row level security;

create policy if not exists "bangla_advice_select_all_members"
  on bangla_advice_library for select
  using (clinic_id is null or is_active_clinic_member(clinic_id));

create policy if not exists "bangla_advice_insert_admin"
  on bangla_advice_library for insert
  with check (clinic_id is not null and has_clinic_role(clinic_id, array['clinic_admin']));

create policy if not exists "bangla_advice_update_admin"
  on bangla_advice_library for update
  using (clinic_id is not null and has_clinic_role(clinic_id, array['clinic_admin']));

create policy if not exists "bangla_advice_delete_admin"
  on bangla_advice_library for delete
  using (clinic_id is not null and has_clinic_role(clinic_id, array['clinic_admin']));

-- 4. Seed protocol_templates (6 BD presets, clinic_id = null)
insert into protocol_templates (clinic_id, name, diagnosis, default_modalities, default_exercises, default_advice_en, default_advice_bn, default_body_parts, sort_order)
values
  (null, 'PLID (Lumbar Disc Prolapse)', 'Prolapsed Lumbar Intervertebral Disc',
    array['IFT','SWD','Hot Pack','Traction'],
    array['Pelvic tilt','Bridging','Knee to chest','McKenzie extension','Core stabilization'],
    array['Avoid heavy lifting','Sleep on firm mattress','Avoid forward bending'],
    array[E'\u09ad\u09be\u09b0\u09c0 \u099c\u09bf\u09a8\u09bf\u09b8 \u09a4\u09c1\u09b2\u09ac\u09c7\u09a8 \u09a8\u09be', E'\u09b6\u0995\u09cd\u09a4 \u09ac\u09bf\u099b\u09be\u09a8\u09be\u09af\u09bc \u0998\u09c1\u09ae\u09be\u09ac\u09c7\u09a8', E'\u09b8\u09be\u09ae\u09a8\u09c7 \u099c\u09c1\u0981\u0995\u09ac\u09c7\u09a8 \u09a8\u09be'],
    array['Lower Back'], 10),
  (null, 'Frozen Shoulder', 'Adhesive Capsulitis',
    array['UST','TENS','Hot Pack','SWD'],
    array['Pendulum exercise','Codman''s exercise','Wall climbing','Cross-body stretch','Pulley exercise'],
    array['Apply hot pack twice daily','Do not force painful movements','Keep shoulder mobile'],
    array[E'\u09a6\u09bf\u09a8\u09c7 \u09a6\u09c1\u0987\u09ac\u09be\u09b0 \u0997\u09b0\u09ae \u09b8\u09c7\u0981\u0995 \u09a6\u09bf\u09ac\u09c7\u09a8', E'\u09ac\u09cd\u09af\u09a5\u09be \u099c\u09cb\u09b0 \u0995\u09b0\u09c7 \u09b8\u09b9\u09cd\u09af \u0995\u09b0\u09ac\u09c7\u09a8 \u09a8\u09be', E'\u0995\u09be\u0981\u09a7 \u09a8\u09be\u09dc\u09be\u099a\u09be\u09dc\u09be\u09af\u09bc \u09b0\u09be\u0996\u09ac\u09c7\u09a8'],
    array['Shoulder'], 20),
  (null, 'Cervical Spondylosis', 'Cervical Spondylosis',
    array['UST','IFT','Cervical Traction','Hot Pack'],
    array['Neck isometrics','Chin tuck','Shoulder shrug','Neck stretches','Scapular retraction'],
    array['Use cervical pillow','Avoid prolonged screen time','Maintain upright posture'],
    array[E'\u09b8\u09be\u09b0\u09cd\u09ad\u09be\u0987\u0995\u09be\u09b2 \u09ac\u09be\u09b2\u09bf\u09b6 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09ac\u09c7\u09a8', E'\u09b2\u09ae\u09cd\u09ac\u09be \u09b8\u09ae\u09af\u09bc \u09b8\u09cd\u0995\u09cd\u09b0\u09bf\u09a8 \u09a6\u09c7\u0996\u09ac\u09c7\u09a8 \u09a8\u09be', E'\u09b8\u09cb\u099c\u09be \u09b9\u09af\u09bc\u09c7 \u09ac\u09b8\u09ac\u09c7\u09a8'],
    array['Neck'], 30),
  (null, 'Stroke Rehab (Early)', 'CVA — Early Rehabilitation',
    array['Neuromuscular Electrical Stimulation','Passive ROM','Functional Electrical Stimulation'],
    array['Passive ROM all joints','Bed mobility','Sitting balance','Weight shifting','Bridging'],
    array['Family assists ROM every 2 hours','Prevent bedsores','Control BP and sugar'],
    array[E'\u09aa\u09cd\u09b0\u09a4\u09bf \u09e8 \u0998\u09a8\u09cd\u099f\u09be\u09af\u09bc \u09aa\u09b0\u09bf\u09ac\u09be\u09b0 \u09b8\u09be\u09b9\u09be\u09af\u09cd\u09af \u0995\u09b0\u09ac\u09c7', E'\u09aa\u09be\u09b6 \u09ab\u09bf\u09b0\u09be\u09ac\u09c7\u09a8 \u09a8\u09bf\u09af\u09bc\u09ae\u09bf\u09a4', E'\u09aa\u09cd\u09b0\u09c7\u09b8\u09be\u09b0 \u0993 \u09b8\u09c1\u0997\u09be\u09b0 \u09a8\u09bf\u09af\u09bc\u09a8\u09cd\u09a4\u09cd\u09b0\u09a3\u09c7 \u09b0\u09be\u0996\u09ac\u09c7\u09a8'],
    array['Shoulder','Hip','Knee'], 40),
  (null, 'Knee Osteoarthritis', 'Knee OA',
    array['UST','TENS','SWD','Hot Pack'],
    array['Quadriceps isometrics','Straight leg raise','Knee flexion/extension','Wall squats (partial)','Step-ups'],
    array['Reduce body weight','Avoid stairs and squatting','Use knee cap support'],
    array[E'\u0993\u099c\u09a8 \u0995\u09ae\u09be\u09ac\u09c7\u09a8', E'\u09b8\u09bf\u0981\u09dc\u09bf \u0993 \u09ac\u09b8\u09be-\u0989\u09a0\u09be \u0995\u09ae \u0995\u09b0\u09ac\u09c7\u09a8', E'\u09a8\u09c0 \u0995\u09cd\u09af\u09be\u09aa \u09aa\u09b0\u09ac\u09c7\u09a8'],
    array['Knee'], 50),
  (null, 'Sciatica', 'Sciatica / Lumbar Radiculopathy',
    array['IFT','TENS','SWD','Lumbar Traction'],
    array['Piriformis stretch','Nerve gliding','McKenzie extension','Hamstring stretch','Pelvic tilt'],
    array['Avoid prolonged sitting','Use lumbar support','Walk every hour'],
    array[E'\u09b2\u09ae\u09cd\u09ac\u09be \u09b8\u09ae\u09af\u09bc \u09ac\u09b8\u09c7 \u09a5\u09be\u0995\u09ac\u09c7\u09a8 \u09a8\u09be', E'\u09ac\u09b8\u09be\u09b0 \u09b8\u09ae\u09af\u09bc \u09b2\u09be\u09ae\u09cd\u09ac\u09be\u09b0 \u09b8\u09be\u09aa\u09cb\u09b0\u09cd\u099f \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09ac\u09c7\u09a8', E'\u09aa\u09cd\u09b0\u09a4\u09bf \u0998\u09a8\u09cd\u099f\u09be\u09af\u09bc \u098f\u0995\u099f\u09c1 \u09b9\u09be\u0981\u099f\u09ac\u09c7\u09a8'],
    array['Lower Back','Hip'], 60)
on conflict do nothing;

-- 5. Seed bangla_advice_library (17 snippets across 8 categories)
insert into bangla_advice_library (clinic_id, category, text_bn, text_en, sort_order) values
  (null, 'posture',    E'\u09ac\u09b8\u09be\u09b0 \u09b8\u09ae\u09af\u09bc \u09aa\u09bf\u09a0 \u09b8\u09cb\u099c\u09be \u09b0\u09be\u0996\u09ac\u09c7\u09a8',                    'Keep your back straight while sitting', 10),
  (null, 'posture',    E'\u09a6\u09c0\u09b0\u09cd\u0998 \u09b8\u09ae\u09af\u09bc \u098f\u0995 \u0985\u09ac\u09b8\u09cd\u09a5\u09be\u09af\u09bc \u09ac\u09b8\u09ac\u09c7\u09a8 \u09a8\u09be',                'Do not sit in one position for long', 20),
  (null, 'posture',    E'\u09b8\u09cb\u09ab\u09be\u09af\u09bc \u09b9\u09c7\u09b2\u09be\u09a8 \u09a6\u09bf\u09af\u09bc\u09c7 \u09ac\u09b8\u09ac\u09c7\u09a8 \u09a8\u09be',                    'Avoid slouching on the sofa', 30),
  (null, 'diabetes',   E'\u09a1\u09be\u09af\u09bc\u09be\u09ac\u09c7\u099f\u09bf\u09b8 \u09a8\u09bf\u09af\u09bc\u09a8\u09cd\u09a4\u09cd\u09b0\u09a3\u09c7 \u09b0\u09be\u0996\u09ac\u09c7\u09a8',                  'Keep diabetes under control', 10),
  (null, 'diabetes',   E'\u09aa\u09cd\u09b0\u09c7\u09b8\u09be\u09b0 \u09a8\u09bf\u09af\u09bc\u09ae\u09bf\u09a4 \u099a\u09c7\u0995 \u0995\u09b0\u09ac\u09c7\u09a8',                       'Monitor your blood pressure regularly', 20),
  (null, 'exercise',   E'\u09aa\u09cd\u09b0\u09a4\u09bf\u09a6\u09bf\u09a8 \u09e7\u09eb \u09ae\u09bf\u09a8\u09bf\u099f \u09b9\u09be\u0981\u099f\u09ac\u09c7\u09a8',                     'Walk for 15 minutes daily', 10),
  (null, 'exercise',   E'\u09a8\u09bf\u09af\u09bc\u09ae\u09bf\u09a4 \u09ac\u09cd\u09af\u09be\u09af\u09bc\u09be\u09ae \u0995\u09b0\u09ac\u09c7\u09a8',                            'Exercise regularly', 20),
  (null, 'exercise',   E'\u09b8\u0995\u09be\u09b2\u09c7 \u09b9\u09be\u09b2\u0995\u09be \u09b8\u09cd\u099f\u09cd\u09b0\u09c7\u099a\u09bf\u0982 \u0995\u09b0\u09ac\u09c7\u09a8',                   'Do light stretching in the morning', 30),
  (null, 'follow_up',  E'\u09ed \u09a6\u09bf\u09a8 \u09aa\u09b0 \u0986\u09ac\u09be\u09b0 \u0986\u09b8\u09ac\u09c7\u09a8',                          'Follow up in 7 days', 10),
  (null, 'follow_up',  E'\u09b8\u09ae\u09b8\u09cd\u09af\u09be \u09ac\u09be\u09dc\u09b2\u09c7 \u09b8\u09be\u09a5\u09c7 \u09b8\u09be\u09a5\u09c7 \u099c\u09be\u09a8\u09be\u09ac\u09c7\u09a8',                'Contact us if the problem worsens', 20),
  (null, 'lifestyle',  E'\u09a7\u09c2\u09ae\u09aa\u09be\u09a8 \u09ac\u09b0\u09cd\u099c\u09a8 \u0995\u09b0\u09ac\u09c7\u09a8',                             'Avoid smoking', 10),
  (null, 'lifestyle',  E'\u09aa\u09b0\u09cd\u09af\u09be\u09aa\u09cd\u09a4 \u09ac\u09bf\u09b6\u09cd\u09b0\u09be\u09ae \u09a8\u09bf\u09ac\u09c7\u09a8',                          'Get adequate rest', 20),
  (null, 'medication', E'\u0994\u09b7\u09a7 \u09a8\u09bf\u09af\u09bc\u09ae\u09bf\u09a4 \u09b8\u09c7\u09ac\u09a8 \u0995\u09b0\u09ac\u09c7\u09a8',                         'Take medications as prescribed', 10),
  (null, 'diet',       E'\u09aa\u09be\u09a8\u09bf \u09ac\u09c7\u09b6\u09bf \u0996\u09be\u09ac\u09c7\u09a8 (\u09a6\u09bf\u09a8\u09c7 \u09ee \u0997\u09cd\u09b2\u09be\u09b8)',                  'Drink plenty of water (8 glasses/day)', 10),
  (null, 'diet',       E'\u09a4\u09c8\u09b2\u09be\u0995\u09cd\u09a4 \u0993 \u09ad\u09be\u099c\u09be \u0996\u09be\u09ac\u09be\u09b0 \u0995\u09ae \u0996\u09be\u09ac\u09c7\u09a8',                 'Limit oily and fried foods', 20),
  (null, 'rest',       E'\u09b0\u09be\u09a4\u09c7 \u09ed-\u09ee \u0998\u09a8\u09cd\u099f\u09be \u0998\u09c1\u09ae\u09be\u09ac\u09c7\u09a8',                          'Sleep 7-8 hours at night', 10),
  (null, 'rest',       E'\u0986\u0995\u09cd\u09b0\u09be\u09a8\u09cd\u09a4 \u09b8\u09cd\u09a5\u09be\u09a8\u09c7 \u0985\u09a4\u09bf\u09b0\u09bf\u0995\u09cd\u09a4 \u099a\u09be\u09aa \u09a6\u09bf\u09ac\u09c7\u09a8 \u09a8\u09be',           'Avoid excessive pressure on affected area', 20)
on conflict do nothing;

-- 6. updated_at trigger function
create or replace function touch_prescriptions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prescriptions_touch_updated_at on prescriptions;
create trigger prescriptions_touch_updated_at
  before update on prescriptions
  for each row execute function touch_prescriptions_updated_at();

drop trigger if exists protocol_templates_touch_updated_at on protocol_templates;
create trigger protocol_templates_touch_updated_at
  before update on protocol_templates
  for each row execute function touch_prescriptions_updated_at();
