# Zero-Friction Prescription Builder — Design

**Date:** 2026-04-17
**Author:** Shakil (w/ Claude Code)
**Status:** Approved — ready for implementation plan

---

## Goal

Cut per-visit prescription entry from ~3 minutes of typing to ~15 seconds of tapping. Eliminate Bangla keyboard friction entirely. Turn repeat-visit prescriptions into a one-click clone.

## Problem

Physio OS currently has `treatment_plans` (multi-session clinical plans) and `session_notes` (per-visit progress). Neither is a **prescription** — the printed artifact a BD physio hands the patient every visit listing today's diagnosis, modalities (UST/TENS/IFT), exercises, and Bangla home-care advice.

Today a physio would have to:
- Re-type diagnosis and modalities each visit
- Re-type exercises from memory
- Re-type Bangla advice via Avro/Bijoy on a clinic PC (or skip it)
- Re-enter patient info even though the appointment is already open

That's the friction we're removing.

## Scope (v1)

**In:**
1. New `prescriptions` entity, one per appointment
2. `PrescriptionBuilder` modal launched from Appointments page
3. Auto-fill + lock of patient fields from the appointment
4. Protocol template library (clinic-scoped) with 6 seeded BD presets
5. "Clone Previous Visit" button
6. Chip-based entry for chief complaints, body parts, modalities, exercises
7. VAS pain slider (1–10)
8. Bangla advice library — checkbox selection, no Bangla typing
9. Save & Print (browser print dialog; clean print stylesheet)

**Out (v2+):**
- SVG body map (v1 ships body-part **chips** in an anatomical grid layout)
- WhatsApp send integration
- Rich PDF generation (v1 uses browser print)
- AI-suggested protocol based on chief complaint
- Per-therapist template overrides

## Data Model

### New table: `prescriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `clinic_id` | uuid | multi-tenant, RLS-scoped |
| `appointment_id` | uuid | FK → appointments, unique (one Rx per appointment) |
| `patient_id` | uuid | FK → patients |
| `therapist_id` | uuid | FK → profiles |
| `treatment_plan_id` | uuid nullable | FK → treatment_plans |
| `chief_complaints` | text[] | chips: Pain, Stiffness, Numbness, Radiating pain, Weakness, Tingling, Swelling |
| `body_parts` | text[] | chips: Neck, Shoulder, Upper Back, Lower Back, Hip, Knee, Ankle, Wrist, Elbow |
| `pain_vas` | int2 (1–10) | check constraint |
| `diagnosis` | text | free text, template-fillable |
| `modalities` | text[] | chips: UST, TENS, IFT, SWD, MWD, Cryo, Wax, Hot Pack, Traction, LASER |
| `exercises` | text[] | chips + free entry |
| `advice_en` | text[] | English advice snippets |
| `advice_bn` | text[] | Bangla advice snippets (pre-authored, never typed live) |
| `notes` | text | optional free notes |
| `template_used_id` | uuid nullable | FK → protocol_templates (audit) |
| `cloned_from_id` | uuid nullable | FK → prescriptions (audit) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS:** same pattern as `treatment_plans` — clinic-scoped; therapist + clinic_admin + super_admin read/write.

### New table: `protocol_templates`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `clinic_id` | uuid nullable | null = global seed template; non-null = clinic-custom |
| `name` | text | "Frozen Shoulder Protocol" |
| `diagnosis` | text | default diagnosis string |
| `default_modalities` | text[] | |
| `default_exercises` | text[] | |
| `default_advice_en` | text[] | |
| `default_advice_bn` | text[] | |
| `default_body_parts` | text[] | |
| `is_active` | bool | soft-delete |
| `created_at` | timestamptz | |

**Seed data (global, clinic_id = null):**
1. PLID (Lumbar Disc Prolapse)
2. Frozen Shoulder
3. Cervical Spondylosis
4. Stroke Rehab (Early)
5. Knee Osteoarthritis
6. Sciatica

**RLS:** read = global templates + own clinic's; write = clinic_admin.

### New table: `bangla_advice_library`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `clinic_id` | uuid nullable | null = seed, non-null = clinic custom |
| `category` | text | 'posture', 'diabetes', 'exercise', 'follow_up', 'lifestyle', 'medication' |
| `text_bn` | text | Bangla text |
| `text_en` | text nullable | optional English mirror |
| `is_active` | bool | |
| `sort_order` | int2 | |

**Seed examples:**
- posture: "বসার সময় পিঠ সোজা রাখবেন"
- diabetes: "ডায়াবেটিস নিয়ন্ত্রণে রাখবেন"
- exercise: "প্রতিদিন ১৫ মিনিট হাঁটবেন"
- follow_up: "৭ দিন পর আবার আসবেন"

**RLS:** read = global + own clinic; write = clinic_admin.

## UI Flow

### Entry point
`Appointments` page — each appointment row gets a `[Prescribe]` button (or `[Edit Rx]` if a prescription already exists).

### `PrescriptionBuilder` modal — sections

1. **Patient header (locked)**
   Name • Age • Gender • Phone • Appointment date/time • Session #
   Data auto-pulled from `appointments` join. No edit.

