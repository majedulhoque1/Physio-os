import { useEffect, useState } from "react";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { TherapistRow } from "@/types";

interface UseTherapistsState {
  error: string | null;
  isLoading: boolean;
  therapists: TherapistRow[];
}

export function useTherapists() {
  const [state, setState] = useState<UseTherapistsState>({
    error: null,
    isLoading: true,
    therapists: [],
  });

  useEffect(() => {
    let isActive = true;

    async function loadTherapists() {
      if (!supabase) {
        if (isActive) {
          setState({
            error: supabaseConfigMessage,
            isLoading: false,
            therapists: [],
          });
        }

        return;
      }

      const { data, error } = await supabase
        .from("therapists")
        .select("id, name, phone, specialization, status, created_at")
        .order("name", { ascending: true });

      if (!isActive) {
        return;
      }

      if (error) {
        setState({
          error: error.message,
          isLoading: false,
          therapists: [],
        });
        return;
      }

      setState({
        error: null,
        isLoading: false,
        therapists: (data ?? []) as TherapistRow[],
      });
    }

    loadTherapists();

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
