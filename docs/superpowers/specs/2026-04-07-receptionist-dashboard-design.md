# Receptionist Dashboard — Design Spec
**Date:** 2026-04-07  
**Status:** Approved by user (approach B selected)

---

## Problem

Two failures reported on the receptionist account:

1. **"Could not add patient — No clinic context"** — `AuthContext.loadUserData` resolves `clinicId` via `user_profiles.default_clinic_id` or `clinic_memberships.clinic_id`. When RLS blocks the `clinics` table query (or the `clinic_memberships` query returns empty), `clinicId` → `null`. The JWT `app_metadata.clinic_id` set by the `create-staff-member` edge function is never used as a fallback.

2. **Therapist dropdown shows only "Unassigned"** — downstream of the same bug. `useTherapists` bails with empty array when `clinicId` is null.

3. **Dashboard is schedule-centric** — The receptionist's primary job is patient intake, not schedule watching. The current time-spine layout is wrong for that workflow.

---

## Fix 1 — AuthContext JWT Fallback

**File:** `src/contexts/AuthContext.tsx`

Change `loadUserData(userId: string)` to `loadUserData(userId: string, jwtClinicId?: string)`.

Inside the function, after computing `resolvedClinicId`:
```ts
const resolvedClinicId =
  resolvedProfile?.default_clinic_id ??
  preferredMembership?.clinic_id ??
  jwtClinicId ??   // ← NEW: JWT app_metadata fallback
  null;
```

At each call site, pass `session.user.app_metadata?.clinic_id as string | undefined`:
- `supabase.auth.getSession()` callback
- `supabase.auth.onAuthStateChange()` callback

This ensures staff accounts created via `create-staff-member` (which correctly sets `app_metadata.clinic_id`) get a resolved `clinicId` even if RLS blocks the DB queries.

No other auth logic changes.

---

## Fix 2 — Receptionist Dashboard Redesign (Approach B: Patient-Centric Hub)

**Files changed:**
- `src/pages/dashboards/ReceptionistDashboard.tsx` — full rewrite
- `src/pages/Patients.tsx` — extract `AddPatientModal` to shared component
- `src/components/patients/AddPatientModal.tsx` — new shared component (extracted, not new logic)

### Layout

**Desktop (lg+): 2-column grid**
```
┌─────────────────────────────────────────────────┐
│ [🔍 Search patients...] [+ Add Patient (primary)]│
├───────────────────────────┬─────────────────────┤
│ PATIENTS                  │ TODAY'S SCHEDULE     │
│ ─────────────────────     │ ─────────────────    │
│ [Patient card]            │ Remaining: 3 left    │
│ [Patient card]            │ ─────────────────    │
│ [Patient card]            │ 09:00 Farhana Rahman │
│ [Patient card]            │ 10:00 Mehedi Hasan   │
│ [Patient card]            │ 02:00 Sharmeen Akter │
│ [View all patients →]     │ [View full schedule] │
└───────────────────────────┴─────────────────────┘
```

**Mobile: single column**
```
[🔍 Search patients...]
[+ Add Patient (full-width)]
[Patient cards — vertical list]
[Today's Schedule — collapsed section]
[spacer for bottom nav]
```

### Patient Section (left/main)
- Powered by `usePatients()` hook
- Controlled search input — filters `patients` array client-side by name/phone
- Shows last 10 patients by default (ordered by `created_at DESC`, already from hook)
- Each card: name, phone, status badge, "View" link → `/patients/:id`
- Empty state: "No patients yet" with "Add Patient" CTA
- Loading: skeleton cards (3 rows)
- Error (no clinic context): show inline error banner, not broken UI

### Today's Schedule (right/sidebar on desktop, bottom section on mobile)
- Powered by `useDashboard()` hook (appointments only)
- Compact: just time + patient name + status badge, no therapist line (saves space)
- Remaining count chip at top
- "View full schedule →" link to `/appointments`
- Max 8 rows shown; no scroll — just shows first 8, link covers the rest
- On mobile: collapsible section with chevron, collapsed by default

### Add Patient
- `AddPatientModal` extracted from `Patients.tsx` into `src/components/patients/AddPatientModal.tsx`
- Same 2-step form, no logic changes
- Used from both `ReceptionistDashboard` and `Patients.tsx`
- Triggered by "+ Add Patient" button (desktop sidebar CTA + mobile full-width button)
- On success: `refreshPatients()` re-fetches list in place

### Mobile-specific
- Search bar full-width, sticky below header
- "+ Add Patient" button full-width below search
- Patient list scrolls naturally
- Today's Schedule is a collapsible card at bottom
- Remove existing sticky bottom action bar (Walk-in / Reschedule / Payment) — these were schedule-centric; replaced by Add Patient at top

---

## Out of Scope
- Reschedule action (exists at `/appointments`)
- Record Payment action (exists at `/billing`)
- Walk-in booking modal (links to `/appointments` are sufficient for now)
- Patient editing from dashboard
- Pagination (top-10 + link is sufficient for receptionist workflow)
