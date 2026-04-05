import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMockClinic } from "@/contexts/MockClinicContext";
import {
  buildAppointmentRelations,
  getVisibleAppointments,
} from "@/lib/mockClinic";
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
  "id, clinic_id, patient_id, therapist_id, scheduled_at, duration_mins, status, session_number, notes, created_at, patients(name, phone), therapists(name)";

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
  const { can, clinicId, isDemoMode, linkedTherapistId, role } = useAuth();
  const {
    createAppointment: createMockAppointment,
    data: mockData,
    updateAppointmentStatus: updateMockAppointmentStatus,
  } = useMockClinic();
  const [state, setState] = useState<UseAppointmentsState>({
    appointments: [],
    error: null,
    isLoading: true,
  });

  const demoAppointments = useMemo(
    () =>
      buildAppointmentRelations(
        mockData,
        getVisibleAppointments(mockData, role, linkedTherapistId),
      )
        .filter((appointment) => (patientId ? appointment.patient_id === patientId : true))
        .sort(
          (left, right) =>
            new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
        ),
    [mockData, role, linkedTherapistId, patientId],
  );

  const loadAppointments = useCallback(async () => {
    if (isDemoMode) {
      setState({ appointments: demoAppointments, error: null, isLoading: false });
      return;
    }

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
    const filtered = role === "therapist" && linkedTherapistId
      ? (data ?? []).filter(apt => apt.therapist_id === linkedTherapistId)
      : (data ?? []);

    setState({
      appointments: (filtered as AppointmentWithRelations[]),
      error: null,
      isLoading: false,
    });
  }, [clinicId, isDemoMode, demoAppointments, linkedTherapistId, patientId, role]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (isDemoMode) {
        if (isActive) {
          setState({ appointments: demoAppointments, error: null, isLoading: false });
        }
        return;
      }

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
      const filtered = role === "therapist" && linkedTherapistId
        ? (data ?? []).filter(apt => apt.therapist_id === linkedTherapistId)
        : (data ?? []);

      setState({
        appointments: (filtered as AppointmentWithRelations[]),
        error: null,
        isLoading: false,
      });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId, demoAppointments, isDemoMode, linkedTherapistId, patientId, role]);

  const createAppointment = useCallback(
    async (input: AppointmentMutationInput): Promise<AppointmentMutationResult> => {
      // SECURITY: Permission check
      if (!can("manage_appointments")) {
        return { error: "You do not have permission to book appointments." };
      }

      if (isDemoMode) {
        createMockAppointment({
          duration_mins: input.duration_mins ?? 45,
          notes: input.notes ?? null,
          patient_id: input.patient_id,
          scheduled_at: input.scheduled_at,
          session_number: input.session_number ?? null,
          status: input.status ?? "scheduled",
          therapist_id: input.therapist_id,
        });

        return { error: null };
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
      };

      const { error } = await supabase.from("appointments").insert(payload as never);
      if (error) return { error: error.message };

      await loadAppointments();
      return { error: null };
    },
    [can, clinicId, createMockAppointment, isDemoMode, loadAppointments],
  );

  const updateAppointmentStatus = useCallback(
    async (appointmentId: string, status: AppointmentStatus): Promise<AppointmentMutationResult> => {
      // SECURITY: Permission check (therapist can update own, admin/receptionist can update any)
      if (!can("manage_appointments") && role !== "therapist") {
        return { error: "You do not have permission to update appointment status." };
      }

      if (isDemoMode) {
        const appointment = mockData.appointments.find((item) => item.id === appointmentId);

        if (!appointment) {
          return { error: "Appointment not found." };
        }

        // SECURITY: Therapist can only update their own appointments
        if (role === "therapist" && appointment.therapist_id !== linkedTherapistId) {
          return { error: "Therapists can only update their own appointments." };
        }

        updateMockAppointmentStatus(appointmentId, status);
        return { error: null };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      // SECURITY: For therapists, verify they own the appointment before updating
      if (role === "therapist" && linkedTherapistId) {
        const { data: apt } = await supabase
          .from("appointments")
          .select("therapist_id")
          .eq("id", appointmentId)
          .eq("clinic_id", clinicId)
          .maybeSingle();

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
    [can, clinicId, isDemoMode, linkedTherapistId, mockData.appointments, role, supabaseConfigMessage, updateMockAppointmentStatus, loadAppointments],
  );

  return {
    ...state,
    createAppointment,
    refreshAppointments: loadAppointments,
    updateAppointmentStatus,
  };
}
