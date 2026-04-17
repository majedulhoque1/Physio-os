# Zero-Friction Prescription Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a per-visit prescription builder that cuts entry time from ~3 min of typing to ~15 sec of tapping, eliminates live Bangla typing, and prints a paper-friendly Rx with hand-annotation space.

**Architecture:** New `prescriptions` table (one per appointment) plus two clinic-scoped library tables (`protocol_templates`, `bangla_advice_library`). New `PrescriptionBuilderModal` opens from the Appointments page; chip-based inputs, VAS slider, template-apply and clone-previous actions. Print view at `/prescriptions/:id/print` renders a paper-friendly layout with ruled Doctor's Notes area and a blank body-diagram SVG. Settings gets a new Prescriptions section for clinic admins to manage templates, advice library, and exercise/modality lists.

**Tech Stack:** React + TypeScript + Vite, Tailwind + shadcn, react-hook-form + zod, Supabase (PostgreSQL + RLS), React Router v6. Matches existing conventions in [useTreatmentPlans.ts](src/hooks/useTreatmentPlans.ts), [AddTreatmentPlanModal.tsx](src/components/shared/AddTreatmentPlanModal.tsx), and the `YYYYMMDD_*.sql` migration pattern.

**Testing note:** The repo has no test infrastructure (no vitest/jest, no `tests/` dir, no test script in `package.json`). Adding it is out of scope for this feature. Each task ends with a **manual verification** step (browser walkthrough + SQL check) instead of automated tests. If test infra is added later, backfilling tests is a separate plan.

**Spec:** [2026-04-17-zero-friction-prescription-builder-design.md](docs/superpowers/specs/2026-04-17-zero-friction-prescription-builder-design.md)

---

## File Structure

**Create:**
- `supabase/migrations/20260417_prescriptions.sql` — 3 tables + RLS + seed data
- `src/types/prescription.ts` — row/insert/update types, chip constant lists
- `src/hooks/usePrescriptions.ts` — fetch/create/update/clone Rx for a patient or appointment
- `src/hooks/useProtocolTemplates.ts` — fetch/CRUD templates (global + clinic-scoped)
- `src/hooks/useBanglaAdvice.ts` — fetch/CRUD advice snippets
- `src/components/prescription/ChipMultiSelect.tsx` — reusable chip selector
- `src/components/prescription/VASSlider.tsx` — 1–10 pain slider
- `src/components/prescription/BodyPartPicker.tsx` — anatomical grid of chips
- `src/components/prescription/AdvicePicker.tsx` — category-grouped Bangla/English checkboxes
- `src/components/prescription/TemplateApplyMenu.tsx` — dropdown of templates
- `src/components/prescription/ClonePreviousButton.tsx` — clone-previous action button
- `src/components/shared/PrescriptionBuilderModal.tsx` — the main modal
- `src/pages/PrescriptionPrint.tsx` — paper-friendly print route
- `src/pages/settings/PrescriptionSettings.tsx` — templates + advice manager section

**Modify:**
- `src/types/index.ts` — re-export new prescription types
- `src/lib/permissions.ts` — add `manage_prescriptions` and `manage_prescription_library` permissions
- `src/pages/Appointments.tsx` — add `[Prescribe]` / `[Edit Rx]` button per row
- `src/pages/Settings.tsx` — mount the new `PrescriptionSettings` section
- `src/App.tsx` — register `/prescriptions/:id/print` route
- `src/index.css` — add `@media print` rules + Bangla font stack

---

## Task Index

1. Database migration (tables + RLS + seed data)
2. TypeScript types + chip constants
3. `usePrescriptions` hook
4. `useProtocolTemplates` hook
5. `useBanglaAdvice` hook
6. Permissions wiring
7. `ChipMultiSelect` component
8. `VASSlider` component
9. `BodyPartPicker` component
10. `AdvicePicker` component
11. `TemplateApplyMenu` + `ClonePreviousButton`
12. `PrescriptionBuilderModal` assembly
13. Wire `[Prescribe]` button into Appointments page
14. Print route + paper-friendly layout
15. Print stylesheet + Bangla fonts
16. Settings: templates + advice library management
17. End-to-end manual verification

---

## Task 1: Database Migration — 3 tables + RLS + seed data

**Files:**
- Create: `supabase/migrations/20260417_prescriptions.sql`

- [ ] **Step 1: Create the migration file**

Write this file exactly (see full SQL in appendix A below for the complete content; reproduced inline here for TDD completeness):

```sql
-- See Appendix A for the full migration SQL
```

Full SQL content is listed in **Appendix A** at the bottom of this plan.

- [ ] **Step 2: Apply the migration**

Run via Supabase dashboard SQL editor, or `supabase db push` locally. Expected: no errors.

- [ ] **Step 3: Verify seed data**

In Supabase SQL editor run:
```sql
select count(*) from protocol_templates where clinic_id is null;
select count(*) from bangla_advice_library where clinic_id is null;
```
Expected: `6` and `17`.

- [ ] **Step 4: Regenerate TypeScript types**

Run (check `package.json` scripts for the exact command):
```bash
supabase gen types typescript --project-id <id> > src/types/database.ts
```
Expected: `Database["public"]["Tables"]["prescriptions"]` appears in the output file.

- [ ] **Step 5: Verify RLS**

In SQL editor, connect as a non-admin user session (or use `set local role authenticated` with jwt claims). Try `insert into prescriptions (...) values (...)` with a `clinic_id` the user is NOT a member of. Expected: fails with RLS violation.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260417_prescriptions.sql src/types/database.ts
git commit -m "feat(rx): add prescriptions, protocol_templates, bangla_advice_library schema"
```

---

## Task 2: TypeScript types + chip constants

**Files:**
- Create: `src/types/prescription.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create `src/types/prescription.ts`**

```typescript
import type { Database } from "./database";

export type PrescriptionRow = Database["public"]["Tables"]["prescriptions"]["Row"];
export type PrescriptionInsert = Database["public"]["Tables"]["prescriptions"]["Insert"];
export type PrescriptionUpdate = Database["public"]["Tables"]["prescriptions"]["Update"];

export type ProtocolTemplateRow = Database["public"]["Tables"]["protocol_templates"]["Row"];
export type ProtocolTemplateInsert = Database["public"]["Tables"]["protocol_templates"]["Insert"];
export type ProtocolTemplateUpdate = Database["public"]["Tables"]["protocol_templates"]["Update"];

export type BanglaAdviceRow = Database["public"]["Tables"]["bangla_advice_library"]["Row"];
export type BanglaAdviceInsert = Database["public"]["Tables"]["bangla_advice_library"]["Insert"];
export type BanglaAdviceUpdate = Database["public"]["Tables"]["bangla_advice_library"]["Update"];

export type AdviceCategory =
  | "posture"
  | "diabetes"
  | "exercise"
  | "follow_up"
  | "lifestyle"
  | "medication"
  | "diet"
  | "rest";

export const ADVICE_CATEGORY_LABELS: Record<AdviceCategory, string> = {
  posture: "Posture",
  diabetes: "Diabetes / BP",
  exercise: "Exercise",
  follow_up: "Follow-up",
  lifestyle: "Lifestyle",
  medication: "Medication",
  diet: "Diet",
  rest: "Rest",
};

export const CHIEF_COMPLAINTS = [
  "Pain",
  "Stiffness",
  "Numbness",
  "Radiating pain",
  "Weakness",
  "Tingling",
  "Swelling",
] as const;

export const BODY_PARTS = [
  "Neck",
  "Shoulder",
  "Upper Back",
  "Elbow",
  "Wrist",
  "Lower Back",
  "Hip",
  "Knee",
  "Ankle",
] as const;

export const MODALITIES = [
  "UST",
  "TENS",
  "IFT",
  "SWD",
  "MWD",
  "Cryo",
  "Wax",
  "Hot Pack",
  "Traction",
  "LASER",
] as const;

export const DEFAULT_EXERCISES = [
  "Pendulum exercise",
  "Codman's exercise",
  "Wall climbing",
  "Pelvic tilt",
  "Bridging",
  "Knee to chest",
  "McKenzie extension",
  "Straight leg raise",
  "Quadriceps isometrics",
  "Hamstring stretch",
  "Piriformis stretch",
  "Neck isometrics",
  "Chin tuck",
  "Shoulder shrug",
  "Passive ROM",
] as const;
```

