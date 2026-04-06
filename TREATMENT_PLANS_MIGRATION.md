# CLAUDE CODE INSTRUCTION: Add treatment_plans + Automation Infrastructure

## Context
Physio OS is a multi-tenant clinic management SaaS. Supabase project ID: `cdelmnguwakvznemnbxu`. All tables have 0 patient/clinical rows — safe to restructure.

Currently `total_sessions` and `completed_sessions` live on the `patients` table. This is wrong — it mixes identity with clinical journey. A patient can return for a new condition months later. We need a separate `treatment_plans` table as the spine connecting patients → appointments → billing → automation triggers.

We're also adding automation infrastructure tables so n8n workflows can log messages, avoid duplicates, and clinics can customize their automation behavior.

---

## STEP 1: Create `treatment_plans` table

```sql
CREATE TABLE treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  therapist_id UUID NOT NULL REFERENCES therapists(id),
  diagnosis TEXT,
  total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
  completed_sessions INTEGER NOT NULL DEFAULT 0 CHECK (completed_sessions >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Composite FK for clinic isolation
ALTER TABLE treatment_plans
  ADD CONSTRAINT treatment_plans_clinic_patient_fk
  FOREIGN KEY (patient_id, clinic_id)
  REFERENCES patients(id, clinic_id);

ALTER TABLE treatment_plans
  ADD CONSTRAINT treatment_plans_clinic_therapist_fk
  FOREIGN KEY (therapist_id, clinic_id)
  REFERENCES therapists(id, clinic_id);

-- Index for common queries
CREATE INDEX idx_treatment_plans_clinic_id ON treatment_plans(clinic_id);
CREATE INDEX idx_treatment_plans_patient_id ON treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX idx_treatment_plans_completed_at ON treatment_plans(completed_at) WHERE completed_at IS NOT NULL;
```

For the composite FKs above to work, you need unique constraints on the referenced tables:

```sql
-- Add unique constraints if they don't already exist
ALTER TABLE patients ADD CONSTRAINT patients_id_clinic_id_unique UNIQUE (id, clinic_id);
ALTER TABLE therapists ADD CONSTRAINT therapists_id_clinic_id_unique UNIQUE (id, clinic_id);
ALTER TABLE appointments ADD CONSTRAINT appointments_id_clinic_id_unique UNIQUE (id, clinic_id);
```

Check if these already exist first. If they do, skip.

---

## STEP 2: Link `appointments` to `treatment_plans`

```sql
ALTER TABLE appointments
  ADD COLUMN treatment_plan_id UUID REFERENCES treatment_plans(id);

-- Composite FK for clinic isolation
ALTER TABLE appointments
  ADD CONSTRAINT appointments_clinic_treatment_plan_fk
  FOREIGN KEY (treatment_plan_id, clinic_id)
  REFERENCES treatment_plans(id, clinic_id);

-- Add unique constraint on treatment_plans for the composite FK
ALTER TABLE treatment_plans ADD CONSTRAINT treatment_plans_id_clinic_id_unique UNIQUE (id, clinic_id);

CREATE INDEX idx_appointments_treatment_plan_id ON appointments(treatment_plan_id);
```

---

## STEP 3: Link `billing` to `treatment_plans`

```sql
ALTER TABLE billing
  ADD COLUMN treatment_plan_id UUID REFERENCES treatment_plans(id);

ALTER TABLE billing
  ADD CONSTRAINT billing_clinic_treatment_plan_fk
  FOREIGN KEY (treatment_plan_id, clinic_id)
  REFERENCES treatment_plans(id, clinic_id);

CREATE INDEX idx_billing_treatment_plan_id ON billing(treatment_plan_id);
```

---

## STEP 4: Remove session tracking from `patients` table

```sql
-- These columns move to treatment_plans
ALTER TABLE patients DROP COLUMN IF EXISTS total_sessions;
ALTER TABLE patients DROP COLUMN IF EXISTS completed_sessions;
```

