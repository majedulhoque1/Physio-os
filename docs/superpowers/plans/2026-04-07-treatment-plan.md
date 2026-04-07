# Treatment Plan Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand treatment plans from a bare session counter into a full clinical + billing plan with a 2-tab create/edit modal on the Patient Profile page.

**Architecture:** Add 10 new nullable columns to the `treatment_plans` Supabase table, extend the TypeScript type and hook, extract `TreatmentPlanCard` into its own file with expand/edit capability, and build `TreatmentPlanModal` with Clinical and Package & Billing tabs. `PatientProfile` wires it all together.

**Tech Stack:** React, TypeScript, Tailwind CSS, Supabase (PostgreSQL), react-hook-form, zod, lucide-react

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/002_treatment_plan_fields.sql` | Add 10 new columns |
| Modify | `src/types/index.ts` | Extend `TreatmentPlanRow` + `Database` type |
| Modify | `src/hooks/useTreatmentPlans.ts` | Add new input fields + `updatePlan` function |
| Create | `src/components/patients/TreatmentPlanCard.tsx` | Card with expand toggle + edit button |
| Create | `src/components/patients/TreatmentPlanModal.tsx` | 2-tab create/edit modal |
| Modify | `src/pages/PatientProfile.tsx` | Wire modal + "New Plan" button, use new card |

---

## Task 1: Supabase migration

**Files:**
- Create: `supabase/migrations/002_treatment_plan_fields.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Migration: Add clinical and operational fields to treatment_plans
ALTER TABLE treatment_plans
  ADD COLUMN IF NOT EXISTS short_term_goals    text,
  ADD COLUMN IF NOT EXISTS long_term_goals     text,
  ADD COLUMN IF NOT EXISTS interventions       text[],
  ADD COLUMN IF NOT EXISTS frequency_per_week  integer,
  ADD COLUMN IF NOT EXISTS precautions         text,
  ADD COLUMN IF NOT EXISTS reassessment_date   date,
  ADD COLUMN IF NOT EXISTS patient_instructions text,
  ADD COLUMN IF NOT EXISTS package_name        text,
  ADD COLUMN IF NOT EXISTS fee_per_session     numeric,
  ADD COLUMN IF NOT EXISTS total_fee           numeric;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with the SQL above and name `002_treatment_plan_fields`. Confirm the migration shows up in `mcp__claude_ai_Supabase__list_migrations`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_treatment_plan_fields.sql
git commit -m "feat: add clinical + billing columns to treatment_plans"
```

---

## Task 2: Extend TypeScript types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new fields to `TreatmentPlanRow`**

Replace the existing `TreatmentPlanRow` interface (currently ends at `updated_at`) with:

```ts
export interface TreatmentPlanRow {
  abandoned_at: string | null;
  clinic_id: string;
  completed_at: string | null;
  completed_sessions: number;
  created_at: string | null;
  diagnosis: string | null;
  fee_per_session: number | null;
  frequency_per_week: number | null;
  id: string;
  interventions: string[] | null;
  long_term_goals: string | null;
  notes: string | null;
  package_name: string | null;
  patient_id: string;
  patient_instructions: string | null;
  precautions: string | null;
  reassessment_date: string | null;
  short_term_goals: string | null;
  started_at: string | null;
  status: TreatmentPlanStatus;
  therapist_id: string;
  total_fee: number | null;
  total_sessions: number;
  updated_at: string | null;
}
```

- [ ] **Step 2: Update the `treatment_plans` Insert type in `Database`**

The `Insert` type for `treatment_plans` is inside the `Database` interface. Find this block and replace it:

```ts
treatment_plans: {
  Insert: Omit<TreatmentPlanRow,
    | "completed_sessions"
    | "created_at"
    | "id"
    | "updated_at"
  > & {
    completed_sessions?: number;
    created_at?: string | null;
    id?: string;
    updated_at?: string | null;
  };
  Relationships: [];
  Row: TreatmentPlanRow;
  Update: Partial<TreatmentPlanRow>;
};
```

- [ ] **Step 3: Verify build passes**

```bash
cd "d:/CODE/Physio os" && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors. Fix any type errors before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: extend TreatmentPlanRow with clinical and billing fields"
```

---

## Task 3: Update `useTreatmentPlans` hook

**Files:**
- Modify: `src/hooks/useTreatmentPlans.ts`

- [ ] **Step 1: Extend `SELECT_FIELDS` and `CreateTreatmentPlanInput`**

Replace the top section of the file (imports through `SELECT_FIELDS` constant and `CreateTreatmentPlanInput`):

```ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { Database, TreatmentPlanRow, TreatmentPlanStatus } from "@/types";

