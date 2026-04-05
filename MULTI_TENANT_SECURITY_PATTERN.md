# Multi-Tenant Security Pattern

## Overview
This document describes the security pattern implemented for clinic data isolation in Physio OS. Use this as the template for all domain hooks (Appointments, Patients, Therapists, Leads, Billing, SessionNotes).

---

## Three Layers of Security

### Layer 1: Server-Side RLS Policies (Database)
**File**: `supabase/schema.sql`

RLS policies defined on every table automatically:
- Check if user is active member of clinic_id
- Enforce role-based permissions (clinic_admin, therapist, receptionist)
- Example policy:
  ```sql
  create policy therapists_select on therapists
    for select to authenticated
    using (is_active_clinic_member(clinic_id));
  ```

**Why this matters**: Prevents SQL-level data leaks even if client sends wrong clinic_id.

---

### Layer 2: Client-Side Clinic Filtering (Hook)
**Pattern**: Add to all hooks via `useAuth()`

```typescript
// Get clinic context from auth
const { clinicId, clinicId, isDemoMode, role } = useAuth();

// Filter all Supabase queries by clinic_id
const query = supabase
  .from("table_name")
  .select("...")
  .eq("clinic_id", clinicId) // ← REQUIRED
  .order("created_at", { ascending: false });
```

**Why this matters**: 
- Reduces server load (don't fetch all clinics' data, then filter)
- Prevents accidental UI data leaks (wrong clinic shown before RLS blocks)
- Explicit intent

---

### Layer 3: Role-Based Filtering (Hook)
**Pattern**: Filter demo + Supabase results by user role

```typescript
// therapist: sees only their own appointments/patients
if (role === "therapist" && linkedTherapistId) {
  const filtered = data.filter(item => 
    item.therapist_id === linkedTherapistId ||
    item.assigned_therapist === linkedTherapistId
  );
}

// admin/receptionist: sees all clinic data (within clinic_id scope)
```

**Why this matters**: 
- Therapist shouldn't see colleagues' data in UI
- Clarifies permission model in code
- Works in demo mode (where RLS doesn't exist)

---

## Implementation Checklist

When converting a domain hook, follow this checklist:

### 1. Add `clinicId` to imports
```typescript
const { clinicId, isDemoMode, role } = useAuth();
```

### 2. Add clinic_id check before queries
```typescript
if (!clinicId) {
  setState({
    error: "No clinic context",
    isLoading: false,
    data: [],
  });
  return;
}
```

### 3. Add clinic filtering to all reads
```typescript
.eq("clinic_id", clinicId)
```

### 4. Add clinic_id to all writes
```typescript
const payload = {
  clinic_id: clinicId, // ← Required on INSERT
  ...otherFields,
};
```

### 5. Add double-check on updates
```typescript
.eq("id", recordId)
.eq("clinic_id", clinicId) // ← Double-check
```

### 6. Add role filtering (if applicable)
```typescript
if (role === "therapist" && linkedTherapistId) {
  filtered = data.filter(item => 
    item.therapist_id === linkedTherapistId ||
    item.assigned_therapist === linkedTherapistId
  );
}
```

### 7. Add comments marking security points
```typescript
// SECURITY: Filter by current clinic
.eq("clinic_id", clinicId)

// SECURITY: Permission check
if (!can("manage_patients")) return error;

// SECURITY: Therapist can only update their own
if (role === "therapist" && appointment.therapist_id !== linkedTherapistId) {
  return error;
}
```

---

## Files to Update (After Appointments/Patients/Therapists)

1. **useLeads.ts**
   - Add clinic_id filtering
   - Only clinic_admin + receptionist can manage

2. **useBilling.ts**
   - Add clinic_id filtering
   - Only clinic_admin + receptionist can view
   - Must check clinic_id on payments

3. **useSessionNotes.ts**
   - Add clinic_id filtering
   - Therapist can only write/read own notes
   - Admin can read all

4. **useDashboard.ts**
   - Add clinic_id filtering
   - Calculate stats per-clinic only

5. **useAnalytics.ts**
   - Add clinic_id filtering
   - Only admin can view

---

## Testing Security

### Test Checklist
- [ ] Log in as therapist → should NOT see other therapists' appointments
- [ ] Log in as receptionist → should see all clinic appointments
- [ ] Try to manually access another clinic's data via URL → denied by RLS
- [ ] Try to swap clinicId in IndexedDB → data mismatch caught by RLS
- [ ] Create appointment for wrong therapist → clinic_id mismatch fails
- [ ] Update patient from another clinic → .eq("clinic_id", clinicId) blocks

---

## Security Audit Checklist

Before deploying clinic tenant features:

- [ ] All data hooks have clinic_id filtering
- [ ] All mutations include clinic_id in payload
- [ ] All updates double-check .eq("clinic_id", clinicId)
- [ ] Role-based filtering applied where needed
- [ ] Permission checks (can()) guard mutations
- [ ] Demo mode and Supabase mode both handle clinic context
- [ ] Database RLS policies enabled on all tables
- [ ] Team.members list only shows active members from clinic
- [ ] Invite link is clinic-scoped (points to correct clinic_id)

---

## Reference: Secure Hook Template

See these files as templates:
- `src/hooks/useAppointments.SECURE.ts`
- `src/hooks/usePatients.SECURE.ts`
- `src/hooks/useTherapists.SECURE.ts`

Copy the pattern from one of these to other hooks.

---

## Common Mistakes to Avoid

❌ **Missing clinic_id check**
```typescript
// WRONG: No clinic context check
const { data } = await supabase.from("appointments").select("*");
```

✅ **Correct: Check clinic_id before querying**
```typescript
if (!clinicId) return error;
const { data } = await supabase
  .from("appointments")
  .select("*")
  .eq("clinic_id", clinicId);
```

---

❌ **Filtering only in UI**
```typescript
// WRONG: Filtered after fetch (too late)
const allData = await fetch();
const filtered = allData.filter(d => d.clinic_id === clinicId);
```

✅ **Correct: Filter at database level**
```typescript
// RIGHT: Filtered before fetch
const filtered = await supabase
  .from("table")
  .select()
  .eq("clinic_id", clinicId);
```

---

❌ **Forgetting clinic_id on writes**
```typescript
// WRONG: No clinic_id on insert
const insert = {
  name: "Dr. Smith",
  phone: "123456789",
  // Missing: clinic_id
};
```

✅ **Correct: Always include clinic_id**
```typescript
const insert = {
  clinic_id: clinicId, // ← Always
  name: "Dr. Smith",
  phone: "123456789",
};
```

---

## Deployment Runbook

1. **Convert hooks in order**:
   - useAppointments ✓ (done)
   - usePatients ✓ (done)
   - useTherapists ✓ (done)
   - useLeads
   - useBilling
   - useSessionNotes

2. **Test each hook**:
   - Run test checklist above
   - Verify RLS blocks cross-clinic access

3. **Deploy invite system**:
   - InviteStaffModal component
   - AcceptInvite page
   - Update Settings with invite button

4. **QA multi-tenant flow**:
   - Create Clinic A with admin
   - Invite staff to Clinic A
   - Create Clinic B independently
   - Verify Clinic A staff can't see Clinic B data
   - Verify Clinic B admin can't see Clinic A staff

---

## Questions?

If a hook needs multi-tenant security, follow the pattern in `.SECURE.ts` files and check this doc.
