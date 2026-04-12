# Super Admin Tenant Data Access

**Date:** 2026-04-12  
**Status:** Approved

## Context

The super admin panel currently shows only aggregate counts per tenant (total patients, therapists, appointments, active treatment plans) on the tenant detail page. There is no way to browse the actual records inside a tenant.

This feature gives the super admin read-only access to view patients, appointments, therapists, and treatment plans within any tenant, without modifying existing RLS policies or tenant isolation.

## Approach

Option A: 4 new `SECURITY DEFINER` RPC functions + tab UI on the existing tenant detail page.

Follows the established `sa_*` RPC pattern already used for `sa_platform_stats`, `sa_list_tenants`, `sa_tenant_detail`, `sa_update_subscription`.

---

## Backend

### Migration file
`supabase/migrations/20260412_super_admin_tenant_data.sql`

All functions call `PERFORM _sa_check_access()` first (existing helper that raises if caller is not the super admin email).

### `sa_list_patients(p_clinic_id UUID)`
Returns rows from `patients` LEFT JOINed with `therapists` for the assigned therapist name.

Columns returned:
- `id, name, phone, age, gender, diagnosis, status`
- `total_sessions, completed_sessions`
- `assigned_therapist_name` (from therapists.name)
- `created_at`

Ordered by `created_at DESC`.

### `sa_list_therapists(p_clinic_id UUID)`
Returns rows from `therapists` for the given clinic.

Columns returned:
- `id, name, phone, specialization, status, created_at`

Ordered by `created_at DESC`.

### `sa_list_appointments(p_clinic_id UUID)`
Returns rows from `appointments` JOINed with `patients.name` and `therapists.name`.

Columns returned:
- `id, patient_name, therapist_name`
- `scheduled_at, status, duration_mins, session_number, notes`
- `created_at`

Ordered by `scheduled_at DESC`.

### `sa_list_treatment_plans(p_clinic_id UUID)`
Returns rows from `treatment_plans` JOINed with `patients.name` and `therapists.name`.

Columns returned:
- `id, patient_name, therapist_name`
- `diagnosis, status`
- `total_sessions, completed_sessions`
- `fee_per_session, total_fee`
- `started_at, created_at`

Ordered by `created_at DESC`.

---

## Frontend

### Hook updates — `src/hooks/useSuperAdmin.ts`

Add 4 new hooks following the existing `useTenantDetail` pattern (`{ data, isLoading, error }`):

- `useTenantPatients(clinicId: string)`
- `useTenantTherapists(clinicId: string)`
- `useTenantAppointments(clinicId: string)`
- `useTenantTreatmentPlans(clinicId: string)`

Each fetches only when `clinicId` is truthy. Each calls the corresponding `sa_list_*` RPC.

### Tenant detail page — `src/pages/super-admin/SuperAdminTenantDetail.tsx`

Add a tab bar below the clinic header with 5 tabs:

| Tab | Content |
|-----|---------|
| Overview | Existing content (stats cards + subscription management) — unchanged |
| Patients | Table: Name, Phone, Age, Gender, Diagnosis, Therapist, Status, Sessions (completed/total) |
| Appointments | Table: Patient, Therapist, Scheduled At, Status, Duration, Session # |
| Therapists | Table: Name, Phone, Specialization, Status |
| Treatment Plans | Table: Patient, Therapist, Diagnosis, Status, Sessions, Fee/Session, Total Fee |

**Tab behaviour:**
- Active tab stored in local state (default: Overview)
- Each non-Overview tab fetches its data on first activation (lazy)
- Loading state: spinner while fetching
- Empty state: "No records found" message
- Error state: error message if RPC fails

---

## TypeScript Types

Add interfaces to `src/types/index.ts`:

```ts
export interface SAPatientRow {
  id: string
  name: string
  phone: string
  age: number | null
  gender: string | null
  diagnosis: string | null
  status: string
  total_sessions: number
  completed_sessions: number
  assigned_therapist_name: string | null
  created_at: string
}

export interface SATherapistRow {
  id: string
  name: string
  phone: string | null
  specialization: string | null
  status: string
  created_at: string
}

export interface SAAppointmentRow {
  id: string
  patient_name: string
  therapist_name: string
  scheduled_at: string
  status: string
  duration_mins: number
  session_number: number | null
  notes: string | null
  created_at: string
}

export interface SATreatmentPlanRow {
  id: string
  patient_name: string
  therapist_name: string
  diagnosis: string | null
  status: string
  total_sessions: number | null
  completed_sessions: number
  fee_per_session: number | null
  total_fee: number | null
  started_at: string | null
  created_at: string
}
```

---

## Verification

1. Apply the migration to Supabase (`supabase/migrations/20260412_super_admin_tenant_data.sql`)
2. Log in as super admin (`majedulhoqueofficials@gmail.com`)
3. Navigate to any tenant detail page
4. Click each tab (Patients, Appointments, Therapists, Treatment Plans)
   - Confirm data loads and matches the clinic's records
   - Confirm spinner shows while loading
   - Confirm empty state for a clinic with no data
5. Attempt to call `sa_list_patients` as a non-super-admin user via Supabase client — expect `Access denied: not a super admin` error
