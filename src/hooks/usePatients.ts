import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
}

export interface PatientMutationInput {
  assigned_therapist?: string | null;
  diagnosis?: string | null;
  status?: PatientStatus;
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
  const { can, clinicId, linkedTherapistId, role } = useAuth();
  const [state, setState] = useState<UsePatientsState>({
    error: null,
    isLoading: true,
    patients: [],
  });

  const loadPatients = useCallback(async () => {
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
      .select("id, clinic_id, lead_id, name, phone, age, gender, diagnosis, assigned_therapist, status, created_at")
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
    const typed = (data ?? []) as PatientRow[];
    const filtered = role === "therapist" && linkedTherapistId
      ? typed.filter(p => p.assigned_therapist === linkedTherapistId)
      : typed;

    setState({
      error: null,
      isLoading: false,
      patients: filtered,
    });
  }, [clinicId, linkedTherapistId, role]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
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
        .select("id, clinic_id, lead_id, name, phone, age, gender, diagnosis, assigned_therapist, status, created_at")
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
      const typed = (data ?? []) as PatientRow[];
      const filtered = role === "therapist" && linkedTherapistId
        ? typed.filter(p => p.assigned_therapist === linkedTherapistId)
        : typed;

      setState({
        error: null,
        isLoading: false,
        patients: filtered,
      });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId, linkedTherapistId, role]);

  const createPatient = useCallback(
    async (input: CreatePatientInput): Promise<PatientMutationResult> => {
      // SECURITY: Permission check
      if (!can("manage_patients")) {
        return { error: "You do not have permission to create patients.", patientId: null };
      }

      if (!supabase) return { error: supabaseConfigMessage, patientId: null };
      if (!clinicId) return { error: "No clinic context", patientId: null };

      const payload: PatientInsert = {
        clinic_id: clinicId, // SECURITY: Explicit clinic_id
        age: input.age ?? null,
        assigned_therapist: input.assigned_therapist ?? null,
        diagnosis: normalizeOptionalText(input.diagnosis),
        gender: normalizeOptionalText(input.gender),
        lead_id: null,
        name: input.name.trim(),
        phone: input.phone.trim(),
        status: input.status ?? "active",
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
    [can, clinicId, loadPatients],
  );

  const updatePatient = useCallback(
    async (patientId: string, input: PatientMutationInput): Promise<PatientMutationResult> => {
      // SECURITY: Permission check
      if (!can("manage_patients")) {
        return { error: "You do not have permission to update patients.", patientId: null };
      }

      if (!supabase) return { error: supabaseConfigMessage, patientId: null };
      if (!clinicId) return { error: "No clinic context", patientId: null };

      const payload: PatientUpdate = {
        assigned_therapist: input.assigned_therapist ?? null,
        diagnosis: normalizeOptionalText(input.diagnosis),
        status: input.status,
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
    [can, clinicId, loadPatients],
  );

  const deletePatient = useCallback(
    async (patientId: string): Promise<PatientMutationResult> => {
      // SECURITY: Permission check - only admin can delete
      if (!can("manage_patients")) {
        return { error: "You do not have permission to delete patients.", patientId: null };
      }

      if (!supabase) return { error: supabaseConfigMessage, patientId: null };
      if (!clinicId) return { error: "No clinic context", patientId: null };

      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId)
        .eq("clinic_id", clinicId); // SECURITY: Double-check clinic context

      if (error) return { error: error.message, patientId: null };

      await loadPatients();
      return { error: null, patientId };
    },
    [can, clinicId, loadPatients],
  );

  return {
    ...state,
    createPatient,
    deletePatient,
    refreshPatients: loadPatients,
    updatePatient,
  };
}
