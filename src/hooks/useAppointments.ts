import { useEffect, useState } from "react";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { AppointmentRow } from "@/types";

interface UseAppointmentsState {
  appointments: AppointmentRow[];
  error: string | null;
  isLoading: boolean;
}

export function useAppointments() {
  const [state, setState] = useState<UseAppointmentsState>({
    appointments: [],
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isActive = true;

    async function loadAppointments() {
      if (!supabase) {
        if (isActive) {
          setState({
            appointments: [],
            error: supabaseConfigMessage,
            isLoading: false,
          });
        }

        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_id, therapist_id, scheduled_at, duration_mins, status, session_number, notes, created_at")
        .order("scheduled_at", { ascending: true });

      if (!isActive) {
        return;
      }

      if (error) {
        setState({
          appointments: [],
          error: error.message,
          isLoading: false,
        });
        return;
      }

      setState({
        appointments: (data ?? []) as AppointmentRow[],
        error: null,
        isLoading: false,
      });
    }

    loadAppointments();

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
