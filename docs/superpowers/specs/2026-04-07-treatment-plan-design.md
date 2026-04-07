# Treatment Plan Feature — Design Spec
**Date:** 2026-04-07  
**Project:** Physio OS  
**Status:** Approved

---

## Overview

Expand the existing bare-bones treatment plan (session counter + status) into a precise, clinically + operationally complete plan for each patient. Plans are created and edited via a 2-tab modal on the Patient Profile page.

---

## Problem Statement

The current `treatment_plans` table only stores `diagnosis`, `total_sessions`, `completed_sessions`, `status`, and `notes`. There is no UI to create a plan, and no way to capture clinical detail (goals, interventions, precautions) or package/billing information. Therapists are working blind; receptionists have no package context.

---

## Goals

- Allow creation and editing of treatment plans from the Patient Profile page
- Capture clinically meaningful data (goals, interventions, frequency, precautions, reassessment date, patient instructions)
- Capture operational/billing data (package name, sessions, fees)
- Keep the UI simple — low learning curve, tab-separated concerns

---

## Data Model

### New columns on `treatment_plans` table

**Clinical fields:**

| Column | Type | Nullable | Description |
|---|---|---|---|
| `short_term_goals` | `text` | yes | e.g. "Reduce pain to 3/10 in 2 weeks" |
| `long_term_goals` | `text` | yes | e.g. "Full ROM, return to work" |
| `interventions` | `text[]` | yes | Array of prescribed exercises/modalities |
| `frequency_per_week` | `integer` | yes | Sessions per week, 1–7 |
| `precautions` | `text` | yes | Contraindications, red flags |
| `reassessment_date` | `date` | yes | Formal reassessment date |
| `patient_instructions` | `text` | yes | Home exercise program, do's/don'ts |

**Operational fields:**

| Column | Type | Nullable | Description |
|---|---|---|---|
| `package_name` | `text` | yes | e.g. "10-session back pain package" |
| `fee_per_session` | `numeric` | yes | BDT per session |
| `total_fee` | `numeric` | yes | Auto-calculated or manually overridden |

**Existing fields kept as-is:**
- `diagnosis`, `total_sessions`, `completed_sessions`, `status`, `notes`, `started_at`, `completed_at`, `abandoned_at`

### Migration

One Supabase SQL migration file adds all 9 columns with no defaults (all nullable). No breaking changes to existing data.

---

## TypeScript Types

`TreatmentPlanRow` in `src/types/index.ts` extended with the 9 new fields (all `string | null`, `number | null`, or `string[] | null`).

`CreateTreatmentPlanInput` in `src/hooks/useTreatmentPlans.ts` updated to accept all new fields as optional.

New `UpdateTreatmentPlanInput` type added (same shape as create, plus `id`).

---

## UI Design

### Entry Point

"New Plan" button added to the Treatment Plans section header in `PatientProfile`. Visible only when `can("manage_patients")` is true. Clicking opens `TreatmentPlanModal` with a blank form.

An edit icon (pencil) on each `TreatmentPlanCard` reopens the modal pre-filled with that plan's data.

### `TreatmentPlanModal`

**Header:** "New Treatment Plan" or "Edit Treatment Plan" — patient name as subtitle.

**Tab 1 — Clinical**

| Field | Input type | Required |
|---|---|---|
| Diagnosis | text input | yes |
| Short-term Goals | textarea (2 rows) | no |
| Long-term Goals | textarea (2 rows) | no |
| Interventions | tag input (type + Enter to add, click × to remove) | no |
| Frequency per week | number stepper (1–7) | no |
| Reassessment Date | date input | no |
| Precautions | textarea (2 rows) | no |
| Patient Instructions | textarea (3 rows) | no |

**Tab 2 — Package & Billing**

| Field | Input type | Required |
|---|---|---|
| Package Name | text input | no |
| Total Sessions | number input | yes |
| Start Date | date input | no |
| Fee per Session (BDT) | number input | no |
| Total Fee (BDT) | number input — auto = sessions × fee, user-editable | no |
| Notes | textarea (3 rows) | no |

**Footer:** `Cancel` (ghost) | `Save Plan` (primary). Save is disabled while submitting.

**Tab switching:** clicking the other tab while form is partially filled retains all values — no data loss on tab switch.

**Validation:** only `diagnosis` and `total_sessions` are required. All other fields are optional — therapist can fill what's relevant.

### `TreatmentPlanCard` (extracted + updated)

Collapsed state shows:
- Status badge + diagnosis
- Session progress bar (completed / total)
- Frequency per week (if set)
- Package name + total fee (if set)
- Therapist name + start date
- Edit icon (pencil) for `can("manage_patients")`

Expand toggle shows:
- Short-term goals
- Long-term goals
- Interventions (tag chips, read-only)
- Reassessment date
- Precautions
- Patient instructions

---

## Component Architecture

### New files

| File | Purpose |
|---|---|
| `src/components/patients/TreatmentPlanModal.tsx` | 2-tab modal for create/edit |
| `src/components/patients/TreatmentPlanCard.tsx` | Card with collapse/expand, extracted from PatientProfile |

### Modified files

| File | Change |
|---|---|
| `src/hooks/useTreatmentPlans.ts` | Update `createPlan` to send new fields; add `updatePlan` function |
| `src/types/index.ts` | Add 9 new fields to `TreatmentPlanRow`; add `UpdateTreatmentPlanInput` |
| `src/pages/PatientProfile.tsx` | Import new components, add "New Plan" button, wire modal state |

### Migration file

`supabase/migrations/YYYYMMDDHHMMSS_treatment_plan_fields.sql` — adds 9 nullable columns.

---

## Data Flow

**Create:**
1. User clicks "New Plan" → modal opens (blank)
2. User fills Clinical + Package tabs → clicks Save
3. `createPlan(input)` called → inserts to Supabase with all fields
4. Hook refreshes plans → modal closes → card appears

**Edit:**
1. User clicks pencil on a card → modal opens pre-filled
2. User edits → clicks Save
3. `updatePlan(id, input)` called → updates row
4. Hook refreshes → modal closes → card updates

**Total Fee auto-calculation:**
- When `fee_per_session` or `total_sessions` changes, `total_fee` is auto-set to `fee_per_session × total_sessions`
- User can override `total_fee` manually; override is cleared if either input changes again

---

## Permissions

| Action | Permission required |
|---|---|
| View treatment plans | any authenticated clinic member |
| Create / edit plan | `manage_patients` |
| Change plan status (pause/abandon/resume) | `manage_patients` (unchanged) |

---

## Out of Scope

- Printing / exporting treatment plans as PDF
- Patient-facing view of their plan
- Auto-creating a billing record on plan creation (billing is managed separately in the Billing page)
- Progress photos or file attachments