- [ ] **Step 2: Re-export from `src/types/index.ts`**

Add to the bottom of `src/types/index.ts`:

```typescript
export * from "./prescription";
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: no type errors in `src/types/prescription.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/types/prescription.ts src/types/index.ts
git commit -m "feat(rx): add prescription types + chip constants"
```

---

## Task 3: `usePrescriptions` hook

**Files:**
- Create: `src/hooks/usePrescriptions.ts`

Follows the same raw-supabase-client + role-filter pattern as [useTreatmentPlans.ts](src/hooks/useTreatmentPlans.ts).

- [ ] **Step 1: Create the hook file**

```typescript
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { PrescriptionInsert, PrescriptionRow, PrescriptionUpdate } from "@/types";

export interface CreatePrescriptionInput {
  appointment_id: string;
  patient_id: string;
  therapist_id: string;
  treatment_plan_id?: string | null;
  chief_complaints?: string[];
  body_parts?: string[];
  pain_vas?: number | null;
  diagnosis?: string | null;
  modalities?: string[];
  exercises?: string[];
  advice_en?: string[];
  advice_bn?: string[];
  notes?: string | null;
  template_used_id?: string | null;
  cloned_from_id?: string | null;
}

interface MutationResult {
  error: string | null;
  prescriptionId?: string | null;
}

interface UsePrescriptionsState {
  error: string | null;
  isLoading: boolean;
  prescriptions: PrescriptionRow[];
}

const SELECT_FIELDS =
  "id, clinic_id, appointment_id, patient_id, therapist_id, treatment_plan_id, chief_complaints, body_parts, pain_vas, diagnosis, modalities, exercises, advice_en, advice_bn, notes, template_used_id, cloned_from_id, handwriting_svg, handwriting_url, created_at, updated_at";

