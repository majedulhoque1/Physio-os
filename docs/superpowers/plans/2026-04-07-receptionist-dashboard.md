# Receptionist Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "No clinic context" auth bug for staff accounts and rebuild the receptionist dashboard as a patient-centric hub with search, add-patient, and compact schedule — fully responsive.

**Architecture:** Three sequential tasks: (1) unblock auth by adding JWT fallback in `AuthContext`, (2) extract `AddPatientModal` to a shared component, (3) rewrite `ReceptionistDashboard` using `usePatients` + `useDashboard` + the extracted modal.

**Tech Stack:** React, TypeScript, Tailwind CSS, Supabase, react-hook-form, zod, react-router-dom

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/contexts/AuthContext.tsx` | Add JWT `app_metadata.clinic_id` as 3rd fallback in `loadUserData` |
| Create | `src/components/patients/AddPatientModal.tsx` | Extracted 2-step patient creation modal |
| Modify | `src/pages/Patients.tsx` | Remove local `AddPatientModal`, import from shared component |
| Modify | `src/pages/dashboards/ReceptionistDashboard.tsx` | Full rewrite: patient-centric hub |

---

## Task 1: Fix AuthContext JWT Fallback

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

**The bug:** `loadUserData` resolves `clinicId` from the database only. When RLS blocks the query (e.g. the staff member's `clinic_memberships` row doesn't exist yet, or `user_profiles.default_clinic_id` is null), `clinicId` → null. The edge function `create-staff-member` correctly writes `app_metadata.clinic_id` to the JWT, but it's never read.

- [ ] **Step 1: Update `loadUserData` signature and fallback chain**

In `src/contexts/AuthContext.tsx`, change the `loadUserData` function signature from:
```ts
async function loadUserData(userId: string) {
```
to:
```ts
async function loadUserData(userId: string, jwtClinicId?: string) {
```

Then change the `resolvedClinicId` line from:
```ts
const resolvedClinicId =
  resolvedProfile?.default_clinic_id ?? preferredMembership?.clinic_id ?? null;
```
to:
```ts
const resolvedClinicId =
  resolvedProfile?.default_clinic_id ??
  preferredMembership?.clinic_id ??
  jwtClinicId ??
  null;
```

- [ ] **Step 2: Pass `jwtClinicId` at both call sites**

In the same file, find the `getSession` callback call:
```ts
loadUserData(session.user.id).finally(() => setIsLoading(false));
```
Change to:
```ts
loadUserData(session.user.id, session.user.app_metadata?.clinic_id as string | undefined).finally(() => setIsLoading(false));
```

Find the `onAuthStateChange` callback call:
```ts
loadUserData(session.user.id).finally(() => setIsLoading(false));
```
Change to:
```ts
loadUserData(session.user.id, session.user.app_metadata?.clinic_id as string | undefined).finally(() => setIsLoading(false));
```

- [ ] **Step 3: Verify in browser**

Log in as the receptionist account. Open the browser console. Confirm no "No clinic context" error. Navigate to `/patients` and attempt to add a patient — the modal should complete successfully and the therapist dropdown should show clinic therapists.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "fix: use JWT app_metadata.clinic_id as fallback in AuthContext"
```

---

## Task 2: Extract AddPatientModal to Shared Component

**Files:**
- Create: `src/components/patients/AddPatientModal.tsx`
- Modify: `src/pages/Patients.tsx`

The 2-step patient creation modal currently lives inside `Patients.tsx`. The receptionist dashboard also needs it. Extract it into a shared component with no logic changes.

- [ ] **Step 1: Create `src/components/patients/AddPatientModal.tsx`**

Create the file with this exact content:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { TherapistRow } from "@/types";

const COMMON_DIAGNOSES = [
  "Low back pain",
  "Neck pain / Cervical spondylosis",
  "Knee pain / Osteoarthritis",
  "Shoulder pain / Frozen shoulder",
  "Stroke rehabilitation",
  "Sports injury",
  "Post-surgical rehabilitation",
  "Plantar fasciitis",
  "Sciatica",
  "Rotator cuff injury",
  "Disc herniation",
  "Tennis / Golfer's elbow",
];

const patientCreateSchema = z.object({
  age: z.coerce.number().int().min(0, "Must be 0 or more").max(120, "Keep it under 120").nullable(),
  assigned_therapist: z.string().optional(),
  diagnosis: z.string().optional(),
  gender: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  status: z.enum(["active", "completed", "dropped"]),
});

type PatientCreateFormInput = z.input<typeof patientCreateSchema>;
export type PatientCreateValues = z.output<typeof patientCreateSchema>;

function fieldClassName(hasError: boolean) {
  return cn(
    "mt-2 w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors",
    hasError
      ? "border-danger/40 ring-2 ring-danger/10"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/10",
  );
}

function actionButtonClassName(variant: "primary" | "secondary") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    variant === "primary" && "bg-primary text-white hover:bg-primary/90",
    variant === "secondary" &&
      "border border-border bg-surface text-foreground hover:bg-background",
  );
}

