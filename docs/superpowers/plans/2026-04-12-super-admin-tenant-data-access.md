# Super Admin Tenant Data Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the super admin read-only access to browse patients, appointments, therapists, and treatment plans within any tenant via tabs on the existing tenant detail page.

**Architecture:** Four new `SECURITY DEFINER` RPC functions in a new migration file bypass RLS for the super admin only. Four new hooks in `useSuperAdmin.ts` call these RPCs. `SuperAdminTenantDetail.tsx` gains a 5-tab layout — Overview (existing content unchanged) plus one tab per data type, each lazy-loaded on first activation.

**Tech Stack:** PostgreSQL (Supabase RPC), React, TypeScript, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260412_super_admin_tenant_data.sql` | Create | 4 new `sa_list_*` SECURITY DEFINER RPCs |
| `src/types/index.ts` | Modify | Add 4 new SA row interfaces |
| `src/hooks/useSuperAdmin.ts` | Modify | Add 4 new `useTenant*` hooks |
| `src/pages/super-admin/SuperAdminTenantDetail.tsx` | Modify | Add 5-tab layout; existing content moves to Overview tab |

---

## Task 1: Add TypeScript Types

**Files:**
- Modify: `src/types/index.ts` (append at end of file)

- [ ] **Step 1: Append the 4 new SA interfaces to `src/types/index.ts`**

Add at the very end of the file:

```ts
export interface SAPatientRow {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  diagnosis: string | null;
  status: string;
  total_sessions: number;
  completed_sessions: number;
  assigned_therapist_name: string | null;
  created_at: string;
}

export interface SATherapistRow {
  id: string;
  name: string;
  phone: string | null;
  specialization: string | null;
  status: string;
  created_at: string;
}

export interface SAAppointmentRow {
  id: string;
  patient_name: string;
  therapist_name: string;
  scheduled_at: string;
  status: string;
  duration_mins: number;
  session_number: number | null;
  notes: string | null;
  created_at: string;
}