export interface CreateTreatmentPlanInput {
  diagnosis?: string | null;
  fee_per_session?: number | null;
  frequency_per_week?: number | null;
  interventions?: string[] | null;
  long_term_goals?: string | null;
  notes?: string | null;
  package_name?: string | null;
  patient_id: string;
  patient_instructions?: string | null;
  precautions?: string | null;
  reassessment_date?: string | null;
  short_term_goals?: string | null;
  started_at?: string | null;
  therapist_id: string;
  total_fee?: number | null;
  total_sessions: number;
}

export type UpdateTreatmentPlanInput = Partial<CreateTreatmentPlanInput>;

interface MutationResult {
  error: string | null;
  planId?: string | null;
}

interface UseTreatmentPlansState {
  error: string | null;
  isLoading: boolean;
  plans: TreatmentPlanRow[];
}

type PlanInsert = Database["public"]["Tables"]["treatment_plans"]["Insert"];
type PlanUpdate = Database["public"]["Tables"]["treatment_plans"]["Update"];

const SELECT_FIELDS =
  "id, clinic_id, patient_id, therapist_id, diagnosis, total_sessions, completed_sessions, status, started_at, completed_at, abandoned_at, notes, created_at, updated_at, short_term_goals, long_term_goals, interventions, frequency_per_week, precautions, reassessment_date, patient_instructions, package_name, fee_per_session, total_fee";