Do NOT remove `status` from patients — a patient-level status (active/dropped) is still valid independently from treatment plan status. A patient can be "active" (still a clinic patient) while a treatment plan is "completed."

---

## STEP 5: Create DB trigger — auto-increment completed_sessions

When an appointment status changes to 'completed', auto-increment `completed_sessions` on the linked treatment plan. If completed_sessions reaches total_sessions, auto-flip status to 'completed' and set completed_at.

```sql
CREATE OR REPLACE FUNCTION handle_appointment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NEW.treatment_plan_id IS NOT NULL THEN
      UPDATE treatment_plans
      SET
        completed_sessions = completed_sessions + 1,
        status = CASE
          WHEN completed_sessions + 1 >= total_sessions THEN 'completed'
          ELSE status
        END,
        completed_at = CASE
          WHEN completed_sessions + 1 >= total_sessions THEN now()
          ELSE completed_at
        END,
        updated_at = now()
      WHERE id = NEW.treatment_plan_id;
    END IF;
  END IF;

  -- Handle reversal: if status changes FROM 'completed' to something else
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    IF NEW.treatment_plan_id IS NOT NULL THEN
      UPDATE treatment_plans
      SET
        completed_sessions = GREATEST(completed_sessions - 1, 0),
        status = 'active',
        completed_at = NULL,
        updated_at = now()
      WHERE id = NEW.treatment_plan_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_appointment_completion
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_appointment_completion();
```

---

## STEP 6: Create `message_log` table (automation tracking)

This table logs every automated message sent by n8n (WhatsApp thank-you, reminders, missed-session alerts, follow-ups). Prevents duplicate sends and gives admin visibility into what patients received.

```sql
CREATE TABLE message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  treatment_plan_id UUID REFERENCES treatment_plans(id),
  appointment_id UUID REFERENCES appointments(id),
  message_type TEXT NOT NULL CHECK (message_type IN (
    'thank_you',
    'session_reminder',
    'missed_session',
    'followup',
    'custom'
  )),
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  message_content TEXT,
  external_message_id TEXT, -- WhatsApp API message ID for delivery tracking
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_message_log_clinic_id ON message_log(clinic_id);
CREATE INDEX idx_message_log_patient_id ON message_log(patient_id);
CREATE INDEX idx_message_log_type_status ON message_log(message_type, status);

-- Duplicate prevention: one message per type per appointment
CREATE UNIQUE INDEX idx_message_log_unique_per_appointment
  ON message_log(appointment_id, message_type)
  WHERE appointment_id IS NOT NULL;

-- Duplicate prevention: one followup per treatment plan
CREATE UNIQUE INDEX idx_message_log_unique_followup
  ON message_log(treatment_plan_id, message_type)
  WHERE message_type = 'followup' AND treatment_plan_id IS NOT NULL;
```

---

## STEP 7: Create `clinic_settings` table (per-clinic automation config)

Each clinic can customize their automation behavior — timing, message templates, which automations are enabled/disabled.

```sql
CREATE TABLE clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) UNIQUE,

  -- Automation toggles
  auto_thank_you_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_missed_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_followup_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Timing config
  thank_you_delay_minutes INTEGER NOT NULL DEFAULT 60,
  reminder_hours_before INTEGER NOT NULL DEFAULT 24,
  followup_delay_days INTEGER NOT NULL DEFAULT 7,
  abandoned_threshold_days INTEGER NOT NULL DEFAULT 14,

  -- Message templates (WhatsApp). Use {{patient_name}}, {{therapist_name}}, {{clinic_name}}, {{session_number}}, {{total_sessions}}, {{appointment_date}}, {{appointment_time}} as placeholders.
  thank_you_template TEXT DEFAULT 'Hi {{patient_name}}, thank you for visiting {{clinic_name}} today! Your session with {{therapist_name}} has been recorded. See you next time!',
  reminder_template TEXT DEFAULT 'Hi {{patient_name}}, this is a reminder that you have a session at {{clinic_name}} tomorrow at {{appointment_time}} with {{therapist_name}}. Session {{session_number}} of {{total_sessions}}.',
  missed_template TEXT DEFAULT 'Hi {{patient_name}}, we noticed you missed your session at {{clinic_name}} today. Would you like to reschedule? Please contact us to book a new time.',
  followup_template TEXT DEFAULT 'Hi {{patient_name}}, it has been a week since you completed your treatment at {{clinic_name}}. How are you feeling? If you need any follow-up care, we are here for you.',

  -- Clinic operational defaults
  default_session_duration_mins INTEGER NOT NULL DEFAULT 45,
  currency TEXT NOT NULL DEFAULT 'BDT',
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clinic_settings_clinic_id ON clinic_settings(clinic_id);
```