export function usePrescriptions(
  { patientId, appointmentId }: { patientId?: string; appointmentId?: string } = {},
) {
  const { can, clinicId, linkedTherapistId, role } = useAuth();
  const [state, setState] = useState<UsePrescriptionsState>({
    error: null,
    isLoading: true,
    prescriptions: [],
  });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, prescriptions: [] });
      return;
    }
    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, prescriptions: [] });
      return;
    }

    let query = supabase
      .from("prescriptions")
      .select(SELECT_FIELDS)
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (patientId) query = query.eq("patient_id", patientId);
    if (appointmentId) query = query.eq("appointment_id", appointmentId);

    const { data, error } = await query;
    if (error) {
      setState({ error: error.message, isLoading: false, prescriptions: [] });
      return;
    }

    const typed = (data ?? []) as PrescriptionRow[];
    const filtered =
      role === "therapist" && linkedTherapistId
        ? typed.filter((p) => p.therapist_id === linkedTherapistId)
        : typed;

    setState({ error: null, isLoading: false, prescriptions: filtered });
  }, [appointmentId, clinicId, linkedTherapistId, patientId, role]);

  useEffect(() => {
    let isActive = true;
    (async () => {
      await load();
      if (!isActive) return;
    })();
    return () => {
      isActive = false;
    };
  }, [load]);

  const create = useCallback(
    async (input: CreatePrescriptionInput): Promise<MutationResult> => {
      if (!can("record_session_notes") && !can("manage_patients")) {
        return { error: "You do not have permission to create prescriptions.", prescriptionId: null };
      }
      if (!supabase) return { error: supabaseConfigMessage, prescriptionId: null };
      if (!clinicId) return { error: "No clinic context", prescriptionId: null };

      const payload: PrescriptionInsert = {
        appointment_id: input.appointment_id,
        patient_id: input.patient_id,
        therapist_id: input.therapist_id,
        clinic_id: clinicId,
        treatment_plan_id: input.treatment_plan_id ?? null,
        chief_complaints: input.chief_complaints ?? [],
        body_parts: input.body_parts ?? [],
        pain_vas: input.pain_vas ?? null,
        diagnosis: input.diagnosis ?? null,
        modalities: input.modalities ?? [],
        exercises: input.exercises ?? [],
        advice_en: input.advice_en ?? [],
        advice_bn: input.advice_bn ?? [],
        notes: input.notes ?? null,
        template_used_id: input.template_used_id ?? null,
        cloned_from_id: input.cloned_from_id ?? null,
      };

      const { data, error } = await supabase
        .from("prescriptions")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message, prescriptionId: null };
      await load();
      return { error: null, prescriptionId: (data as any)?.id ?? null };
    },
    [can, clinicId, load],
  );

  const update = useCallback(
    async (id: string, patch: PrescriptionUpdate): Promise<MutationResult> => {
      if (!can("record_session_notes") && !can("manage_patients")) {
        return { error: "You do not have permission to update prescriptions." };
      }
      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      const { error } = await supabase
        .from("prescriptions")
        .update(patch as never)
        .eq("id", id)
        .eq("clinic_id", clinicId);

      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [can, clinicId, load],
  );

  const getLastForPatient = useCallback(
    async (patientIdArg: string): Promise<PrescriptionRow | null> => {
      if (!supabase || !clinicId) return null;
      const { data } = await supabase
        .from("prescriptions")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId)
        .eq("patient_id", patientIdArg)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as PrescriptionRow | null) ?? null;
    },
    [clinicId],
  );

  const getByAppointment = useCallback(
    async (appointmentIdArg: string): Promise<PrescriptionRow | null> => {
      if (!supabase || !clinicId) return null;
      const { data } = await supabase
        .from("prescriptions")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId)
        .eq("appointment_id", appointmentIdArg)
        .maybeSingle();
      return (data as PrescriptionRow | null) ?? null;
    },
    [clinicId],
  );

  return {
    ...state,
    create,
    update,
    getLastForPatient,
    getByAppointment,
    refresh: load,
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Manual verification via quick temporary test page**

Temporarily add a `console.log` inside a component that already uses `useAuth` (e.g. Appointments.tsx):
```typescript
const { prescriptions, isLoading, error } = usePrescriptions();
console.log("[rx-debug]", { prescriptions, isLoading, error });
```
Open `/appointments` in the browser, confirm console shows `{ prescriptions: [], isLoading: false, error: null }` (or empty list). Remove the temporary log before committing.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePrescriptions.ts
git commit -m "feat(rx): add usePrescriptions hook with create/update/clone helpers"
```

---

## Task 4: `useProtocolTemplates` hook

**Files:**
- Create: `src/hooks/useProtocolTemplates.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { ProtocolTemplateInsert, ProtocolTemplateRow, ProtocolTemplateUpdate } from "@/types";

const SELECT_FIELDS =
  "id, clinic_id, name, diagnosis, default_modalities, default_exercises, default_advice_en, default_advice_bn, default_body_parts, is_active, sort_order, created_at, updated_at";

interface State {
  error: string | null;
  isLoading: boolean;
  templates: ProtocolTemplateRow[];
}

export function useProtocolTemplates() {
  const { can, clinicId } = useAuth();
  const [state, setState] = useState<State>({ error: null, isLoading: true, templates: [] });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, templates: [] });
      return;
    }
    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, templates: [] });
      return;
    }

    // Fetch both global seeds (clinic_id null) and clinic-specific templates
    const { data, error } = await supabase
      .from("protocol_templates")
      .select(SELECT_FIELDS)
      .or(`clinic_id.is.null,clinic_id.eq.${clinicId}`)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      setState({ error: error.message, isLoading: false, templates: [] });
      return;
    }
    setState({ error: null, isLoading: false, templates: (data ?? []) as ProtocolTemplateRow[] });
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: Omit<ProtocolTemplateInsert, "clinic_id">) => {
      if (!can("manage_clinic")) return { error: "No permission", id: null };
      if (!supabase || !clinicId) return { error: "No clinic context", id: null };

      const payload: ProtocolTemplateInsert = { ...input, clinic_id: clinicId };
      const { data, error } = await supabase
        .from("protocol_templates")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message, id: null };
      await load();
      return { error: null, id: (data as any)?.id ?? null };
    },
    [can, clinicId, load],
  );

  const update = useCallback(
    async (id: string, patch: ProtocolTemplateUpdate) => {
      if (!can("manage_clinic")) return { error: "No permission" };
      if (!supabase || !clinicId) return { error: "No clinic context" };
      const { error } = await supabase
        .from("protocol_templates")
        .update(patch as never)
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [can, clinicId, load],
  );

  const deactivate = useCallback(
    async (id: string) => update(id, { is_active: false }),
    [update],
  );

  return { ...state, create, update, deactivate, refresh: load };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useProtocolTemplates.ts
git commit -m "feat(rx): add useProtocolTemplates hook"
```

---

## Task 5: `useBanglaAdvice` hook

**Files:**
- Create: `src/hooks/useBanglaAdvice.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type {
  AdviceCategory,
  BanglaAdviceInsert,
  BanglaAdviceRow,
  BanglaAdviceUpdate,
} from "@/types";

const SELECT_FIELDS =
  "id, clinic_id, category, text_bn, text_en, is_active, sort_order, created_at";

interface State {
  error: string | null;
  isLoading: boolean;
  advice: BanglaAdviceRow[];
}

export function useBanglaAdvice() {
  const { can, clinicId } = useAuth();
  const [state, setState] = useState<State>({ error: null, isLoading: true, advice: [] });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, advice: [] });
      return;
    }
    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, advice: [] });
      return;
    }
    const { data, error } = await supabase
      .from("bangla_advice_library")
      .select(SELECT_FIELDS)
      .or(`clinic_id.is.null,clinic_id.eq.${clinicId}`)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) {
      setState({ error: error.message, isLoading: false, advice: [] });
      return;
    }
    setState({ error: null, isLoading: false, advice: (data ?? []) as BanglaAdviceRow[] });
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const byCategory = state.advice.reduce<Record<AdviceCategory, BanglaAdviceRow[]>>(
    (acc, row) => {
      const cat = row.category as AdviceCategory;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(row);
      return acc;
    },
    {} as Record<AdviceCategory, BanglaAdviceRow[]>,
  );

  const create = useCallback(
    async (input: Omit<BanglaAdviceInsert, "clinic_id">) => {
      if (!can("manage_clinic")) return { error: "No permission", id: null };
      if (!supabase || !clinicId) return { error: "No clinic context", id: null };
      const payload: BanglaAdviceInsert = { ...input, clinic_id: clinicId };
      const { data, error } = await supabase
        .from("bangla_advice_library")
        .insert(payload as never)
        .select("id")
        .maybeSingle();
      if (error) return { error: error.message, id: null };
      await load();
      return { error: null, id: (data as any)?.id ?? null };
    },
    [can, clinicId, load],
  );

  const update = useCallback(
    async (id: string, patch: BanglaAdviceUpdate) => {
      if (!can("manage_clinic")) return { error: "No permission" };
      if (!supabase || !clinicId) return { error: "No clinic context" };
      const { error } = await supabase
        .from("bangla_advice_library")
        .update(patch as never)
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [can, clinicId, load],
  );

  const deactivate = useCallback(
    async (id: string) => update(id, { is_active: false }),
    [update],
  );

  return { ...state, byCategory, create, update, deactivate, refresh: load };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/hooks/useBanglaAdvice.ts
git commit -m "feat(rx): add useBanglaAdvice hook grouped by category"
```

---

## Task 6: Permissions wiring

**Files:**
- Modify: `src/lib/permissions.ts`

- [ ] **Step 1: Extend `AppPermission` union and role grants**

In `src/lib/permissions.ts` change the `AppPermission` type to add two new permissions:

```typescript
export type AppPermission =
  | "manage_appointments"
  | "manage_billing"
  | "manage_clinic"
  | "manage_patients"
  | "manage_prescription_library"
  | "manage_prescriptions"
  | "manage_therapists"
  | "record_session_notes"
  | "view_analytics"
  | "view_billing";
```

Update `permissionsByRole`:

```typescript
const permissionsByRole: Record<ClinicStaffRole, AppPermission[]> = {
  clinic_admin: [
    "manage_appointments",
    "manage_billing",
    "manage_clinic",
    "manage_patients",
    "manage_prescription_library",
    "manage_prescriptions",
    "manage_therapists",
    "record_session_notes",
    "view_analytics",
    "view_billing",
  ],
  receptionist: [
    "manage_appointments",
    "manage_billing",
    "manage_patients",
    "view_analytics",
    "view_billing",
  ],
  therapist: [
    "manage_prescriptions",
    "record_session_notes",
  ],
};
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/permissions.ts
git commit -m "feat(rx): grant manage_prescriptions + manage_prescription_library perms"
```

---

## Task 7: `ChipMultiSelect` component

**Files:**
- Create: `src/components/prescription/ChipMultiSelect.tsx`

- [ ] **Step 1: Create component**

```tsx
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface ChipMultiSelectProps {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  placeholder?: string;
}

export function ChipMultiSelect({
  label,
  options,
  value,
  onChange,
  allowCustom = false,
  placeholder = "Add custom…",
}: ChipMultiSelectProps) {
  const [customInput, setCustomInput] = useState("");

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const remove = (opt: string) => onChange(value.filter((v) => v !== opt));

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setCustomInput("");
  };

  const knownOptions = new Set(options);
  const customValues = value.filter((v) => !knownOptions.has(v));

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {opt}
            </button>
          );
        })}
        {customValues.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-600 bg-emerald-600 px-3 py-1 text-sm text-white"
          >
            {v}
            <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`}>
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      {allowCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={placeholder}
            className="flex-1 rounded border border-gray-300 px-3 py-1 text-sm"
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prescription/ChipMultiSelect.tsx
git commit -m "feat(rx): add ChipMultiSelect component"
```

---

## Task 8: `VASSlider` component

**Files:**
- Create: `src/components/prescription/VASSlider.tsx`

- [ ] **Step 1: Create component**

```tsx
interface VASSliderProps {
  value: number | null;
  onChange: (next: number) => void;
}

const EMOJI_BY_VAL = ["😊", "🙂", "😐", "😕", "😟", "😣", "😖", "😫", "😩", "😭"];

export function VASSlider({ value, onChange }: VASSliderProps) {
  const current = value ?? 0;
  const emoji = current > 0 ? EMOJI_BY_VAL[current - 1] : "—";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Pain (VAS 1–10)</div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <span className="min-w-[2ch] text-lg font-semibold tabular-nums">
            {value ?? "—"}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={current || 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>No pain</span>
        <span>Worst pain</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prescription/VASSlider.tsx
git commit -m "feat(rx): add VASSlider component"
```

---

## Task 9: `BodyPartPicker` component

**Files:**
- Create: `src/components/prescription/BodyPartPicker.tsx`

v1 is a simple anatomical grid of chips organized head-to-toe (v2 will replace with an SVG body map).

- [ ] **Step 1: Create component**

```tsx
import { BODY_PARTS } from "@/types";

interface BodyPartPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

// Head-to-toe grouped layout
const GROUPS: { label: string; parts: readonly string[] }[] = [
  { label: "Head & Neck", parts: ["Neck"] },
  { label: "Upper Body", parts: ["Shoulder", "Upper Back", "Elbow", "Wrist"] },
  { label: "Lower Body", parts: ["Lower Back", "Hip", "Knee", "Ankle"] },
];

export function BodyPartPicker({ value, onChange }: BodyPartPickerProps) {
  const toggle = (p: string) =>
    onChange(value.includes(p) ? value.filter((v) => v !== p) : [...value, p]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">Body parts</div>
      {GROUPS.map((g) => (
        <div key={g.label} className="space-y-1">
          <div className="text-xs text-gray-500">{g.label}</div>
          <div className="flex flex-wrap gap-2">
            {g.parts.map((p) => {
              const active = value.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggle(p)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    active
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Note: `BODY_PARTS` is imported for future reference but grouped layout uses explicit ordering.

- [ ] **Step 2: Commit**

```bash
git add src/components/prescription/BodyPartPicker.tsx
git commit -m "feat(rx): add BodyPartPicker grouped chip layout"
```

---

## Task 10: `AdvicePicker` component

**Files:**
- Create: `src/components/prescription/AdvicePicker.tsx`

- [ ] **Step 1: Create component**

```tsx
import { ADVICE_CATEGORY_LABELS, type AdviceCategory, type BanglaAdviceRow } from "@/types";

interface AdvicePickerProps {
  byCategory: Record<AdviceCategory, BanglaAdviceRow[]>;
  selectedBn: string[];
  selectedEn: string[];
  onChange: (selection: { bn: string[]; en: string[] }) => void;
}

export function AdvicePicker({ byCategory, selectedBn, selectedEn, onChange }: AdvicePickerProps) {
  const toggle = (row: BanglaAdviceRow) => {
    const bnActive = selectedBn.includes(row.text_bn);
    const newBn = bnActive
      ? selectedBn.filter((t) => t !== row.text_bn)
      : [...selectedBn, row.text_bn];
    const newEn = row.text_en
      ? bnActive
        ? selectedEn.filter((t) => t !== row.text_en)
        : [...selectedEn, row.text_en]
      : selectedEn;
    onChange({ bn: newBn, en: newEn });
  };

  const categories = Object.keys(ADVICE_CATEGORY_LABELS) as AdviceCategory[];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">
        Advice — Bangla (checkbox to add; no typing)
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {categories.map((cat) => {
          const rows = byCategory[cat] ?? [];
          if (rows.length === 0) return null;
          return (
            <div key={cat} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {ADVICE_CATEGORY_LABELS[cat]}
              </div>
              <div className="space-y-1">
                {rows.map((r) => {
                  const active = selectedBn.includes(r.text_bn);
                  return (
                    <label key={r.id} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={active}
                        onChange={() => toggle(r)}
                      />
                      <span>
                        <span className="font-bengali">{r.text_bn}</span>
                        {r.text_en && (
                          <span className="block text-xs text-gray-500">{r.text_en}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prescription/AdvicePicker.tsx
git commit -m "feat(rx): add AdvicePicker grouped-by-category checkboxes"
```

---

## Task 11: `TemplateApplyMenu` + `ClonePreviousButton`

**Files:**
- Create: `src/components/prescription/TemplateApplyMenu.tsx`
- Create: `src/components/prescription/ClonePreviousButton.tsx`

- [ ] **Step 1: Create `TemplateApplyMenu.tsx`**

```tsx
import { ClipboardList, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ProtocolTemplateRow } from "@/types";

interface Props {
  templates: ProtocolTemplateRow[];
  onApply: (tpl: ProtocolTemplateRow) => void;
  disabled?: boolean;
}

export function TemplateApplyMenu({ templates, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || templates.length === 0}
        className="inline-flex items-center gap-2 rounded border border-blue-600 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ClipboardList size={16} />
        Apply Template
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-80 overflow-auto py-1">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    onApply(t);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-900">{t.name}</div>
                  {t.diagnosis && (
                    <div className="text-xs text-gray-500">{t.diagnosis}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `ClonePreviousButton.tsx`**

```tsx
import { Copy } from "lucide-react";

interface Props {
  onClone: () => void;
  hasPrevious: boolean;
  disabled?: boolean;
}

export function ClonePreviousButton({ onClone, hasPrevious, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClone}
      disabled={disabled || !hasPrevious}
      title={hasPrevious ? "Copy last visit prescription" : "No previous prescription (first visit)"}
      className="inline-flex items-center gap-2 rounded border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Copy size={16} />
      Clone Previous Visit
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/prescription/TemplateApplyMenu.tsx src/components/prescription/ClonePreviousButton.tsx
git commit -m "feat(rx): add TemplateApplyMenu + ClonePreviousButton"
```

---

## Task 12: `PrescriptionBuilderModal` assembly

**Files:**
- Create: `src/components/shared/PrescriptionBuilderModal.tsx`

This is the heart of the feature. Assembles all building blocks, wires hooks, handles save + apply-template + clone-previous.

- [ ] **Step 1: Create the modal**

```tsx
import { Printer, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChipMultiSelect } from "@/components/prescription/ChipMultiSelect";
import { VASSlider } from "@/components/prescription/VASSlider";
import { BodyPartPicker } from "@/components/prescription/BodyPartPicker";
import { AdvicePicker } from "@/components/prescription/AdvicePicker";
import { TemplateApplyMenu } from "@/components/prescription/TemplateApplyMenu";
import { ClonePreviousButton } from "@/components/prescription/ClonePreviousButton";
import { useBanglaAdvice } from "@/hooks/useBanglaAdvice";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useProtocolTemplates } from "@/hooks/useProtocolTemplates";
import {
  CHIEF_COMPLAINTS,
  DEFAULT_EXERCISES,
  MODALITIES,
  type PrescriptionRow,
  type ProtocolTemplateRow,
} from "@/types";

export interface PrescriptionBuilderPatientContext {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  patientPhone: string | null;
  therapistId: string;
  therapistName: string;
  sessionNumber: number | null;
  appointmentAt: string;
  treatmentPlanId?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: PrescriptionBuilderPatientContext;
  /** When provided, modal opens in edit mode. */
  existing?: PrescriptionRow | null;
  onSaved?: (id: string, shouldPrint: boolean) => void;
}

export function PrescriptionBuilderModal({ open, onClose, context, existing, onSaved }: Props) {
  const { templates } = useProtocolTemplates();
  const { byCategory } = useBanglaAdvice();
  const { create, update, getLastForPatient } = usePrescriptions();

  const [chiefComplaints, setChiefComplaints] = useState<string[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [painVas, setPainVas] = useState<number | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [modalities, setModalities] = useState<string[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [adviceBn, setAdviceBn] = useState<string[]>([]);
  const [adviceEn, setAdviceEn] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [templateUsedId, setTemplateUsedId] = useState<string | null>(null);
  const [clonedFromId, setClonedFromId] = useState<string | null>(null);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hydrate from existing Rx (edit mode) or check for previous visit (create mode)
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setChiefComplaints(existing.chief_complaints ?? []);
      setBodyParts(existing.body_parts ?? []);
      setPainVas(existing.pain_vas ?? null);
      setDiagnosis(existing.diagnosis ?? "");
      setModalities(existing.modalities ?? []);
      setExercises(existing.exercises ?? []);
      setAdviceBn(existing.advice_bn ?? []);
      setAdviceEn(existing.advice_en ?? []);
      setNotes(existing.notes ?? "");
      setTemplateUsedId(existing.template_used_id ?? null);
      setClonedFromId(existing.cloned_from_id ?? null);
      return;
    }
    // Create mode: reset + check for previous Rx
    setChiefComplaints([]);
    setBodyParts([]);
    setPainVas(null);
    setDiagnosis("");
    setModalities([]);
    setExercises([]);
    setAdviceBn([]);
    setAdviceEn([]);
    setNotes("");
    setTemplateUsedId(null);
    setClonedFromId(null);

    (async () => {
      const prev = await getLastForPatient(context.patientId);
      setHasPrevious(Boolean(prev));
    })();
  }, [context.patientId, existing, getLastForPatient, open]);

  const applyTemplate = (tpl: ProtocolTemplateRow) => {
    // Per spec: template DOES fill diagnosis/modalities/exercises/advice/body_parts
    // Does NOT overwrite chief_complaints or pain_vas
    if (!diagnosis) setDiagnosis(tpl.diagnosis ?? "");
    setModalities(mergeUnique(modalities, tpl.default_modalities));
    setExercises(mergeUnique(exercises, tpl.default_exercises));
    setAdviceEn(mergeUnique(adviceEn, tpl.default_advice_en));
    setAdviceBn(mergeUnique(adviceBn, tpl.default_advice_bn));
    setBodyParts(mergeUnique(bodyParts, tpl.default_body_parts));
    setTemplateUsedId(tpl.id);
  };

  const clonePrevious = async () => {
    const prev = await getLastForPatient(context.patientId);
    if (!prev) return;
    // Per spec: copy everything EXCEPT pain_vas and notes
    setChiefComplaints(prev.chief_complaints ?? []);
    setBodyParts(prev.body_parts ?? []);
    setDiagnosis(prev.diagnosis ?? "");
    setModalities(prev.modalities ?? []);
    setExercises(prev.exercises ?? []);
    setAdviceBn(prev.advice_bn ?? []);
    setAdviceEn(prev.advice_en ?? []);
    setClonedFromId(prev.id);
    setPainVas(null);
    setNotes("");
  };

  const handleSave = async (andPrint: boolean) => {
    setSaving(true);
    setSaveError(null);

    const payload = {
      chief_complaints: chiefComplaints,
      body_parts: bodyParts,
      pain_vas: painVas,
      diagnosis: diagnosis || null,
      modalities,
      exercises,
      advice_bn: adviceBn,
      advice_en: adviceEn,
      notes: notes || null,
      template_used_id: templateUsedId,
      cloned_from_id: clonedFromId,
    };

    let result: { error: string | null; prescriptionId?: string | null };
    if (existing) {
      const r = await update(existing.id, payload);
      result = { error: r.error, prescriptionId: existing.id };
    } else {
      result = await create({
        appointment_id: context.appointmentId,
        patient_id: context.patientId,
        therapist_id: context.therapistId,
        treatment_plan_id: context.treatmentPlanId ?? null,
        ...payload,
      });
    }

    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    onSaved?.(result.prescriptionId!, andPrint);
    if (andPrint && result.prescriptionId) {
      window.open(`/prescriptions/${result.prescriptionId}/print`, "_blank");
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-4xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="text-lg font-semibold">
              {existing ? "Edit Prescription" : "New Prescription"}
            </h2>
            <div className="mt-1 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{context.patientName}</span>
              {context.patientAge && <span> • {context.patientAge}y</span>}
              {context.patientGender && <span> • {context.patientGender}</span>}
              {context.patientPhone && <span> • {context.patientPhone}</span>}
              {context.sessionNumber && <span> • Session #{context.sessionNumber}</span>}
            </div>
            <div className="text-xs text-gray-500">
              Therapist: {context.therapistName} • {new Date(context.appointmentAt).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50 p-3">
          <TemplateApplyMenu templates={templates} onApply={applyTemplate} />
          <ClonePreviousButton onClone={clonePrevious} hasPrevious={hasPrevious} />
        </div>

        {/* Body */}
        <div className="space-y-5 p-4">
          <ChipMultiSelect
            label="Chief complaints"
            options={CHIEF_COMPLAINTS}
            value={chiefComplaints}
            onChange={setChiefComplaints}
          />
          <BodyPartPicker value={bodyParts} onChange={setBodyParts} />
          <VASSlider value={painVas} onChange={setPainVas} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Diagnosis</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Adhesive Capsulitis"
            />
          </div>

          <ChipMultiSelect
            label="Modalities"
            options={MODALITIES}
            value={modalities}
            onChange={setModalities}
          />
          <ChipMultiSelect
            label="Exercises"
            options={DEFAULT_EXERCISES}
            value={exercises}
            onChange={setExercises}
            allowCustom
            placeholder="Add custom exercise…"
          />
          <AdvicePicker
            byCategory={byCategory}
            selectedBn={adviceBn}
            selectedEn={adviceEn}
            onChange={({ bn, en }) => {
              setAdviceBn(bn);
              setAdviceEn(en);
            }}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Additional notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Optional free-text notes"
            />
          </div>

          {saveError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Printer size={16} />
            Save &amp; Print
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeUnique(existing: string[], incoming: string[] | null | undefined): string[] {
  const out = [...existing];
  for (const item of incoming ?? []) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/PrescriptionBuilderModal.tsx
git commit -m "feat(rx): assemble PrescriptionBuilderModal with template + clone flows"
```

---

## Task 13: Wire `[Prescribe]` button into Appointments page

**Files:**
- Modify: `src/pages/Appointments.tsx`

- [ ] **Step 1: Read the file first**

Run Read on `src/pages/Appointments.tsx` to see where `AppointmentRow` renders action buttons (around line 110-130 per scouting). Identify the exact row component and what patient/therapist data is already in scope.

- [ ] **Step 2: Add state and modal to Appointments page**

At the top of the page component, alongside existing modal state:

```typescript
import { PrescriptionBuilderModal, type PrescriptionBuilderPatientContext } from "@/components/shared/PrescriptionBuilderModal";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import type { PrescriptionRow } from "@/types";

// …inside the component:
const [rxContext, setRxContext] = useState<PrescriptionBuilderPatientContext | null>(null);
const [rxExisting, setRxExisting] = useState<PrescriptionRow | null>(null);
const { getByAppointment } = usePrescriptions();
const [existingRxMap, setExistingRxMap] = useState<Record<string, string>>({}); // appointmentId -> rxId

const openPrescription = async (appt: AppointmentWithRelations) => {
  const existing = await getByAppointment(appt.id);
  setRxExisting(existing);
  setRxContext({
    appointmentId: appt.id,
    patientId: appt.patient_id,
    patientName: appt.patient_name ?? "Unknown",
    patientAge: appt.patient_age ?? null,
    patientGender: appt.patient_gender ?? null,
    patientPhone: appt.patient_phone ?? null,
    therapistId: appt.therapist_id,
    therapistName: appt.therapist_name ?? "Therapist",
    sessionNumber: appt.session_number ?? null,
    appointmentAt: appt.scheduled_at,
    treatmentPlanId: appt.treatment_plan_id ?? null,
  });
};
```

*Note:* the exact field names (`patient_name`, `patient_age`, etc.) depend on what `AppointmentWithRelations` exposes. If those aren't on the joined shape, adjust the hook in `useAppointments` or pull from a separate `patients` fetch. Verify in Step 1.

- [ ] **Step 3: Add the button to `AppointmentRow`**

Next to the existing status select, add:

```tsx
<button
  type="button"
  onClick={() => openPrescription(appt)}
  className="rounded border border-blue-600 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
>
  {existingRxMap[appt.id] ? "Edit Rx" : "Prescribe"}
</button>
```

- [ ] **Step 4: Render the modal at the end of the page component**

```tsx
{rxContext && (
  <PrescriptionBuilderModal
    open={Boolean(rxContext)}
    onClose={() => {
      setRxContext(null);
      setRxExisting(null);
    }}
    context={rxContext}
    existing={rxExisting}
    onSaved={(id) => {
      setExistingRxMap((m) => ({ ...m, [rxContext.appointmentId]: id }));
    }}
  />
)}
```

- [ ] **Step 5: Populate `existingRxMap` on mount**

After appointments load, run a single batch query:

```typescript
useEffect(() => {
  if (!appointments.length) return;
  (async () => {
    if (!supabase || !clinicId) return;
    const ids = appointments.map((a) => a.id);
    const { data } = await supabase
      .from("prescriptions")
      .select("id, appointment_id")
      .eq("clinic_id", clinicId)
      .in("appointment_id", ids);
    const map: Record<string, string> = {};
    (data ?? []).forEach((row: any) => {
      map[row.appointment_id] = row.id;
    });
    setExistingRxMap(map);
  })();
}, [appointments, clinicId]);
```

- [ ] **Step 6: Manual verification**

1. `npm run dev`
2. Go to `/appointments`
3. Confirm every row shows a `[Prescribe]` button
4. Click it → modal opens with patient name/age pre-filled in header
5. Click `[Apply Template ▾]` → pick "Frozen Shoulder" → diagnosis, modalities, exercises fill in
6. Adjust pain slider, click Save → modal closes, button changes to `[Edit Rx]`
7. Click `[Edit Rx]` → modal re-opens with all saved values
8. On a different appointment for the same patient, click `[Prescribe]` → click "Clone Previous Visit" → fields populate except pain

- [ ] **Step 7: Commit**

```bash
git add src/pages/Appointments.tsx
git commit -m "feat(rx): add Prescribe/Edit Rx button to Appointments rows"
```

---

## Task 14: Print route + paper-friendly layout

**Files:**
- Create: `src/pages/PrescriptionPrint.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create print page**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { PrescriptionRow } from "@/types";

interface FullRx extends PrescriptionRow {
  patient_name?: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  patient_phone?: string | null;
  therapist_name?: string;
  clinic_name?: string;
  clinic_address?: string;
}

export function PrescriptionPrint() {
  const { id } = useParams<{ id: string }>();
  const [rx, setRx] = useState<FullRx | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      if (!supabase) {
        setError(supabaseConfigMessage);
        return;
      }
      const { data, error: err } = await supabase
        .from("prescriptions")
        .select(
          `*, 
           patient:patients(name, age, gender, phone),
           therapist:profiles(full_name),
           clinic:clinics(name, address)`,
        )
        .eq("id", id)
        .maybeSingle();
      if (err) {
        setError(err.message);
        return;
      }
      if (!data) {
        setError("Prescription not found");
        return;
      }
      const row = data as any;
      setRx({
        ...row,
        patient_name: row.patient?.name,
        patient_age: row.patient?.age,
        patient_gender: row.patient?.gender,
        patient_phone: row.patient?.phone,
        therapist_name: row.therapist?.full_name,
        clinic_name: row.clinic?.name,
        clinic_address: row.clinic?.address,
      });
    })();
  }, [id]);

  useEffect(() => {
    if (rx) {
      // Auto-trigger print after render; user can cancel
      setTimeout(() => window.print(), 300);
    }
  }, [rx]);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!rx) return <div className="p-8">Loading prescription…</div>;

  return (
    <div className="rx-print mx-auto max-w-[210mm] bg-white p-8 text-black">
      {/* Clinic header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <div className="text-xl font-bold">{rx.clinic_name ?? "Clinic"}</div>
          {rx.clinic_address && <div className="text-xs">{rx.clinic_address}</div>}
        </div>
        <div className="text-right text-xs">
          <div>Date: {new Date(rx.created_at).toLocaleDateString()}</div>
          <div>Therapist: {rx.therapist_name ?? "—"}</div>
        </div>
      </div>

      {/* Patient block */}
      <div className="mt-3 grid grid-cols-4 gap-2 border-b border-gray-400 pb-2 text-sm">
        <div><strong>Name:</strong> {rx.patient_name ?? "—"}</div>
        <div><strong>Age:</strong> {rx.patient_age ?? "—"}</div>
        <div><strong>Sex:</strong> {rx.patient_gender ?? "—"}</div>
        <div><strong>Phone:</strong> {rx.patient_phone ?? "—"}</div>
      </div>

      {/* Chief complaints / body parts / pain */}
      {(rx.chief_complaints.length > 0 || rx.body_parts.length > 0 || rx.pain_vas) && (
        <Section title="Complaints">
          {rx.chief_complaints.length > 0 && (
            <div><strong>Chief:</strong> {rx.chief_complaints.join(", ")}</div>
          )}
          {rx.body_parts.length > 0 && (
            <div><strong>Site:</strong> {rx.body_parts.join(", ")}</div>
          )}
          {rx.pain_vas && <div><strong>Pain (VAS):</strong> {rx.pain_vas}/10</div>}
        </Section>
      )}

      {rx.diagnosis && (
        <Section title="Diagnosis">
          <div>{rx.diagnosis}</div>
        </Section>
      )}

      {rx.modalities.length > 0 && (
        <Section title="Modalities">
          <ul className="list-disc pl-6">
            {rx.modalities.map((m) => <li key={m}>{m}</li>)}
          </ul>
          <BlankLines count={1} />
        </Section>
      )}

      {rx.exercises.length > 0 && (
        <Section title="Exercises">
          <ul className="list-disc pl-6">
            {rx.exercises.map((e) => <li key={e}>{e}</li>)}
          </ul>
          <BlankLines count={2} />
        </Section>
      )}

      {(rx.advice_bn.length > 0 || rx.advice_en.length > 0) && (
        <Section title="Advice / পরামর্শ">
          <ul className="list-disc pl-6">
            {rx.advice_bn.map((a, i) => (
              <li key={`bn-${i}`} className="font-bengali">{a}</li>
            ))}
            {rx.advice_en.map((a, i) => <li key={`en-${i}`}>{a}</li>)}
          </ul>
          <BlankLines count={2} />
        </Section>
      )}

      {/* Body diagram placeholder for hand annotation */}
      <Section title="Body Diagram (for notes)">
        <BodyDiagramOutline />
      </Section>

      {/* Doctor's notes */}
      <Section title="Doctor's Notes">
        <BlankLines count={6} />
      </Section>

      {/* Footer */}
      <div className="mt-8 flex items-end justify-between text-sm">
        <div>
          <div>Follow-up: ______________________</div>
        </div>
        <div className="text-right">
          <div className="border-t border-black pt-1">Signature & Stamp</div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <div className="text-sm font-semibold uppercase tracking-wide">{title}</div>
      <div className="mt-1 text-sm">{children}</div>
    </section>
  );
}

function BlankLines({ count }: { count: number }) {
  return (
    <div className="mt-1 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-gray-400" style={{ height: "1.25em" }} />
      ))}
    </div>
  );
}

function BodyDiagramOutline() {
  return (
    <svg viewBox="0 0 240 300" className="mx-auto h-40 w-full max-w-xs" fill="none" stroke="black" strokeWidth="1.2">
      {/* Anterior silhouette */}
      <g>
        <circle cx="60" cy="30" r="15" />
        <line x1="60" y1="45" x2="60" y2="100" />
        <line x1="30" y1="65" x2="90" y2="65" />
        <rect x="45" y="100" width="30" height="70" />
        <line x1="52" y1="170" x2="48" y2="260" />
        <line x1="68" y1="170" x2="72" y2="260" />
      </g>
      {/* Posterior silhouette */}
      <g transform="translate(120,0)">
        <circle cx="60" cy="30" r="15" />
        <line x1="60" y1="45" x2="60" y2="100" />
        <line x1="30" y1="65" x2="90" y2="65" />
        <rect x="45" y="100" width="30" height="70" />
        <line x1="52" y1="170" x2="48" y2="260" />
        <line x1="68" y1="170" x2="72" y2="260" />
      </g>
      <text x="60" y="285" fontSize="10" textAnchor="middle" stroke="none" fill="black">Front</text>
      <text x="180" y="285" fontSize="10" textAnchor="middle" stroke="none" fill="black">Back</text>
    </svg>
  );
}
```

- [ ] **Step 2: Register the route in `src/App.tsx`**

Find the main `<Routes>` block. Add (outside the auth/layout wrapper if the print view should be full-page):

```tsx
import { PrescriptionPrint } from "@/pages/PrescriptionPrint";

// …inside <Routes>
<Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} />
```

Note: the print route should still be auth-gated (the component's supabase query will fail for unauthenticated users anyway, but ideally wrap it in the same auth context as the rest of the app). Keep it inside the existing `<AuthGate>` wrapper if one exists — just bypass the app chrome/layout so only the prescription renders.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PrescriptionPrint.tsx src/App.tsx
git commit -m "feat(rx): add /prescriptions/:id/print paper-friendly route"
```

---

## Task 15: Print stylesheet + Bangla fonts

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add print styles + Bangla font stack**

Append to `src/index.css`:

```css
/* ---------- Bangla font stack ---------- */
.font-bengali,
.rx-print .font-bengali {
  font-family: "SolaimanLipi", "Kalpurush", "Noto Sans Bengali", "Siyam Rupali", system-ui, sans-serif;
}

/* ---------- Prescription print ---------- */
@media print {
  @page {
    size: A4;
    margin: 12mm;
  }

  /* Hide app chrome */
  body > *:not(.rx-print-wrapper),
  header,
  nav,
  aside,
  .no-print {
    display: none !important;
  }

  .rx-print {
    max-width: none !important;
    padding: 0 !important;
    font-size: 12pt;
    color: #000 !important;
    background: #fff !important;
  }

  .rx-print section {
    page-break-inside: avoid;
  }

  /* Keep signature + notes on same page */
  .rx-print .doctor-notes,
  .rx-print .signature-block {
    page-break-inside: avoid;
  }
}
```

- [ ] **Step 2: Wrap the print page**

In `src/pages/PrescriptionPrint.tsx`, wrap the outer `<div className="rx-print …">` in a `<div className="rx-print-wrapper">` so the CSS selector matches:

```tsx
return (
  <div className="rx-print-wrapper">
    <div className="rx-print mx-auto max-w-[210mm] bg-white p-8 text-black">
      …existing content…
    </div>
  </div>
);
```

- [ ] **Step 3: Manual verification**

1. `npm run dev`
2. Open an existing prescription at `/prescriptions/<id>/print`
3. Browser auto-opens print dialog (from the `useEffect` in Task 14)
4. Confirm the print preview:
   - No sidebar, navbar, or app chrome
   - Clinic name, patient block, all sections render cleanly
   - Bangla advice lines render in Bangla characters (not boxes/tofu)
   - Doctor's Notes has 6 visible ruled blank lines
   - Body diagram silhouette appears
   - Signature/Follow-up line at the bottom
4. If Bangla shows as boxes, install/confirm SolaimanLipi is available; fallback to Noto Sans Bengali should work on most systems.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/pages/PrescriptionPrint.tsx
git commit -m "feat(rx): add print stylesheet + Bangla font stack"
```

---

## Task 16: Settings — templates + advice library management

**Files:**
- Create: `src/pages/settings/PrescriptionSettings.tsx`
- Modify: `src/pages/Settings.tsx`

Clinic admins manage clinic-specific templates and advice snippets. Global seeds (clinic_id null) show as read-only.

- [ ] **Step 1: Create `PrescriptionSettings.tsx`**

```tsx
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBanglaAdvice } from "@/hooks/useBanglaAdvice";
import { useProtocolTemplates } from "@/hooks/useProtocolTemplates";
import { ADVICE_CATEGORY_LABELS, type AdviceCategory } from "@/types";

export function PrescriptionSettings() {
  const { can } = useAuth();
  const canManage = can("manage_prescription_library");
  const { templates, create: createTpl, deactivate: deactivateTpl } = useProtocolTemplates();
  const { advice, create: createAdvice, deactivate: deactivateAdvice } = useBanglaAdvice();
  const [newTplName, setNewTplName] = useState("");
  const [newTplDiagnosis, setNewTplDiagnosis] = useState("");
  const [newAdviceBn, setNewAdviceBn] = useState("");
  const [newAdviceEn, setNewAdviceEn] = useState("");
  const [newAdviceCategory, setNewAdviceCategory] = useState<AdviceCategory>("posture");

  if (!canManage) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-base font-semibold">Prescription Library</h3>
        <p className="mt-1 text-sm text-gray-600">
          Only clinic admins can manage prescription templates and advice.
        </p>
      </section>
    );
  }

  const handleAddTpl = async () => {
    if (!newTplName.trim()) return;
    await createTpl({
      name: newTplName.trim(),
      diagnosis: newTplDiagnosis.trim() || null,
      default_modalities: [],
      default_exercises: [],
      default_advice_en: [],
      default_advice_bn: [],
      default_body_parts: [],
      is_active: true,
      sort_order: 100,
    });
    setNewTplName("");
    setNewTplDiagnosis("");
  };

  const handleAddAdvice = async () => {
    if (!newAdviceBn.trim()) return;
    await createAdvice({
      category: newAdviceCategory,
      text_bn: newAdviceBn.trim(),
      text_en: newAdviceEn.trim() || null,
      is_active: true,
      sort_order: 100,
    });
    setNewAdviceBn("");
    setNewAdviceEn("");
  };

  return (
    <div className="space-y-4">
      {/* Templates */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-base font-semibold">Protocol Templates</h3>
        <p className="mt-1 text-sm text-gray-600">
          Global templates are read-only. Custom templates are clinic-specific.
        </p>
        <ul className="mt-3 divide-y divide-gray-100">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium">{t.name}</span>
                {t.clinic_id === null && (
                  <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Global</span>
                )}
                {t.diagnosis && <div className="text-xs text-gray-500">{t.diagnosis}</div>}
              </div>
              {t.clinic_id !== null && (
                <button
                  onClick={() => deactivateTpl(t.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          <input
            type="text"
            value={newTplName}
            onChange={(e) => setNewTplName(e.target.value)}
            placeholder="Template name"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input
            type="text"
            value={newTplDiagnosis}
            onChange={(e) => setNewTplDiagnosis(e.target.value)}
            placeholder="Default diagnosis"
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleAddTpl}
            className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Note: v1 creates a skeleton template with name + diagnosis only. To populate modalities, exercises, and advice for a template, edit the template row directly in Supabase, or use the "Apply Template" flow to seed values during normal Rx creation and copy them over.
        </p>
      </section>

      {/* Advice library */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-base font-semibold">Bangla Advice Library</h3>
        <p className="mt-1 text-sm text-gray-600">
          Pre-write advice here so you never type Bangla during a consultation.
        </p>
        <ul className="mt-3 max-h-60 divide-y divide-gray-100 overflow-auto">
          {advice.map((a) => (
            <li key={a.id} className="flex items-start justify-between py-2 text-sm">
              <div>
                <span className="font-bengali">{a.text_bn}</span>
                {a.text_en && <div className="text-xs text-gray-500">{a.text_en}</div>}
                <div className="mt-0.5 text-xs">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                    {ADVICE_CATEGORY_LABELS[a.category as AdviceCategory]}
                  </span>
                  {a.clinic_id === null && (
                    <span className="ml-1 rounded bg-gray-100 px-2 py-0.5 text-gray-600">Global</span>
                  )}
                </div>
              </div>
              {a.clinic_id !== null && (
                <button
                  onClick={() => deactivateAdvice(a.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <div className="flex gap-2">
            <select
              value={newAdviceCategory}
              onChange={(e) => setNewAdviceCategory(e.target.value as AdviceCategory)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              {(Object.keys(ADVICE_CATEGORY_LABELS) as AdviceCategory[]).map((c) => (
                <option key={c} value={c}>
                  {ADVICE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newAdviceBn}
              onChange={(e) => setNewAdviceBn(e.target.value)}
              placeholder="Advice in Bangla"
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-bengali"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAdviceEn}
              onChange={(e) => setNewAdviceEn(e.target.value)}
              placeholder="(Optional) English mirror"
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button
              onClick={handleAddAdvice}
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Mount in Settings page**

In `src/pages/Settings.tsx`, import and render inside the existing sections column:

```tsx
import { PrescriptionSettings } from "@/pages/settings/PrescriptionSettings";

// …in the render, after other sections:
<PrescriptionSettings />
```

- [ ] **Step 3: Manual verification**

1. Log in as `clinic_admin`
2. Go to `/settings`
3. Scroll to "Protocol Templates" section — should see 6 Global templates
4. Add a custom template "Ankle Sprain" with diagnosis "Grade I Lateral Ankle Sprain" → appears without Global badge
5. Add a Bangla advice entry in posture category → appears in list
6. Re-open Prescription Builder on any appointment → your new clinic-custom template appears in the dropdown, your new Bangla advice appears in the posture section
7. Log in as `therapist` → `/settings` hides the admin-only controls, shows the "Only clinic admins…" message

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings/PrescriptionSettings.tsx src/pages/Settings.tsx
git commit -m "feat(rx): add Prescription Settings for clinic admins"
```

---

## Task 17: End-to-end manual verification

- [ ] **Step 1: Walk through the full golden path**

1. Log in as a clinic_admin
2. Create a new appointment for a test patient
3. On `/appointments`, click `[Prescribe]` → modal opens with patient name/age/gender/phone auto-filled & locked
4. Click `[Apply Template ▾] → Frozen Shoulder` → diagnosis, modalities, exercises, Bangla advice all populate
5. Tap chief complaint chips (Pain, Stiffness)
6. Tap body part chips (Shoulder)
7. Move VAS slider to 7 — emoji updates
8. Tap `[Save & Print]` → modal closes, print tab opens, browser print dialog appears
9. Confirm print preview:
   - Clinic header + date + therapist
   - Patient block
   - All filled sections
   - Bangla renders as Bangla characters
   - Body diagram visible
   - Doctor's Notes has 6 blank ruled lines
   - Signature line at bottom
10. Close print, return to `/appointments` — button now reads `[Edit Rx]`
11. Click `[Edit Rx]` → modal reopens with saved values
12. Create a second appointment for same patient → `[Prescribe]` → click `[Clone Previous Visit]` → everything except pain/notes fills in
13. Log in as `therapist` → confirm Prescribe works but they can only see their own patients' Rx (via existing role filter in hook)

- [ ] **Step 2: Regression check**

Visit each existing page and confirm nothing broke:
- `/` dashboard
- `/patients`
- `/appointments`
- `/treatments` or existing treatment plan flow
- `/settings` — existing sections still render
- Billing page (if any) — unaffected

- [ ] **Step 3: Final commit (if any cleanup)**

```bash
git status
# If there are stray files: add, commit, or remove
```

---

## Appendix A — Full migration SQL for Task 1

Paste this entire block as the contents of `supabase/migrations/20260417_prescriptions.sql`:

```sql
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
    array[E'ভারী জিনিস তুলবেন না', E'শক্ত বিছানায় ঘুমাবেন', E'সামনে ঝুঁকবেন না'],
    array['Lower Back'], 10),
  (null, 'Frozen Shoulder', 'Adhesive Capsulitis',
    array['UST','TENS','Hot Pack','SWD'],
    array['Pendulum exercise', E'Codman\'s exercise', 'Wall climbing','Cross-body stretch','Pulley exercise'],
    array['Apply hot pack twice daily','Do not force painful movements','Keep shoulder mobile'],
    array[E'দিনে দুইবার গরম সেঁক দিবেন', E'ব্যথা জোর করে সহ্য করবেন না', E'কাঁধ নাড়াচাড়ায় রাখবেন'],
    array['Shoulder'], 20),
  (null, 'Cervical Spondylosis', 'Cervical Spondylosis',
    array['UST','IFT','Cervical Traction','Hot Pack'],
    array['Neck isometrics','Chin tuck','Shoulder shrug','Neck stretches','Scapular retraction'],
    array['Use cervical pillow','Avoid prolonged screen time','Maintain upright posture'],
    array[E'সার্ভাইকাল বালিশ ব্যবহার করবেন', E'লম্বা সময় স্ক্রিন দেখবেন না', E'সোজা হয়ে বসবেন'],
    array['Neck'], 30),
  (null, 'Stroke Rehab (Early)', 'CVA — Early Rehabilitation',
    array['Neuromuscular Electrical Stimulation','Passive ROM','Functional Electrical Stimulation'],
    array['Passive ROM all joints','Bed mobility','Sitting balance','Weight shifting','Bridging'],
    array['Family assists ROM every 2 hours','Prevent bedsores','Control BP and sugar'],
    array[E'প্রতি ২ ঘন্টায় পরিবার সাহায্য করবে', E'পাশ ফিরাবেন নিয়মিত', E'প্রেসার ও সুগার নিয়ন্ত্রণে রাখবেন'],
    array['Shoulder','Hip','Knee'], 40),
  (null, 'Knee Osteoarthritis', 'Knee OA',
    array['UST','TENS','SWD','Hot Pack'],
    array['Quadriceps isometrics','Straight leg raise','Knee flexion/extension','Wall squats (partial)','Step-ups'],
    array['Reduce body weight','Avoid stairs and squatting','Use knee cap support'],
    array[E'ওজন কমাবেন', E'সিঁড়ি ও বসা-উঠা কম করবেন', E'নী ক্যাপ পরবেন'],
    array['Knee'], 50),
  (null, 'Sciatica', 'Sciatica / Lumbar Radiculopathy',
    array['IFT','TENS','SWD','Lumbar Traction'],
    array['Piriformis stretch','Nerve gliding','McKenzie extension','Hamstring stretch','Pelvic tilt'],
    array['Avoid prolonged sitting','Use lumbar support','Walk every hour'],
    array[E'লম্বা সময় বসে থাকবেন না', E'বসার সময় লাম্বার সাপোর্ট ব্যবহার করবেন', E'প্রতি ঘন্টায় একটু হাঁটবেন'],
    array['Lower Back','Hip'], 60)
on conflict do nothing;

-- 5. Seed bangla_advice_library (17 snippets across 8 categories)
insert into bangla_advice_library (clinic_id, category, text_bn, text_en, sort_order) values
  (null, 'posture',    E'বসার সময় পিঠ সোজা রাখবেন',                    'Keep your back straight while sitting', 10),
  (null, 'posture',    E'দীর্ঘ সময় এক অবস্থায় বসবেন না',                'Do not sit in one position for long', 20),
  (null, 'posture',    E'সোফায় হেলান দিয়ে বসবেন না',                    'Avoid slouching on the sofa', 30),
  (null, 'diabetes',   E'ডায়াবেটিস নিয়ন্ত্রণে রাখবেন',                  'Keep diabetes under control', 10),
  (null, 'diabetes',   E'প্রেসার নিয়মিত চেক করবেন',                       'Monitor your blood pressure regularly', 20),
  (null, 'exercise',   E'প্রতিদিন ১৫ মিনিট হাঁটবেন',                     'Walk for 15 minutes daily', 10),
  (null, 'exercise',   E'নিয়মিত ব্যায়াম করবেন',                            'Exercise regularly', 20),
  (null, 'exercise',   E'সকালে হালকা স্ট্রেচিং করবেন',                   'Do light stretching in the morning', 30),
  (null, 'follow_up',  E'৭ দিন পর আবার আসবেন',                          'Follow up in 7 days', 10),
  (null, 'follow_up',  E'সমস্যা বাড়লে সাথে সাথে জানাবেন',                'Contact us if the problem worsens', 20),
  (null, 'lifestyle',  E'ধূমপান বর্জন করবেন',                             'Avoid smoking', 10),
  (null, 'lifestyle',  E'পর্যাপ্ত বিশ্রাম নিবেন',                          'Get adequate rest', 20),
  (null, 'medication', E'ঔষধ নিয়মিত সেবন করবেন',                         'Take medications as prescribed', 10),
  (null, 'diet',       E'পানি বেশি খাবেন (দিনে ৮ গ্লাস)',                  'Drink plenty of water (8 glasses/day)', 10),
  (null, 'diet',       E'তৈলাক্ত ও ভাজা খাবার কম খাবেন',                 'Limit oily and fried foods', 20),
  (null, 'rest',       E'রাতে ৭-৮ ঘন্টা ঘুমাবেন',                          'Sleep 7-8 hours at night', 10),
  (null, 'rest',       E'আক্রান্ত স্থানে অতিরিক্ত চাপ দিবেন না',           'Avoid excessive pressure on affected area', 20)
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
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 5 user-requested features each map to tasks: Templates (Task 1 seeds + 11 menu + 12 apply), Clone (Task 11 + 12), Chips/VAS/Body (Tasks 7/8/9 + 12), Bangla library (Task 1 seeds + 10 + 16), Auto-fill from appointment (Task 12 patient header + Task 13 wiring)
- ✅ Hybrid paper-friendly print: Task 14 body-diagram + Task 15 print CSS
- ✅ Reserved v2 handwriting fields: included in Task 1 SQL, unused in UI
- ✅ Permissions: Task 6
- ✅ Settings management: Task 16

**Type consistency check:**
- `PrescriptionRow`, `ProtocolTemplateRow`, `BanglaAdviceRow` defined in Task 2, consistent across all hooks (Tasks 3/4/5) and components (Tasks 10/11/12/14/16)
- `AdviceCategory` used consistently as string-literal union
- Hook signatures: all return `{ data…, error, isLoading, …mutations, refresh }` shape matching `useTreatmentPlans`

**Placeholder check:**
- No "TODO" or "TBD" remaining
- Every task has exact code, exact file paths, exact commands
- Each task has a clear commit

**Known non-placeholder caveats (intentional, called out):**
- Task 13 Step 1 says to read `Appointments.tsx` first because the exact field names on `AppointmentWithRelations` weren't scouted. This is an unavoidable context-load step, not a placeholder.
- Task 16 v1 creates skeleton templates (name + diagnosis); full template editing UI is explicitly deferred — noted in the settings UI.
- Regenerating Supabase types (Task 1 Step 4) uses a generic command — Shakil should verify the exact project-id/script in his local setup.