2. **Quick actions bar**
   `[📋 Apply Template ▾]` — dropdown of active templates for this clinic
   `[⟲ Clone Previous Visit]` — fetches patient's last prescription, prefills everything except pain_vas (which they re-assess)

3. **Chief Complaints** — multi-select chips (7 options)

4. **Body Parts** — multi-select chips laid out head-to-toe (9 regions). v1 is grid-of-chips; v2 replaces with SVG body map.

5. **Pain (VAS)** — slider 1–10, visual emoji anchors (😊 → 😫)

6. **Diagnosis** — single text input, auto-filled by template

7. **Modalities** — multi-select chips (10 options)

8. **Exercises** — multi-select chips from a clinic-customizable exercise list + `[+ Add custom]` free-text entry

9. **Advice (Bangla + English)** — tabbed or side-by-side. Category-grouped checkboxes pulled from `bangla_advice_library`. User never types Bangla.

10. **Notes** — optional free textarea

11. **Footer** — `[Cancel]` `[Save Draft]` `[Save & Print]`

### Print view
Separate `/prescriptions/:id/print` route. Clinic logo + header, patient block, all selected items in a readable layout, Bangla advice rendered in a Bangla-safe font (SolaimanLipi / Kalpurush fallback). `@media print` stylesheet hides chrome.

## Clone behavior

"Clone Previous Visit":
1. Query `prescriptions` where `patient_id = current` order by `created_at desc limit 1`
2. Copy: chief_complaints, body_parts, diagnosis, modalities, exercises, advice_en, advice_bn
3. Do NOT copy: pain_vas (must be reassessed), notes
4. Set `cloned_from_id` for audit
5. If no previous Rx → button disabled with tooltip "First visit"

## Template behavior

"Apply Template":
1. User picks from dropdown
2. Fills: diagnosis, default_modalities, default_exercises, default_advice_en, default_advice_bn, default_body_parts
3. Does NOT overwrite already-selected chief_complaints or pain_vas
4. Sets `template_used_id`
5. Therapist can then tweak any field

## Permissions

| Role | Create Rx | Edit own Rx | Edit others' Rx | Manage templates | Manage advice |
|---|---|---|---|---|---|
| therapist | ✅ | ✅ | ❌ | ❌ | ❌ |
| clinic_admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| super_admin | ✅ | ✅ | ✅ | ✅ (global seeds) | ✅ (global seeds) |

## Settings surface

New `Settings → Prescriptions` tab (clinic_admin only):
- **Templates**: list / add / edit / deactivate clinic templates
- **Bangla Advice**: list / add / edit / categorize snippets
- **Exercise library**: add custom exercises to chip picker
- **Modality list**: toggle which modalities show as chips

## Error & edge cases

- Appointment already has a prescription → modal opens in edit mode
- Patient has no prior prescriptions → Clone button disabled
- No active templates for clinic → Apply Template disabled
- Bangla font missing on print → fallback stack: SolaimanLipi, Kalpurush, Noto Sans Bengali, system
- Appointment deleted while Rx exists → Rx kept (audit), orphaned Rx visible in patient history

## Files to be created (for planning)

**Supabase migration:**
- `supabase/migrations/<ts>_prescriptions.sql` — 3 tables + RLS + indexes + seed data

**Types:**
- `src/types/prescription.ts`

**Hooks:**
- `src/hooks/usePrescriptions.ts`
- `src/hooks/useProtocolTemplates.ts`
- `src/hooks/useBanglaAdvice.ts`

**Components:**
- `src/components/shared/PrescriptionBuilderModal.tsx`
- `src/components/prescription/ChipMultiSelect.tsx`
- `src/components/prescription/VASSlider.tsx`
- `src/components/prescription/BodyPartPicker.tsx`
- `src/components/prescription/AdvicePicker.tsx`
- `src/components/prescription/TemplateApplyMenu.tsx`
- `src/components/prescription/ClonePreviousButton.tsx`

**Pages:**
- `src/pages/PrescriptionPrint.tsx` — print-friendly route
- `src/pages/settings/PrescriptionSettings.tsx` — manage templates/advice/exercises

**Wiring:**
- `src/pages/Appointments.tsx` — add `[Prescribe]` button per row
- `src/App.tsx` — register `/prescriptions/:id/print` route
- Navigation: add Settings → Prescriptions tab

## Success criteria

- Repeat visit: physio opens Rx, taps "Clone Previous", re-scores pain, taps Save & Print. ≤ 15 seconds.
- First visit for common condition: physio taps "Apply Template → Frozen Shoulder", adjusts pain, saves. ≤ 30 seconds.
- Zero Bangla characters typed live during a consult.
- Patient block never asks for name/age/phone — always pre-populated.

## Out-of-scope (explicit v2 backlog)

- SVG anatomical body map
- WhatsApp/SMS send button
- PDF (server-rendered) instead of browser print
- AI suggestion of template from chief complaints
- Multi-language (only EN + BN in v1)
- Per-therapist preferred templates
- Exercise video attachments
