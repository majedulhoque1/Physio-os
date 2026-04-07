import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { AppointmentStatus, AppointmentWithRelations, Database } from "@/types";

interface UseAppointmentsOptions {
  patientId?: string;
}

export interface AppointmentMutationInput {
  duration_mins?: number;
  notes?: string | null;
  patient_id: string;
  scheduled_at: string;
  session_number?: number | null;
  status?: AppointmentStatus;
  therapist_id: string;
  treatment_plan_id?: string | null;
}

interface AppointmentMutationResult {
  error: string | null;
}

interface UseAppointmentsState {
  appointments: AppointmentWithRelations[];
  error: string | null;
  isLoading: boolean;
}

type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];

const SELECT_FIELDS =
  "id, clinic_id, patient_id, therapist_id, scheduled_at, duration_mins, status, session_number, notes, treatment_plan_id, created_at, patients!appointments_patient_id_fkey(name, phone), therapists!appointments_therapist_id_fkey(name)";

/**
 * SECURITY PATTERN: Multi-Tenant Appointment Hook
 *
 * 1. All Supabase queries filter by clinic_id from auth context
 * 2. RLS policies enforced server-side (belt + suspenders)
 * 3. Role-based filtering on client:
 *    - therapist: sees only own appointments
 *    - clinic_admin/receptionist: sees all clinic appointments
 * 4. Mutations check permission + clinic context
 */
export function useAppointments({ patientId }: UseAppointmentsOptions = {}) {
  const { can, clinicId, linkedTherapistId, role } = useAuth();
  const [state, setState] = useState<UseAppointmentsState>({
    appointments: [],
    error: null,
    isLoading: true,
  });

  const loadAppointments = useCallback(async () => {
    if (!supabase) {
      setState({ appointments: [], error: supabaseConfigMessage, isLoading: false });
      return;
    }

    if (!clinicId) {
      setState({ appointments: [], error: "No clinic context", isLoading: false });
      return;
    }

    let query = supabase
      .from("appointments")
      .select(SELECT_FIELDS)
      .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
      .order("scheduled_at", { ascending: true });

    if (patientId) {
      query = query.eq("patient_id", patientId);
    }

    const { data, error } = await query;

    if (error) {
      setState({ appointments: [], error: error.message, isLoading: false });
      return;
    }

    // SECURITY: Filter by role on client (therapist sees only own, admin/receptionist see all)
    const typed = (data ?? []) as AppointmentWithRelations[];
    const filtered = role === "therapist" && linkedTherapistId
      ? typed.filter(apt => apt.therapist_id === linkedTherapistId)
      : typed;

    setState({
      appointments: filtered,
      error: null,
      isLoading: false,
    });
  }, [clinicId, linkedTherapistId, patientId, role]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (!supabase) {
        if (isActive) {
          setState({ appointments: [], error: supabaseConfigMessage, isLoading: false });
        }
        return;
      }

      if (!clinicId) {
        if (isActive) {
          setState({ appointments: [], error: "No clinic context", isLoading: false });
        }
        return;
      }

      let query = supabase
        .from("appointments")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
        .order("scheduled_at", { ascending: true });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await query;

      if (!isActive) return;

      if (error) {
        setState({ appointments: [], error: error.message, isLoading: false });
        return;
      }

      // SECURITY: Filter by role on client (therapist sees only own, admin/receptionist see all)
      const typed = (data ?? []) as AppointmentWithRelations[];
      const filtered = role === "therapist" && linkedTherapistId
        ? typed.filter(apt => apt.therapist_id === linkedTherapistId)
        : typed;

      setState({
        appointments: filtered,
        error: null,
        isLoading: false,
      });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId, linkedTherapistId, patientId, role]);

  const createAppointment = useCallback(
    async (input: AppointmentMutationInput): Promise<AppointmentMutationResult> => {
      // SECURITY: Permission check
      if (!can("manage_appointments")) {
        return { error: "You do not have permission to book appointments." };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      const payload: AppointmentInsert = {
        clinic_id: clinicId, // SECURITY: Explicit clinic_id
        duration_mins: input.duration_mins ?? 45,
        notes: input.notes ?? null,
        patient_id: input.patient_id,
        scheduled_at: input.scheduled_at,
        session_number: input.session_number ?? null,
        status: input.status ?? "scheduled",
        therapist_id: input.therapist_id,
        treatment_plan_id: input.treatment_plan_id ?? null,
      };

      const { error } = await supabase.from("appointments").insert(payload as never);
      if (error) return { error: error.message };

      await loadAppointments();
      return { error: null };
    },
    [can, clinicId, loadAppointments],
  );

  const updateAppointmentStatus = useCallback(
    async (appointmentId: string, status: AppointmentStatus): Promise<AppointmentMutationResult> => {
      // SECURITY: Permission check (therapist can update own, admin/receptionist can update any)
      if (!can("manage_appointments") && role !== "therapist") {
        return { error: "You do not have permission to update appointment status." };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      // SECURITY: For therapists, verify they own the appointment before updating
      if (role === "therapist" && linkedTherapistId) {
        const { data } = await supabase
          .from("appointments")
          .select("therapist_id")
          .eq("id", appointmentId)
          .eq("clinic_id", clinicId)
          .maybeSingle();

        const apt = data as { therapist_id: string } | null;
        if (!apt || apt.therapist_id !== linkedTherapistId) {
          return { error: "You can only update your own appointments." };
        }
      }

      const payload: AppointmentUpdate = { status };
      const { error } = await supabase
        .from("appointments")
        .update(payload as never)
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId); // SECURITY: Double-check clinic context

      if (error) return { error: error.message };

      await loadAppointments();
      return { error: null };
    },
    [can, clinicId, linkedTherapistId, role, supabaseConfigMessage, loadAppointments],
  );

  return {
    ...state,
    createAppointment,
    refreshAppointments: loadAppointments,
    updateAppointmentStatus,
  };
}