export function AddPatientModal({
  isSaving,
  onClose,
  onSubmit,
  open,
  therapists,
}: {
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: PatientCreateValues) => Promise<void>;
  open: boolean;
  therapists: TherapistRow[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [diagnosisMode, setDiagnosisMode] = useState<"select" | "custom">("select");

  const {
    handleSubmit,
    register,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<PatientCreateFormInput, undefined, PatientCreateValues>({
    resolver: zodResolver(patientCreateSchema),
    defaultValues: {
      age: null,
      assigned_therapist: "",
      diagnosis: "",
      gender: "",
      name: "",
      phone: "",
      status: "active",
    },
  });

  const selectedDiagnosis = watch("diagnosis");

  useEffect(() => {
    if (!open) {
      reset({
        age: null,
        assigned_therapist: "",
        diagnosis: "",
        gender: "",
        name: "",
        phone: "",
        status: "active",
      });
      setStep(1);
      setDiagnosisMode("select");
    }
  }, [open, reset]);

  if (!open) return null;

  async function handleContinue() {
    const valid = await trigger(["name", "phone"]);
    if (valid) setStep(2);
  }

  function handleDiagnosisSelect(value: string) {
    if (value === "__other__") {
      setDiagnosisMode("custom");
      setValue("diagnosis", "");
    } else {
      setDiagnosisMode("select");
      setValue("diagnosis", value, { shouldValidate: true });
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close add patient dialog"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <section className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {step === 1 ? "New Patient" : "Clinical Details"}
                </h3>
                <div className="flex gap-1">
                  <span className={cn("h-1.5 w-6 rounded-full", step === 1 ? "bg-primary" : "bg-primary/30")} />
                  <span className={cn("h-1.5 w-6 rounded-full", step === 2 ? "bg-primary" : "bg-border")} />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {step === 1
                  ? "Enter basic info to register the patient."
                  : "Add clinical details — the therapist can update these after assessment."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 ? (
              <div className="space-y-4 px-5 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Full Name
                    <input
                      {...register("name")}
                      type="text"
                      placeholder="Patient name"
                      autoFocus
                      className={fieldClassName(Boolean(errors.name))}
                    />
                    {errors.name?.message ? (
                      <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Phone
                    <input
                      {...register("phone")}
                      type="text"
                      placeholder="01XXXXXXXXX"
                      className={fieldClassName(Boolean(errors.phone))}
                    />
                    {errors.phone?.message ? (
                      <span className="mt-1 block text-xs text-danger">{errors.phone.message}</span>
                    ) : null}
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={cn(actionButtonClassName("secondary"), "text-muted-foreground")}
                  >
                    {isSaving ? "Adding..." : "Quick add (no clinical)"}
                  </button>
                  <button
                    type="button"
                    onClick={handleContinue}
                    className={actionButtonClassName("primary")}
                  >
                    Add clinical details →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-5 py-5">
                {/* Diagnosis */}
                <div>
                  <p className="text-sm font-medium text-foreground">Diagnosis</p>
                  {diagnosisMode === "select" ? (
                    <select
                      value={selectedDiagnosis && COMMON_DIAGNOSES.includes(selectedDiagnosis) ? selectedDiagnosis : ""}
                      onChange={(e) => handleDiagnosisSelect(e.target.value)}
                      className={cn(fieldClassName(false))}
                    >
                      <option value="">Select a condition...</option>
                      {COMMON_DIAGNOSES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      <option value="__other__">Other (type below)</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        {...register("diagnosis")}
                        type="text"
                        placeholder="Type diagnosis..."
                        autoFocus
                        className={cn(fieldClassName(false), "flex-1")}
                      />
                      <button
                        type="button"
                        onClick={() => { setDiagnosisMode("select"); setValue("diagnosis", ""); }}
                        className="mt-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-background"
                      >
                        ← List
                      </button>
                    </div>
                  )}
                </div>

                {/* Age + Gender */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Age
                    <input
                      {...register("age")}
                      type="number"
                      min={0}
                      placeholder="Optional"
                      className={fieldClassName(Boolean(errors.age))}
                      onChange={(e) => {
                        const v = e.target.value;
                        setValue("age", v === "" ? null : Number(v), { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {errors.age?.message ? (
                      <span className="mt-1 block text-xs text-danger">{errors.age.message}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    Gender
                    <select {...register("gender")} className={fieldClassName(false)}>
                      <option value="">Prefer not to say</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>

                {/* Therapist */}
                <label className="text-sm font-medium text-foreground">
                  Assigned Therapist
                  <select {...register("assigned_therapist")} className={fieldClassName(false)}>
                    <option value="">Unassigned</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={actionButtonClassName("secondary")}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={actionButtonClassName("primary")}
                  >
                    {isSaving ? "Adding..." : "Add Patient"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Update `src/pages/Patients.tsx` — swap imports and remove local modal**

At the top of `Patients.tsx`, remove the imports that are no longer needed locally and add the import for the shared component. Find the existing import block and make these changes:

Remove from the import section (these types are now internal to the modal):
```ts
// these lines come from the file — locate and remove them:
// const COMMON_DIAGNOSES = [ ... ]   (the 12-item array, lines ~78-92)
// const patientCreateSchema = z.object({ ... })   (lines ~99-107)
// type PatientCreateFormInput = ...   (line ~109)
// type PatientCreateValues = ...      (line ~111)
// function AddPatientModal({ ... }) { ... }   (the entire function, lines ~115-376)
```

Add this import near the top (after the existing hook imports):
```ts
import { AddPatientModal, type PatientCreateValues } from "@/components/patients/AddPatientModal";
```

Also remove `z` from imports if it's no longer used elsewhere in the file. Check — `patientEditSchema` still uses `z`, so keep it.

- [ ] **Step 3: Verify `Patients.tsx` still compiles**

Run:
```bash
cd "d:/CODE/Physio os" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `AddPatientModal` or `PatientCreateValues`.

- [ ] **Step 4: Verify in browser**

Navigate to `/patients`. Click "Add Patient". The modal should open with both steps working correctly. Therapist dropdown should populate. Submitting should create a patient.

- [ ] **Step 5: Commit**

```bash
git add src/components/patients/AddPatientModal.tsx src/pages/Patients.tsx
git commit -m "refactor: extract AddPatientModal to shared component"
```

---

## Task 3: Rewrite ReceptionistDashboard

**Files:**
- Modify: `src/pages/dashboards/ReceptionistDashboard.tsx`

Full rewrite. Patient search + add at top, patient list as primary content, today's schedule in a sidebar (desktop) or collapsible section (mobile).

- [ ] **Step 1: Replace the entire file content**

Replace `src/pages/dashboards/ReceptionistDashboard.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { ChevronDown, Search, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { AddPatientModal, type PatientCreateValues } from "@/components/patients/AddPatientModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useDashboard } from "@/hooks/useDashboard";
import { usePatients } from "@/hooks/usePatients";
import { useTherapists } from "@/hooks/useTherapists";
import { cn } from "@/lib/utils";
import type { CreatePatientInput } from "@/hooks/usePatients";
import type { DashboardAppointmentItem } from "@/types";

export function ReceptionistDashboard() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  const { patients, isLoading: patientsLoading, error: patientsError, createPatient } = usePatients();
  const { data: dash, isLoading: scheduleLoading } = useDashboard();
  const { therapists } = useTherapists();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 10);
    return patients
      .filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
      .slice(0, 20);
  }, [patients, search]);

  const remaining = dash.appointments.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed",
  ).length;

  async function handleAddPatient(values: PatientCreateValues) {
    setIsSaving(true);
    const input: CreatePatientInput = {
      age: values.age ?? null,
      assigned_therapist: values.assigned_therapist || null,
      diagnosis: values.diagnosis || null,
      gender: values.gender || null,
      name: values.name,
      phone: values.phone,
      status: values.status,
    };
    const { error } = await createPatient(input);
    setIsSaving(false);
    if (error) {
      toast({ title: "Could not add patient", description: error, variant: "error" });
      return;
    }
    toast({ title: "Patient added", description: "Record is now in your clinic list.", variant: "success" });
    setIsAddOpen(false);
  }

  return (
    <div className="space-y-4">

      {/* ── SEARCH + ADD ─────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients by name or phone..."
            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Patient</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* ── MAIN GRID: 1-col mobile, 2-col desktop ──────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-4 lg:items-start">

        {/* ── PATIENT LIST ──────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {search.trim() ? `Results for "${search.trim()}"` : "Recent Patients"}
            </p>
            {!search.trim() && (
              <Link
                to="/patients"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            )}
          </div>

          {patientsLoading ? (
            <PatientListSkeleton />
          ) : patientsError ? (
            <p className="px-5 py-8 text-center text-sm text-danger">{patientsError}</p>
          ) : filtered.length === 0 ? (
            <PatientEmptyState
              hasSearch={Boolean(search.trim())}
              onAdd={() => setIsAddOpen(true)}
            />
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((patient) => (
                <PatientListRow
                  key={patient.id}
                  id={patient.id}
                  name={patient.name}
                  phone={patient.phone}
                  status={patient.status ?? "active"}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── TODAY'S SCHEDULE — desktop sidebar ────────────────── */}
        <div className="hidden lg:block">
          <SchedulePanel
            appointments={dash.appointments}
            isLoading={scheduleLoading}
            remaining={remaining}
          />
        </div>

        {/* ── TODAY'S SCHEDULE — mobile collapsible ─────────────── */}
        <div className="mt-4 lg:hidden">
          <button
            type="button"
            onClick={() => setScheduleExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-white px-5 py-3 text-left shadow-card"
          >
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Today's Schedule
              {remaining > 0 && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-sky-700">
                  {remaining} left
                </span>
              )}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                scheduleExpanded && "rotate-180",
              )}
            />
          </button>
          {scheduleExpanded && (
            <div className="mt-2 rounded-xl border border-border bg-white shadow-card overflow-hidden">
              <SchedulePanel
                appointments={dash.appointments}
                isLoading={scheduleLoading}
                remaining={remaining}
                showHeader={false}
              />
            </div>
          )}
        </div>

      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="h-4 lg:hidden" />

      <AddPatientModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddPatient}
        isSaving={isSaving}
        therapists={therapists}
      />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function PatientListRow({
  id,
  name,
  phone,
  status,
}: {
  id: string;
  name: string;
  phone: string;
  status: string;
}) {
  const tone =
    status === "active" ? "green" :
    status === "completed" ? "blue" :
    status === "dropped" ? "red" : "gray";

  return (
    <Link
      to={`/patients/${id}`}
      className="flex min-h-[3.25rem] items-center gap-4 px-5 py-3 transition-colors hover:bg-background"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{phone}</p>
      </div>
      <StatusBadge label={status} tone={tone as "green" | "blue" | "red" | "gray"} />
    </Link>
  );
}

function PatientListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-36 animate-pulse rounded bg-border" />
            <div className="h-3 w-24 animate-pulse rounded bg-border/60" />
          </div>
          <div className="h-5 w-14 animate-pulse rounded-full bg-border/60" />
        </div>
      ))}
    </div>
  );
}

function PatientEmptyState({
  hasSearch,
  onAdd,
}: {
  hasSearch: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <UserPlus className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {hasSearch ? "No patients match your search." : "No patients yet."}
      </p>
      {!hasSearch && (
        <button
          type="button"
          onClick={onAdd}
          className="text-sm font-medium text-primary hover:underline"
        >
          Add the first patient →
        </button>
      )}
    </div>
  );
}

function SchedulePanel({
  appointments,
  isLoading,
  remaining,
  showHeader = true,
}: {
  appointments: DashboardAppointmentItem[];
  isLoading: boolean;
  remaining: number;
  showHeader?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today's Schedule
          </p>
          {remaining > 0 && (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {remaining} left
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-border" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No appointments today.
        </p>
      ) : (
        <>
          <div className="divide-y divide-border">
            {appointments.slice(0, 8).map((appt) => (
              <ScheduleRow key={`${appt.patientId}-${appt.time}`} appointment={appt} />
            ))}
          </div>
          <div className="border-t border-border px-4 py-2.5 text-right">
            <Link
              to="/appointments"
              className="text-xs font-medium text-primary hover:underline"
            >
              View full schedule →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleRow({ appointment }: { appointment: DashboardAppointmentItem }) {
  const tone =
    appointment.status === "completed" ? "green" :
    appointment.status === "missed" ? "red" :
    appointment.status === "cancelled" ? "gray" : "blue";

  return (
    <Link
      to={`/patients/${appointment.patientId}`}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-background"
    >
      <span className="shrink-0 rounded bg-primary/8 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
        {appointment.time}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {appointment.patientName}
      </span>
      <StatusBadge label={appointment.status} tone={tone} />
    </Link>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "d:/CODE/Physio os" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Verify in browser as receptionist**

1. Log in as receptionist.
2. Dashboard should load showing search bar + "Add Patient" button at top.
3. Patient list below should show up to 10 recent patients (or empty state).
4. Click "Add Patient" → modal opens with therapist dropdown populated.
5. Complete the form → patient appears in list.
6. Type in search box → list filters live.
7. On mobile (resize to 375px): schedule section collapsed by default, tap chevron to expand.
8. On desktop (lg+): schedule visible in right sidebar.

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboards/ReceptionistDashboard.tsx
git commit -m "feat: patient-centric receptionist dashboard with search and schedule sidebar"
```