---

## STEP 8: RLS Policies for new tables

Follow the exact same pattern from MULTI_TENANT_SECURITY_PATTERN.md. Use the existing `is_active_clinic_member()` function.

```sql
-- treatment_plans
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY treatment_plans_select ON treatment_plans
  FOR SELECT TO authenticated
  USING (is_active_clinic_member(clinic_id));

CREATE POLICY treatment_plans_insert ON treatment_plans
  FOR INSERT TO authenticated
  WITH CHECK (is_active_clinic_member(clinic_id));

CREATE POLICY treatment_plans_update ON treatment_plans
  FOR UPDATE TO authenticated
  USING (is_active_clinic_member(clinic_id));

CREATE POLICY treatment_plans_delete ON treatment_plans
  FOR DELETE TO authenticated
  USING (is_active_clinic_member(clinic_id));

-- message_log
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_log_select ON message_log
  FOR SELECT TO authenticated
  USING (is_active_clinic_member(clinic_id));

CREATE POLICY message_log_insert ON message_log
  FOR INSERT TO authenticated
  WITH CHECK (is_active_clinic_member(clinic_id));

CREATE POLICY message_log_update ON message_log
  FOR UPDATE TO authenticated
  USING (is_active_clinic_member(clinic_id));

-- clinic_settings
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinic_settings_select ON clinic_settings
  FOR SELECT TO authenticated
  USING (is_active_clinic_member(clinic_id));

CREATE POLICY clinic_settings_update ON clinic_settings
  FOR UPDATE TO authenticated
  USING (is_active_clinic_member(clinic_id));

-- Only clinic_admin can insert/modify settings
CREATE POLICY clinic_settings_insert ON clinic_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active_clinic_member(clinic_id)
    AND EXISTS (
      SELECT 1 FROM clinic_memberships
      WHERE clinic_memberships.clinic_id = clinic_settings.clinic_id
      AND clinic_memberships.user_id = auth.uid()
      AND clinic_memberships.role = 'clinic_admin'
      AND clinic_memberships.status = 'active'
    )
  );
```

---

## STEP 9: Auto-create clinic_settings on new clinic

```sql
CREATE OR REPLACE FUNCTION handle_new_clinic_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO clinic_settings (clinic_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_clinic_settings
  AFTER INSERT ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_clinic_settings();
```

For the existing clinic row, manually insert:
```sql
INSERT INTO clinic_settings (clinic_id)
SELECT id FROM clinics
WHERE id NOT IN (SELECT clinic_id FROM clinic_settings);
```

---

## STEP 10: Frontend changes required

After running the migration, update these files in the React app:

### 10a. Create `useTreatmentPlans.ts` hook
- Follow the SECURE hook pattern from `useAppointments.SECURE.ts`
- CRUD operations with clinic_id filtering
- When creating a treatment plan, also create the first appointment
- Expose `completePlan`, `abandonPlan`, `pausePlan` mutations

### 10b. Update patient creation flow
- When receptionist creates a new patient + assigns therapist + sets session count:
  - Insert into `patients` (name, phone, age, gender, diagnosis, clinic_id)
  - Insert into `treatment_plans` (patient_id, therapist_id, total_sessions, diagnosis, clinic_id)
  - The `total_sessions` and `completed_sessions` fields NO LONGER exist on patients

