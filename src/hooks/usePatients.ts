import { useEffect, useState } from "react";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { PatientRow } from "@/types";

interface UsePatientsState {
  error: string | null;
  isLoading: boolean;
  patients: PatientRow[];
}

export function usePatients() {
  const [state, setState] = useState<UsePatientsState>({
    error: null,
    isLoading: true,
    patients: [],
  });

  useEffect(() => {
    let isActive = true;

    async function loadPatients() {
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

      const { data, error } = await supabase
        .from("patients")
        .select("id, lead_id, name, phone, age, gender, diagnosis, assigned_therapist, total_sessions, completed_sessions, status, created_at")
        .order("created_at", { ascending: false });

      if (!isActive) {
        return;
      }

      if (error) {
        setState({
          error: error.message,
          isLoading: false,
          patients: [],
        });
        return;
      }

      setState({
        error: null,
        isLoading: false,
        patients: (data ?? []) as PatientRow[],
      });
    }

    loadPatients();

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
