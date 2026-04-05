import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMockClinic } from "@/contexts/MockClinicContext";
import { getVisiblePatients } from "@/lib/mockClinic";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { Database, PatientRow, PatientStatus } from "@/types";

export interface CreatePatientInput {
  age?: number | null;
  assigned_therapist?: string | null;
  diagnosis?: string | null;
  gender?: string | null;
  name: string;
  phone: string;
  status?: PatientStatus;
  total_sessions?: number | null;
}

export interface PatientMutationInput {
  assigned_therapist?: string | null;
  diagnosis?: string | null;
  status?: PatientStatus;
  total_sessions?: number | null;
}

interface PatientMutationResult {
  error: string | null;
  patientId?: string | null;
}

interface UsePatientsState {
  error: string | null;
  isLoading: boolean;
  patients: PatientRow[];
}

type PatientUpdate = Database["public"]["Tables"]["patients"]["Update"];
type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];

function normalizeOptionalText(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * SECURITY PATTERN: Multi-Tenant Patient Hook
 * 
 * 1. All Supabase queries filter by clinic_id from auth context
 * 2. RLS policies enforced server-side
 * 3. Role-based filtering:
 *    - therapist: sees only patients assigned to them
 *    - clinic_admin/receptionist: sees all clinic patients
 * 4. Mutations enforce clinic context and role permissions
 */
export function usePatients() {
  const { can, clinicId, isDemoMode, linkedTherapistId, role } = useAuth();
  const { createPatient: createMockPatient, data: mockData, updatePatient: updateMockPatient } =
    useMockClinic();
  const [state, setState] = useState<UsePatientsState>({
    error: null,
    isLoading: true,
    patients: [],
  });

  const demoPatients = useMemo(
    () =>
      getVisiblePatients(mockData, role, linkedTherapistId).sort((left, right) =>
        (right.created_at ?? "").localeCompare(left.created_at ?? ""),
      ),
    [mockData, role, linkedTherapistId],
  );

  const loadPatients = useCallback(async () => {
    if (isDemoMode) {
      setState({
        error: null,
        isLoading: false,
        patients: demoPatients,
      });
      return;
    }

    if (!supabase) {
      setState({
        error: supabaseConfigMessage,
        isLoading: false,
        patients: [],
      });
      return;
    }

    if (!clinicId) {
      setState({
        error: "No clinic context",
        isLoading: false,
        patients: [],
      });
      return;
    }

    let query = supabase
      .from("patients")
      .select("id, clinic_id, lead_id, name, phone, age, gender, diagnosis, assigned_therapist, total_sessions, completed_sessions, status, created_at")
      .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      setState({
        error: error.message,
        isLoading: false,
        patients: [],
      });
      return;
    }

    // SECURITY: Filter by role on client (in addition to RLS on server)
    const filtered = role === "therapist" && linkedTherapistId
      ? (data ?? []).filter(p => p.assigned_therapist === linkedTherapistId)
      : (data ?? []);

    setState({
      error: null,
      isLoading: false,
      patients: (filtered as PatientRow[]),
    });
  }, [clinicId, isDemoMode, demoPatients, linkedTherapistId, role]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (isDemoMode) {
        if (isActive) {
          setState({
            error: null,
            isLoading: false,
            patients: demoPatients,
          });
        }
        return;
      }

      if (!supabase) {
        if (isActive) {
          setState({
            error: supabaseConfigMessage,
            isLoading: false,
            patients: [],
          });
        }
        return;
      }

      if (!clinicId) {
        if (isActive) {
          setState({
            error: "No clinic context",
            isLoading: false,
            patients: [],
          });
        }
        return;
      }

      let query = supabase
        .from("patients")
        .select("id, clinic_id, lead_id, name, phone, age, gender, diagnosis, assigned_therapist, total_sessions, completed_sessions, status, created_at")
        .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (!isActive) return;

      if (error) {
        setState({
          error: error.message,
          isLoading: false,
          patients: [],
        });
        return;
      }

      // SECURITY: Filter by role on client
      const filtered = role === "therapist" && linkedTherapistId
        ? (data ?? []).filter(p => p.assigned_therapist === linkedTherapistId)
        : (data ?? []);

      setState({
        error: null,
        isLoading: false,
        patients: (filtered as PatientRow[]),
      });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId, isDemoMode, demoPatients, linkedTherapistId, role]);

  const createPatient = useCallback(
    async (input: CreatePatientInput): Promise<PatientMutationResult> => {
      // SECURITY: Permission check
      if (!can("manage_patients")) {
        return { error: "You do not have permission to create patients.", patientId: null };
      }

      if (isDemoMode) {
        const id = createMockPatient({
          age: input.age ?? null,
          assigned_therapist: input.assigned_therapist ?? null,
          diagnosis: normalizeOptionalText(input.diagnosis),
          gender: normalizeOptionalText(input.gender),
          name: input.name.trim(),
          phone: input.phone.trim(),
          status: input.status ?? "active",
          total_sessions: input.total_sessions ?? null,
        });

        return { error: null, patientId: id };
      }

      if (!supabase) return { error: supabaseConfigMessage, patientId: null };
      if (!clinicId) return { error: "No clinic context", patientId: null };

      const payload: PatientInsert = {
        clinic_id: clinicId, // SECURITY: Explicit clinic_id
        age: input.age ?? null,
        assigned_therapist: input.assigned_therapist ?? null,
        diagnosis: normalizeOptionalText(input.diagnosis),
        gender: normalizeOptionalText(input.gender),
        name: input.name.trim(),
        phone: input.phone.trim(),
        status: input.status ?? "active",
        total_sessions: input.total_sessions ?? null,
      };

      const { data, error } = await supabase
        .from("patients")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message, patientId: null };

      await loadPatients();
      return { error: null, patientId: (data as any)?.id ?? null };
    },
    [can, clinicId, createMockPatient, isDemoMode, loadPatients],
  );

  const updatePatient = useCallback(
    async (patientId: string, input: PatientMutationInput): Promise<PatientMutationResult> => {
      // SECURITY: Permission check
      if (!can("manage_patients")) {
        return { error: "You do not have permission to update patients.", patientId: null };
      }

      if (isDemoMode) {
        updateMockPatient(patientId, {
          assigned_therapist: input.assigned_therapist ?? null,
          diagnosis: normalizeOptionalText(input.diagnosis),
          status: input.status,
          total_sessions: input.total_sessions,
        });
        return { error: null, patientId };
      }

      if (!supabase) return { error: supabaseConfigMessage, patientId: null };
      if (!clinicId) return { error: "No clinic context", patientId: null };

      const payload: PatientUpdate = {
        assigned_therapist: input.assigned_therapist ?? null,
        diagnosis: normalizeOptionalText(input.diagnosis),
        status: input.status,
        total_sessions: input.total_sessions,
      };

      const { error } = await supabase
        .from("patients")
        .update(payload as never)
        .eq("id", patientId)
        .eq("clinic_id", clinicId); // SECURITY: Double-check clinic context

      if (error) return { error: error.message, patientId: null };

      await loadPatients();
      return { error: null, patientId };
    },
    [can, clinicId, isDemoMode, loadPatients],
  );

  return {
    ...state,
    createPatient,
    refreshPatients: loadPatients,
    updatePatient,
  };
}