### 10c. Update appointment creation
- When creating an appointment, require `treatment_plan_id`
- Auto-populate `session_number` from `treatment_plans.completed_sessions + 1`
- Show treatment plan context in appointment UI: "Session 2 of 5"

### 10d. Update Patient Profile page
- Replace direct `total_sessions`/`completed_sessions` reads from patient record
- Instead, fetch from `treatment_plans` WHERE patient_id = X
- Support displaying MULTIPLE treatment plans per patient (tabs or accordion)
- Show treatment plan status badge (active/completed/abandoned/paused)

### 10e. Update Therapist Workspace
- When therapist marks session complete, the DB trigger handles incrementing
- No manual counter updates needed in frontend code
- Show treatment plan progress bar: "3/5 sessions completed"

### 10f. Update Billing page
- Link billing records to treatment_plan_id where applicable
- Show billing grouped by treatment plan

### 10g. Add Settings page section for automation config
- Admin-only section in clinic settings
- Toggle automations on/off
- Customize timing (reminder hours, follow-up days)
- Edit message templates with placeholder preview
- This reads/writes from `clinic_settings` table

### 10h. Add Message Log viewer
- Admin-only page or tab within patient profile
- Shows all automated messages sent to a patient
- Status tracking: pending → sent → delivered → read → failed
- Filter by message type, date range

### 10i. Update TypeScript types
- Add `TreatmentPlan`, `MessageLog`, `ClinicSettings` interfaces
- Remove `total_sessions` and `completed_sessions` from `Patient` type
- Add `treatment_plan_id` to `Appointment` type
- Add `treatment_plan_id` to `Billing` type

---

## STEP 11: n8n Webhook Preparation (do NOT build yet — document only)

After this migration, the 5 n8n workflows will watch these trigger points:

| Workflow | Trigger Source | Condition |
|---|---|---|
| Thank You | `billing` table, `paid_at` set | `clinic_settings.auto_thank_you_enabled = true` |
| Session Reminder | `appointments.scheduled_at` | Cron: daily check for tomorrow's appointments |
| Missed Session | `appointments.status = 'missed'` | Webhook on status change |
| Follow-up | `treatment_plans.status = 'completed'` | `completed_at + followup_delay_days` |
| Abandoned Alert | `treatment_plans.status = 'active'` | No appointment in last `abandoned_threshold_days` |

All workflows check `message_log` for duplicates before sending. All workflows read templates from `clinic_settings`. All messages logged to `message_log` after send.

Do NOT build n8n workflows now. Just ensure the schema supports them.

---

## Execution Order

1. Run unique constraints (Step 2 prerequisites)
2. Create `treatment_plans` table (Step 1)
3. Add `treatment_plan_id` to appointments (Step 2)
4. Add `treatment_plan_id` to billing (Step 3)
5. Drop columns from patients (Step 4)
6. Create trigger function (Step 5)
7. Create `message_log` (Step 6)
8. Create `clinic_settings` (Step 7)
9. Apply RLS policies (Step 8)
10. Auto-create settings trigger (Step 9)
11. Seed settings for existing clinic (Step 9)
12. Update frontend (Step 10)
13. Update TypeScript types (Step 10i)

Run steps 1-11 as a single Supabase migration. Step 12-13 are React code changes.

---

## Validation Checklist

After migration:
- [ ] `treatment_plans` table exists with RLS enabled
- [ ] `appointments.treatment_plan_id` column exists
- [ ] `billing.treatment_plan_id` column exists
- [ ] `patients.total_sessions` and `patients.completed_sessions` are GONE
- [ ] `message_log` table exists with duplicate prevention indexes
- [ ] `clinic_settings` table exists with one row per clinic
- [ ] DB trigger: marking appointment complete increments treatment plan counter
- [ ] DB trigger: when completed_sessions == total_sessions, plan auto-completes
- [ ] DB trigger: new clinic auto-gets clinic_settings row
- [ ] RLS policies on all 3 new tables
- [ ] Frontend compiles with no TypeScript errors referencing old patient fields