export interface SATreatmentPlanRow {
  id: string;
  patient_name: string;
  therapist_name: string;
  diagnosis: string | null;
  status: string;
  total_sessions: number | null;
  completed_sessions: number;
  fee_per_session: number | null;
  total_fee: number | null;
  started_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add SA tenant data row types"
```

---

## Task 2: Write the Supabase Migration

**Files:**
- Create: `supabase/migrations/20260412_super_admin_tenant_data.sql`

- [ ] **Step 1: Create the migration file with all 4 RPC functions**

Create `supabase/migrations/20260412_super_admin_tenant_data.sql` with the following content:

```sql
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
```

- [ ] **Step 2: Apply the migration to Supabase**

Run in the Supabase SQL editor or via CLI:
```bash
supabase db push
```
Or paste the file contents into the Supabase dashboard SQL editor and run it.

Expected: No errors. All 4 functions created/replaced.

- [ ] **Step 3: Verify RPCs exist**

In Supabase SQL editor run:
```sql
select routine_name from information_schema.routines
where routine_name like 'sa_list_%';
```
Expected output — 4 rows:
```
sa_list_patients
sa_list_therapists
sa_list_appointments
sa_list_treatment_plans
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260412_super_admin_tenant_data.sql
git commit -m "feat: add sa_list_* RPCs for super admin tenant data browsing"
```

---

## Task 3: Add Hooks to useSuperAdmin.ts

**Files:**
- Modify: `src/hooks/useSuperAdmin.ts`

The existing pattern is: `useEffect` + `useCallback` + `useState` for `{ data, isLoading, error }`. Follow it exactly.

- [ ] **Step 1: Add imports for new types at the top of `src/hooks/useSuperAdmin.ts`**

The file already imports from `@/lib/supabase`. Add the new types to the existing import block. Change:

```ts
import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/lib/supabase";
```

To:

```ts
import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/lib/supabase";
import type {
  SAPatientRow,
  SATherapistRow,
  SAAppointmentRow,
  SATreatmentPlanRow,
} from "@/types";
```

- [ ] **Step 2: Append 4 new hooks at the end of `src/hooks/useSuperAdmin.ts`**

Add after the last export in the file (after `updateSubscription`):

```ts
export function useTenantPatients(clinicId: string | undefined) {
  const [data, setData] = useState<SAPatientRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_patients", { p_clinic_id: clinicId })
      .then(({ data: rows, error: err }: { data: SAPatientRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { data, isLoading, error, fetch };
}

export function useTenantTherapists(clinicId: string | undefined) {
  const [data, setData] = useState<SATherapistRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_therapists", { p_clinic_id: clinicId })
      .then(({ data: rows, error: err }: { data: SATherapistRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { data, isLoading, error, fetch };
}

export function useTenantAppointments(clinicId: string | undefined) {
  const [data, setData] = useState<SAAppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_appointments", { p_clinic_id: clinicId })
      .then(({ data: rows, error: err }: { data: SAAppointmentRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { data, isLoading, error, fetch };
}

export function useTenantTreatmentPlans(clinicId: string | undefined) {
  const [data, setData] = useState<SATreatmentPlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_treatment_plans", { p_clinic_id: clinicId })
      .then(({ data: rows, error: err }: { data: SATreatmentPlanRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { data, isLoading, error, fetch };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSuperAdmin.ts
git commit -m "feat: add useTenant* hooks for SA tenant data browsing"
```

---

## Task 4: Refactor SuperAdminTenantDetail with Tabs

**Files:**
- Modify: `src/pages/super-admin/SuperAdminTenantDetail.tsx`

This is a full replacement of the file content. The existing content (stats cards + subscription management) becomes the Overview tab. Four new tabs are added: Patients, Appointments, Therapists, Treatment Plans. Each tab fetches lazily on first click via its hook's `fetch()` function.

- [ ] **Step 1: Replace the full content of `src/pages/super-admin/SuperAdminTenantDetail.tsx`**

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Stethoscope,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { SAStatCard } from "@/components/super-admin/SAStatCard";
import {
  useTenantDetail,
  updateSubscription,
  useTenantPatients,
  useTenantTherapists,
  useTenantAppointments,
  useTenantTreatmentPlans,
} from "@/hooks/useSuperAdmin";

type Tab = "overview" | "patients" | "appointments" | "therapists" | "plans";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "patients", label: "Patients" },
  { id: "appointments", label: "Appointments" },
  { id: "therapists", label: "Therapists" },
  { id: "plans", label: "Treatment Plans" },
];

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
    </div>
  );
}

function TabEmpty() {
  return (
    <p className="py-12 text-center text-sm text-gray-400">No records found.</p>
  );
}

function TabError({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-sm text-red-500">{message}</p>
  );
}

export function SuperAdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { detail, isLoading, error, refetch } = useTenantDetail(id);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [fetchedTabs, setFetchedTabs] = useState<Set<Tab>>(new Set());

  const patients = useTenantPatients(id);
  const therapists = useTenantTherapists(id);
  const appointments = useTenantAppointments(id);
  const plans = useTenantTreatmentPlans(id);

  const [planKey, setPlanKey] = useState<string>("");
  const [subStatus, setSubStatus] = useState<string>("");
  const [trialEnd, setTrialEnd] = useState<string>("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sub = detail?.subscription;
  if (sub && !planKey && !subStatus) {
    setTimeout(() => {
      setPlanKey(sub.plan_key ?? "starter");
      setSubStatus(sub.status ?? "trialing");
      setTrialEnd(sub.trial_ends_at?.split("T")[0] ?? "");
    }, 0);
  }

  function handleTabClick(tab: Tab) {
    setActiveTab(tab);
    if (tab === "overview" || fetchedTabs.has(tab)) return;
    setFetchedTabs((prev) => new Set(prev).add(tab));
    if (tab === "patients") patients.fetch();
    if (tab === "therapists") therapists.fetch();
    if (tab === "appointments") appointments.fetch();
    if (tab === "plans") plans.fetch();
  }

  async function handleUpdate(field: "plan" | "status" | "trial") {
    if (!id) return;
    setSaving(field);
    setSaveError(null);

    const params: Parameters<typeof updateSubscription>[0] = { clinic_id: id };
    if (field === "plan") params.plan_key = planKey;
    if (field === "status") params.status = subStatus;
    if (field === "trial") params.trial_end = trialEnd || null;

    const result = await updateSubscription(params);
    setSaving(null);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    refetch();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">{error ?? "Tenant not found"}</p>
        <button
          onClick={() => navigate("/super-admin/tenants")}
          className="mt-4 text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
        >
          Back to tenants
        </button>
      </div>
    );
  }

  const { clinic, owner, stats } = detail;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate("/super-admin/tenants")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tenants
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>Slug: {clinic.slug}</span>
          <span>Owner: {owner.full_name ?? owner.email ?? "—"}</span>
          {owner.email && <span>{owner.email}</span>}
          <span>
            Created:{" "}
            {clinic.created_at
              ? new Date(clinic.created_at).toLocaleDateString()
              : "—"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Usage Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SAStatCard icon={Users} label="Patients" value={stats.total_patients} />
            <SAStatCard icon={Stethoscope} label="Therapists" value={stats.total_therapists} />
            <SAStatCard icon={CalendarDays} label="Appointments" value={stats.total_appointments} />
            <SAStatCard icon={ClipboardList} label="Active Plans" value={stats.active_treatment_plans} />
          </div>

          {/* Subscription Management */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-6 text-base font-semibold text-gray-900">Subscription Management</h2>

            {saveError && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {saveError}
              </p>
            )}

            {!sub ? (
              <p className="text-gray-400">No subscription found for this clinic.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Plan */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Plan</label>
                  <div className="flex gap-2">
                    <select
                      value={planKey}
                      onChange={(e) => setPlanKey(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <button
                      onClick={() => handleUpdate("plan")}
                      disabled={saving === "plan"}
                      className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
                    >
                      {saving === "plan" ? "..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                  <div className="flex gap-2">
                    <select
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    >
                      <option value="trialing">Trialing</option>
                      <option value="active">Active</option>
                      <option value="past_due">Past Due</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="incomplete">Incomplete</option>
                    </select>
                    <button
                      onClick={() => handleUpdate("status")}
                      disabled={saving === "status"}
                      className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
                    >
                      {saving === "status" ? "..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Trial End */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Trial Ends</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={trialEnd}
                      onChange={(e) => setTrialEnd(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                    <button
                      onClick={() => handleUpdate("trial")}
                      disabled={saving === "trial"}
                      className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
                    >
                      {saving === "trial" ? "..." : "Save"}
                    </button>
                  </div>
                </div>

                {sub.current_period_start && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs text-gray-400">
                      Current period:{" "}
                      {new Date(sub.current_period_start).toLocaleDateString()} —{" "}
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString()
                        : "ongoing"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "patients" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Patients</h2>
          </div>
          {patients.isLoading ? (
            <TabSpinner />
          ) : patients.error ? (
            <TabError message={patients.error} />
          ) : patients.data.length === 0 ? (
            <TabEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Phone</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Age</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Gender</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Diagnosis</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Therapist</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {patients.data.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-3 text-gray-600">{p.phone}</td>
                      <td className="px-6 py-3 text-gray-600">{p.age ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{p.gender ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{p.diagnosis ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{p.assigned_therapist_name ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "active"
                            ? "bg-green-50 text-green-700"
                            : p.status === "completed"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{p.completed_sessions}/{p.total_sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Appointments</h2>
          </div>
          {appointments.isLoading ? (
            <TabSpinner />
          ) : appointments.error ? (
            <TabError message={appointments.error} />
          ) : appointments.data.length === 0 ? (
            <TabEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Patient</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Therapist</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Scheduled At</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Duration</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Session #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.data.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{a.patient_name}</td>
                      <td className="px-6 py-3 text-gray-600">{a.therapist_name}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {new Date(a.scheduled_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : a.status === "scheduled" || a.status === "confirmed"
                            ? "bg-blue-50 text-blue-700"
                            : a.status === "missed" || a.status === "cancelled"
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{a.duration_mins} min</td>
                      <td className="px-6 py-3 text-gray-600">{a.session_number ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "therapists" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Therapists</h2>
          </div>
          {therapists.isLoading ? (
            <TabSpinner />
          ) : therapists.error ? (
            <TabError message={therapists.error} />
          ) : therapists.data.length === 0 ? (
            <TabEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Phone</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Specialization</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {therapists.data.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-6 py-3 text-gray-600">{t.phone ?? "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{t.specialization ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "plans" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Treatment Plans</h2>
          </div>
          {plans.isLoading ? (
            <TabSpinner />
          ) : plans.error ? (
            <TabError message={plans.error} />
          ) : plans.data.length === 0 ? (
            <TabEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Patient</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Therapist</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Diagnosis</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Sessions</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Fee/Session</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Total Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plans.data.map((tp) => (
                    <tr key={tp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{tp.patient_name}</td>
                      <td className="px-6 py-3 text-gray-600">{tp.therapist_name}</td>
                      <td className="px-6 py-3 text-gray-600">{tp.diagnosis ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          tp.status === "active"
                            ? "bg-green-50 text-green-700"
                            : tp.status === "completed"
                            ? "bg-blue-50 text-blue-700"
                            : tp.status === "abandoned"
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {tp.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {tp.completed_sessions}/{tp.total_sessions ?? "?"}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {tp.fee_per_session != null ? `৳${tp.fee_per_session}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {tp.total_fee != null ? `৳${tp.total_fee}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/super-admin/SuperAdminTenantDetail.tsx
git commit -m "feat: add tenant data browsing tabs to super admin tenant detail page"
```

---

## Task 5: End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Log in as super admin**

Navigate to `http://localhost:5173/super-admin/login`. Sign in with `majedulhoqueofficials@gmail.com`.

- [ ] **Step 3: Open a tenant that has data**

Go to Tenants → click any clinic with patients/appointments.

- [ ] **Step 4: Verify Overview tab**

Overview tab should be active by default. Confirm stat cards and subscription management render identically to before.

- [ ] **Step 5: Click Patients tab**

Spinner should appear briefly, then a table with patient records. Confirm columns: Name, Phone, Age, Gender, Diagnosis, Therapist, Status, Sessions.

- [ ] **Step 6: Click Appointments tab**

Table with appointment records. Confirm columns: Patient, Therapist, Scheduled At, Status, Duration, Session #.

- [ ] **Step 7: Click Therapists tab**

Table with therapist records. Confirm columns: Name, Phone, Specialization, Status.

- [ ] **Step 8: Click Treatment Plans tab**

Table with treatment plan records. Confirm columns: Patient, Therapist, Diagnosis, Status, Sessions, Fee/Session, Total Fee.

- [ ] **Step 9: Test empty state**

Open a tenant with no patients. Click Patients tab — should show "No records found."

- [ ] **Step 10: Final commit if all clean**

```bash
git add -A
git commit -m "feat: super admin tenant data browsing — complete"
```