```

- [ ] **Step 2: Update `createPlan` payload to include new fields**

Find the `payload: PlanInsert = {` block inside `createPlan` and replace it with:

```ts
const payload: PlanInsert = {
  clinic_id: clinicId,
  diagnosis: input.diagnosis ?? null,
  fee_per_session: input.fee_per_session ?? null,
  frequency_per_week: input.frequency_per_week ?? null,
  interventions: input.interventions ?? null,
  long_term_goals: input.long_term_goals ?? null,
  notes: input.notes ?? null,
  package_name: input.package_name ?? null,
  patient_id: input.patient_id,
  patient_instructions: input.patient_instructions ?? null,
  precautions: input.precautions ?? null,
  reassessment_date: input.reassessment_date ?? null,
  short_term_goals: input.short_term_goals ?? null,
  started_at: input.started_at ?? null,
  status: "active",
  therapist_id: input.therapist_id,
  total_fee: input.total_fee ?? null,
  total_sessions: input.total_sessions,
  completed_at: null,
  abandoned_at: null,
};
```

- [ ] **Step 3: Add `updatePlan` function**

Add this function after the closing brace of `updatePlanStatus`, before the `activePlan` line:

```ts
const updatePlan = useCallback(
  async (planId: string, input: UpdateTreatmentPlanInput): Promise<MutationResult> => {
    if (!can("manage_patients")) {
      return { error: "You do not have permission to update treatment plans." };
    }
    if (!supabase) return { error: supabaseConfigMessage };
    if (!clinicId) return { error: "No clinic context" };

    const update: PlanUpdate = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("treatment_plans")
      .update(update as never)
      .eq("id", planId)
      .eq("clinic_id", clinicId);

    if (error) return { error: error.message };

    await loadPlans();
    return { error: null, planId };
  },
  [can, clinicId, loadPlans],
);
```

- [ ] **Step 4: Export `updatePlan` from the hook's return**

Find the return statement at the bottom and add `updatePlan`:

```ts
return {
  ...state,
  activePlan,
  createPlan,
  refreshPlans: loadPlans,
  updatePlan,
  updatePlanStatus,
};
```

- [ ] **Step 5: Verify build passes**

```bash
cd "d:/CODE/Physio os" && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTreatmentPlans.ts
git commit -m "feat: extend useTreatmentPlans with new fields and updatePlan"
```

---

## Task 4: Create `TreatmentPlanCard` component

**Files:**
- Create: `src/components/patients/TreatmentPlanCard.tsx`

This extracts and expands the existing inline `TreatmentPlanCard` from `PatientProfile.tsx`.

- [ ] **Step 1: Write the component file**

```tsx
import { ChevronDown, ChevronUp, Pause, Pencil, Play, X as XIcon } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { StatusTone, TreatmentPlanRow, TreatmentPlanStatus } from "@/types";

function getPlanStatusTone(status: TreatmentPlanStatus): StatusTone {
  switch (status) {
    case "active": return "green";
    case "completed": return "blue";
    case "abandoned": return "red";
    case "paused": return "yellow";
    default: return "gray";
  }
}

function SessionProgress({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Sessions</span>
        <span className="font-semibold text-foreground">{completed} / {total}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface TreatmentPlanCardProps {
  canManage: boolean;
  onEdit: (plan: TreatmentPlanRow) => void;
  onStatusChange: (planId: string, status: TreatmentPlanStatus) => void;
  plan: TreatmentPlanRow;
  therapistName: string;
}

export function TreatmentPlanCard({
  canManage,
  onEdit,
  onStatusChange,
  plan,
  therapistName,
}: TreatmentPlanCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      {/* Collapsed header */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusBadge label={plan.status} tone={getPlanStatusTone(plan.status)} />
            {plan.diagnosis ? (
              <span className="truncate text-sm text-muted-foreground">{plan.diagnosis}</span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {canManage ? (
              <button
                type="button"
                onClick={() => onEdit(plan)}
                title="Edit plan"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {canManage && plan.status === "active" ? (
              <>
                <button
                  type="button"
                  onClick={() => onStatusChange(plan.id, "paused")}
                  title="Pause plan"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(plan.id, "abandoned")}
                  title="Abandon plan"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-danger"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}

            {canManage && plan.status === "paused" ? (
              <button
                type="button"
                onClick={() => onStatusChange(plan.id, "active")}
                title="Resume plan"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <SessionProgress completed={plan.completed_sessions} total={plan.total_sessions} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Therapist: <span className="font-medium text-foreground">{therapistName}</span></span>
          {plan.started_at ? <span>Started {formatDate(plan.started_at)}</span> : null}
          {plan.frequency_per_week ? <span>{plan.frequency_per_week}×/week</span> : null}
          {plan.package_name ? (
            <span className="font-medium text-foreground">{plan.package_name}</span>
          ) : null}
          {plan.total_fee ? (
            <span>৳{plan.total_fee.toLocaleString()}</span>
          ) : null}
        </div>
      </div>

      {/* Expanded details */}
      {expanded ? (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {plan.short_term_goals ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Short-term Goals</p>
              <p className="mt-1 text-sm text-foreground">{plan.short_term_goals}</p>
            </div>
          ) : null}

          {plan.long_term_goals ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Long-term Goals</p>
              <p className="mt-1 text-sm text-foreground">{plan.long_term_goals}</p>
            </div>
          ) : null}

          {plan.interventions && plan.interventions.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interventions</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {plan.interventions.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {plan.reassessment_date ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reassessment</p>
              <p className="mt-1 text-sm text-foreground">{formatDate(plan.reassessment_date)}</p>
            </div>
          ) : null}

          {plan.precautions ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Precautions</p>
              <p className="mt-1 text-sm text-foreground">{plan.precautions}</p>
            </div>
          ) : null}

          {plan.patient_instructions ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient Instructions</p>
              <p className="mt-1 text-sm text-foreground">{plan.patient_instructions}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "d:/CODE/Physio os" && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/TreatmentPlanCard.tsx
git commit -m "feat: add TreatmentPlanCard with expand toggle and edit button"
```

---

## Task 5: Create `TreatmentPlanModal` component

**Files:**
- Create: `src/components/patients/TreatmentPlanModal.tsx`

- [ ] **Step 1: Write the modal file**

```tsx
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CreateTreatmentPlanInput, UpdateTreatmentPlanInput } from "@/hooks/useTreatmentPlans";
import { cn } from "@/lib/utils";
import type { TherapistRow, TreatmentPlanRow } from "@/types";

type Tab = "clinical" | "package";

interface Props {
  defaultTherapistId?: string;
  editingPlan?: TreatmentPlanRow | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTreatmentPlanInput | (UpdateTreatmentPlanInput & { id: string })) => void;
  open: boolean;
  patientId: string;
  patientName: string;
  therapists: TherapistRow[];
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function fieldClass(hasError = false) {
  return cn(
    "w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors",
    hasError
      ? "border-danger/40 ring-2 ring-danger/10"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/10",
  );
}

function taClass() {
  return cn(fieldClass(), "resize-none");
}

interface FormState {
  diagnosis: string;
  fee_per_session: string;
  frequency_per_week: string;
  interventions: string[];
  long_term_goals: string;
  notes: string;
  package_name: string;
  patient_instructions: string;
  precautions: string;
  reassessment_date: string;
  short_term_goals: string;
  started_at: string;
  therapist_id: string;
  total_fee: string;
  total_sessions: string;
}

function blankForm(defaultTherapistId?: string): FormState {
  return {
    diagnosis: "",
    fee_per_session: "",
    frequency_per_week: "",
    interventions: [],
    long_term_goals: "",
    notes: "",
    package_name: "",
    patient_instructions: "",
    precautions: "",
    reassessment_date: "",
    short_term_goals: "",
    started_at: todayString(),
    therapist_id: defaultTherapistId ?? "",
    total_fee: "",
    total_sessions: "",
  };
}

function planToForm(plan: TreatmentPlanRow): FormState {
  return {
    diagnosis: plan.diagnosis ?? "",
    fee_per_session: plan.fee_per_session != null ? String(plan.fee_per_session) : "",
    frequency_per_week: plan.frequency_per_week != null ? String(plan.frequency_per_week) : "",
    interventions: plan.interventions ?? [],
    long_term_goals: plan.long_term_goals ?? "",
    notes: plan.notes ?? "",
    package_name: plan.package_name ?? "",
    patient_instructions: plan.patient_instructions ?? "",
    precautions: plan.precautions ?? "",
    reassessment_date: plan.reassessment_date ?? "",
    short_term_goals: plan.short_term_goals ?? "",
    started_at: plan.started_at ? plan.started_at.slice(0, 10) : todayString(),
    therapist_id: plan.therapist_id,
    total_fee: plan.total_fee != null ? String(plan.total_fee) : "",
    total_sessions: String(plan.total_sessions),
  };
}

export function TreatmentPlanModal({
  defaultTherapistId,
  editingPlan,
  isSaving,
  onClose,
  onSubmit,
  open,
  patientId,
  patientName,
  therapists,
}: Props) {
  const [tab, setTab] = useState<Tab>("clinical");
  const [form, setForm] = useState<FormState>(() =>
    editingPlan ? planToForm(editingPlan) : blankForm(defaultTherapistId),
  );
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Reset form when modal opens or editing target changes
  useEffect(() => {
    if (open) {
      setForm(editingPlan ? planToForm(editingPlan) : blankForm(defaultTherapistId));
      setTagInput("");
      setErrors({});
      setTab("clinical");
    }
  }, [open, editingPlan, defaultTherapistId]);

  if (!open) return null;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-calculate total_fee when fee_per_session or total_sessions changes
      if (field === "fee_per_session" || field === "total_sessions") {
        const fee = parseFloat(field === "fee_per_session" ? value : next.fee_per_session);
        const sessions = parseInt(field === "total_sessions" ? value : next.total_sessions, 10);
        if (!isNaN(fee) && !isNaN(sessions) && sessions > 0) {
          next.total_fee = String(fee * sessions);
        }
      }

      return next;
    });
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    if (!form.interventions.includes(tag)) {
      setForm((prev) => ({ ...prev, interventions: [...prev.interventions, tag] }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      interventions: prev.interventions.filter((t) => t !== tag),
    }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.diagnosis.trim()) next.diagnosis = "Diagnosis is required";
    if (!form.total_sessions || parseInt(form.total_sessions, 10) < 1)
      next.total_sessions = "At least 1 session required";
    if (!form.therapist_id) next.therapist_id = "Therapist is required";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Switch to the tab that has the first error
      if (next.diagnosis || next.therapist_id) setTab("clinical");
      else setTab("package");
      return false;
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const base = {
      diagnosis: form.diagnosis.trim() || null,
      fee_per_session: form.fee_per_session ? parseFloat(form.fee_per_session) : null,
      frequency_per_week: form.frequency_per_week ? parseInt(form.frequency_per_week, 10) : null,
      interventions: form.interventions.length > 0 ? form.interventions : null,
      long_term_goals: form.long_term_goals.trim() || null,
      notes: form.notes.trim() || null,
      package_name: form.package_name.trim() || null,
      patient_instructions: form.patient_instructions.trim() || null,
      precautions: form.precautions.trim() || null,
      reassessment_date: form.reassessment_date || null,
      short_term_goals: form.short_term_goals.trim() || null,
      started_at: form.started_at || null,
      therapist_id: form.therapist_id,
      total_fee: form.total_fee ? parseFloat(form.total_fee) : null,
      total_sessions: parseInt(form.total_sessions, 10),
    };

    if (editingPlan) {
      onSubmit({ ...base, id: editingPlan.id });
    } else {
      onSubmit({ ...base, patient_id: patientId });
    }
  }

  const isEditing = Boolean(editingPlan);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {isEditing ? "Edit Treatment Plan" : "New Treatment Plan"}
            </h2>
            <p className="text-sm text-muted-foreground">{patientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["clinical", "package"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                tab === t
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "clinical" ? "Clinical" : "Package & Billing"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            {/* Clinical tab */}
            {tab === "clinical" ? (
              <div className="space-y-4">
                {/* Diagnosis + Therapist */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Diagnosis <span className="text-danger">*</span>
                    <input
                      type="text"
                      value={form.diagnosis}
                      onChange={(e) => set("diagnosis", e.target.value)}
                      placeholder="e.g. Lower back pain"
                      className={cn("mt-1.5", fieldClass(Boolean(errors.diagnosis)))}
                    />
                    {errors.diagnosis ? (
                      <span className="mt-1 block text-xs text-danger">{errors.diagnosis}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Therapist <span className="text-danger">*</span>
                    <select
                      value={form.therapist_id}
                      onChange={(e) => set("therapist_id", e.target.value)}
                      className={cn("mt-1.5", fieldClass(Boolean(errors.therapist_id)))}
                    >
                      <option value="">Select therapist</option>
                      {therapists.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.specialization ? ` — ${t.specialization}` : ""}
                        </option>
                      ))}
                    </select>
                    {errors.therapist_id ? (
                      <span className="mt-1 block text-xs text-danger">{errors.therapist_id}</span>
                    ) : null}
                  </label>
                </div>

                <label className="text-sm font-medium text-foreground">
                  Short-term Goals
                  <textarea
                    value={form.short_term_goals}
                    onChange={(e) => set("short_term_goals", e.target.value)}
                    rows={2}
                    placeholder="e.g. Reduce pain to 3/10 in 2 weeks"
                    className={cn("mt-1.5", taClass())}
                  />
                </label>

                <label className="text-sm font-medium text-foreground">
                  Long-term Goals
                  <textarea
                    value={form.long_term_goals}
                    onChange={(e) => set("long_term_goals", e.target.value)}
                    rows={2}
                    placeholder="e.g. Full ROM, return to work"
                    className={cn("mt-1.5", taClass())}
                  />
                </label>

                {/* Interventions tag input */}
                <div>
                  <p className="text-sm font-medium text-foreground">Interventions / Exercises</p>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addTag(); }
                      }}
                      placeholder="Type and press Enter"
                      className={fieldClass()}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-50"
                    >
                      Add
                    </button>
                  </div>
                  {form.interventions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.interventions.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-0.5 text-primary/60 hover:text-primary"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Frequency + Reassessment */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Frequency / week
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={form.frequency_per_week}
                      onChange={(e) => set("frequency_per_week", e.target.value)}
                      placeholder="e.g. 3"
                      className={cn("mt-1.5", fieldClass())}
                    />
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Reassessment Date
                    <input
                      type="date"
                      value={form.reassessment_date}
                      onChange={(e) => set("reassessment_date", e.target.value)}
                      className={cn("mt-1.5", fieldClass())}
                    />
                  </label>
                </div>

                <label className="text-sm font-medium text-foreground">
                  Precautions / Contraindications
                  <textarea
                    value={form.precautions}
                    onChange={(e) => set("precautions", e.target.value)}
                    rows={2}
                    placeholder="e.g. Avoid spinal flexion, no heat on acute inflammation"
                    className={cn("mt-1.5", taClass())}
                  />
                </label>

                <label className="text-sm font-medium text-foreground">
                  Patient Instructions
                  <textarea
                    value={form.patient_instructions}
                    onChange={(e) => set("patient_instructions", e.target.value)}
                    rows={3}
                    placeholder="Home exercise program, do's and don'ts…"
                    className={cn("mt-1.5", taClass())}
                  />
                </label>
              </div>
            ) : null}

            {/* Package & Billing tab */}
            {tab === "package" ? (
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">
                  Package Name
                  <input
                    type="text"
                    value={form.package_name}
                    onChange={(e) => set("package_name", e.target.value)}
                    placeholder="e.g. 10-session back pain package"
                    className={cn("mt-1.5", fieldClass())}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Total Sessions <span className="text-danger">*</span>
                    <input
                      type="number"
                      min={1}
                      value={form.total_sessions}
                      onChange={(e) => set("total_sessions", e.target.value)}
                      placeholder="e.g. 10"
                      className={cn("mt-1.5", fieldClass(Boolean(errors.total_sessions)))}
                    />
                    {errors.total_sessions ? (
                      <span className="mt-1 block text-xs text-danger">{errors.total_sessions}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Start Date
                    <input
                      type="date"
                      value={form.started_at}
                      onChange={(e) => set("started_at", e.target.value)}
                      className={cn("mt-1.5", fieldClass())}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Fee per Session (BDT)
                    <input
                      type="number"
                      min={0}
                      value={form.fee_per_session}
                      onChange={(e) => set("fee_per_session", e.target.value)}
                      placeholder="e.g. 800"
                      className={cn("mt-1.5", fieldClass())}
                    />
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Total Fee (BDT)
                    <input
                      type="number"
                      min={0}
                      value={form.total_fee}
                      onChange={(e) => set("total_fee", e.target.value)}
                      placeholder="Auto-calculated"
                      className={cn("mt-1.5", fieldClass())}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Auto = sessions × fee. You can override.
                    </span>
                  </label>
                </div>

                <label className="text-sm font-medium text-foreground">
                  Notes
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={3}
                    placeholder="Any additional notes about this plan…"
                    className={cn("mt-1.5", taClass())}
                  />
                </label>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "d:/CODE/Physio os" && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/TreatmentPlanModal.tsx
git commit -m "feat: add TreatmentPlanModal with Clinical and Package tabs"
```

---

## Task 6: Update `PatientProfile` to wire it all together

**Files:**
- Modify: `src/pages/PatientProfile.tsx`

- [ ] **Step 1: Replace imports at the top of the file**

Replace the existing import block (everything up to and including the last import statement) with:

```tsx
import { ArrowLeft, CalendarPlus, ClipboardList, Phone, Plus, User } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TreatmentPlanCard } from "@/components/patients/TreatmentPlanCard";
import { TreatmentPlanModal } from "@/components/patients/TreatmentPlanModal";
import { BookAppointmentModal, type AppointmentFormValues } from "@/components/shared/BookAppointmentModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { SessionNoteModal } from "@/components/shared/SessionNoteModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useSessionNotes, type CreateSessionNoteInput } from "@/hooks/useSessionNotes";
import { useTreatmentPlans } from "@/hooks/useTreatmentPlans";
import { useTherapists } from "@/hooks/useTherapists";
import { formatDate, formatTime } from "@/lib/utils";
import type {
  AppointmentStatus,
  AppointmentWithRelations,
  PatientStatus,
  SessionNoteRow,
  StatusTone,
  TreatmentPlanRow,
  TreatmentPlanStatus,
} from "@/types";
```

- [ ] **Step 2: Remove the inline `getPlanStatusTone`, `SessionProgress`, and `TreatmentPlanCard` function definitions**

Delete these three functions from `PatientProfile.tsx` (they span lines ~56–156 in the original file). They are now in `TreatmentPlanCard.tsx`. Keep `getPatientStatusTone`, `getAppointmentStatusTone`, `NotePreview`, and `AppointmentHistoryRow`.

- [ ] **Step 3: Add plan modal state inside the `PatientProfile` component**

Inside the `PatientProfile` function, after the existing `useState` declarations, add:

```tsx
const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
const [editingPlan, setEditingPlan] = useState<TreatmentPlanRow | null>(null);
const [isSavingPlan, setIsSavingPlan] = useState(false);
```

- [ ] **Step 4: Add `handleSavePlan` handler**

Add this function inside `PatientProfile`, after `handleSaveNote`:

```tsx
async function handleSavePlan(
  input:
    | import("@/hooks/useTreatmentPlans").CreateTreatmentPlanInput
    | (import("@/hooks/useTreatmentPlans").UpdateTreatmentPlanInput & { id: string }),
) {
  setIsSavingPlan(true);
  let result: { error: string | null };

  if ("id" in input) {
    const { id, ...rest } = input;
    result = await updatePlan(id, rest);
  } else {
    result = await createPlan(input);
  }

  setIsSavingPlan(false);

  if (result.error) {
    toast({ title: "Could not save plan", description: result.error, variant: "error" });
    return;
  }

  setIsPlanModalOpen(false);
  setEditingPlan(null);
  toast({ title: editingPlan ? "Plan updated" : "Treatment plan created", variant: "success" });
}
```

- [ ] **Step 5: Destructure `updatePlan` from the hook**

Find the `useTreatmentPlans` call and add `updatePlan` to the destructured values:

```tsx
const {
  plans,
  activePlan,
  isLoading: plansLoading,
  updatePlan,
  updatePlanStatus,
} = useTreatmentPlans(id ? { patientId: id } : {});
```

- [ ] **Step 6: Update the Treatment Plans section in JSX**

Replace the entire `{/* Treatment Plans */}` section (from `<section className="space-y-3">` to the closing `</section>`) with:

```tsx
{/* Treatment Plans */}
<section className="space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
      Treatment Plans
    </h3>
    {can("manage_patients") ? (
      <button
        type="button"
        onClick={() => { setEditingPlan(null); setIsPlanModalOpen(true); }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        New Plan
      </button>
    ) : null}
  </div>

  {plansLoading ? (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  ) : plans.length === 0 ? (
    <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center">
      <p className="text-sm font-semibold text-foreground">No treatment plans</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a treatment plan to track session progress.
      </p>
    </div>
  ) : (
    <div className="space-y-2">
      {plans.map((plan) => {
        const therapist = therapists.find((t) => t.id === plan.therapist_id);
        return (
          <TreatmentPlanCard
            key={plan.id}
            plan={plan}
            therapistName={therapist?.name ?? "Unassigned"}
            canManage={can("manage_patients")}
            onEdit={(p) => { setEditingPlan(p); setIsPlanModalOpen(true); }}
            onStatusChange={async (planId, status) => {
              const result = await updatePlanStatus(planId, status);
              if (result.error) {
                toast({ title: "Could not update plan", description: result.error, variant: "error" });
              } else {
                toast({ title: `Plan ${status}`, variant: "success" });
              }
            }}
          />
        );
      })}
    </div>
  )}
</section>
```

- [ ] **Step 7: Add `TreatmentPlanModal` to the JSX return**

Add this just before the closing `</div>` of the return statement (after the existing `SessionNoteModal`):

```tsx
<TreatmentPlanModal
  open={isPlanModalOpen}
  onClose={() => { setIsPlanModalOpen(false); setEditingPlan(null); }}
  onSubmit={handleSavePlan}
  editingPlan={editingPlan}
  patientId={patient.id}
  patientName={patient.name}
  therapists={therapists}
  defaultTherapistId={patient.assigned_therapist ?? undefined}
  isSaving={isSavingPlan}
/>
```

- [ ] **Step 8: Final build check**

```bash
cd "d:/CODE/Physio os" && npm run build 2>&1 | tail -30
```

Expected: clean build with no TypeScript errors. Fix any remaining errors before committing.

- [ ] **Step 9: Commit**

```bash
git add src/pages/PatientProfile.tsx
git commit -m "feat: wire TreatmentPlanModal and TreatmentPlanCard into PatientProfile"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Migration ✓ | TypeScript types ✓ | hook (create + update) ✓ | TreatmentPlanCard (expand + edit) ✓ | TreatmentPlanModal (2 tabs, tag input, auto-calc fee) ✓ | PatientProfile (New Plan button, modal wiring) ✓ | Permissions (`can("manage_patients")`) ✓
- [x] **No placeholders:** All code is complete in every step
- [x] **Type consistency:** `CreateTreatmentPlanInput` defined in Task 3 and used in Tasks 5 & 6. `UpdateTreatmentPlanInput` defined in Task 3 and used in Tasks 5 & 6. `TreatmentPlanRow` extended in Task 2 and used throughout. `updatePlan` added to hook in Task 3, destructured in Task 6.
- [x] **Additive only:** All new columns are nullable — zero breaking changes to existing data
