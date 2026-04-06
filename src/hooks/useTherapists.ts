import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { Database, TherapistRow, TherapistStatus } from "@/types";

export interface CreateTherapistInput {
  name: string;
  phone?: string | null;
  specialization?: string | null;
  status?: TherapistStatus;
}

export interface TherapistMutationInput {
  name?: string;
  phone?: string | null;
  specialization?: string | null;
  status?: TherapistStatus;
}

interface TherapistMutationResult {
  error: string | null;
  therapistId?: string | null;
}

interface UseTherapistsState {
  error: string | null;
  isLoading: boolean;
  therapists: TherapistRow[];
}

type TherapistInsert = Database["public"]["Tables"]["therapists"]["Insert"];
type TherapistUpdate = Database["public"]["Tables"]["therapists"]["Update"];

function normalizeOptionalText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function sortTherapists(items: TherapistRow[]) {
  return [...items].sort((left, right) => {
    const leftStatus = left.status ?? "inactive";
    const rightStatus = right.status ?? "inactive";

    if (leftStatus !== rightStatus) {
      return leftStatus === "active" ? -1 : 1;
    }

    return (left.name ?? "").localeCompare(right.name ?? "");
  });
}

/**
 * SECURITY PATTERN: Multi-Tenant Therapist Hook
 *
 * 1. All Supabase queries filter by clinic_id
 * 2. RLS policies enforced server-side
 * 3. Only clinic_admin can create/update therapists
 * 4. All mutations enforce clinic context
 */
export function useTherapists() {
  const { can, clinicId } = useAuth();
  const [state, setState] = useState<UseTherapistsState>({
    error: null,
    isLoading: true,
    therapists: [],
  });

  const loadTherapists = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, therapists: [] });
      return;
    }

    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, therapists: [] });
      return;
    }

    const { data, error } = await supabase
      .from("therapists")
      .select("id, clinic_id, user_id, name, phone, specialization, status, created_at")
      .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
      .order("created_at", { ascending: false });

    if (error) {
      setState({ error: error.message, isLoading: false, therapists: [] });
      return;
    }

    setState({
      error: null,
      isLoading: false,
      therapists: sortTherapists((data ?? []) as TherapistRow[]),
    });
  }, [clinicId]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (!supabase) {
        if (isActive) setState({ error: supabaseConfigMessage, isLoading: false, therapists: [] });
        return;
      }

      if (!clinicId) {
        if (isActive) setState({ error: "No clinic context", isLoading: false, therapists: [] });
        return;
      }

      const { data, error } = await supabase
        .from("therapists")
        .select("id, clinic_id, user_id, name, phone, specialization, status, created_at")
        .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
        .order("created_at", { ascending: false });

      if (!isActive) return;

      if (error) {
        setState({ error: error.message, isLoading: false, therapists: [] });
        return;
      }

      setState({
        error: null,
        isLoading: false,
        therapists: sortTherapists((data ?? []) as TherapistRow[]),
      });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId]);

  const createTherapist = useCallback(
    async (input: CreateTherapistInput): Promise<TherapistMutationResult> => {
      if (!can("manage_therapists")) {
        return { error: "You do not have permission to create therapists.", therapistId: null };
      }

      if (!supabase) return { error: supabaseConfigMessage, therapistId: null };
      if (!clinicId) return { error: "No clinic context", therapistId: null };

      const payload: TherapistInsert = {
        clinic_id: clinicId, // SECURITY: Explicit clinic_id
        name: input.name.trim(),
        phone: normalizeOptionalText(input.phone),
        specialization: normalizeOptionalText(input.specialization),
        status: input.status ?? "active",
      };

      const { data, error } = await supabase
        .from("therapists")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message, therapistId: null };

      await loadTherapists();
      return { error: null, therapistId: (data as any)?.id ?? null };
    },
    [can, clinicId, loadTherapists],
  );

  const updateTherapist = useCallback(
    async (therapistId: string, input: TherapistMutationInput): Promise<TherapistMutationResult> => {
      if (!can("manage_therapists")) {
        return { error: "You do not have permission to update therapists.", therapistId: null };
      }

      if (!supabase) return { error: supabaseConfigMessage, therapistId: null };
      if (!clinicId) return { error: "No clinic context", therapistId: null };

      const payload: TherapistUpdate = {
        name: input.name,
        phone: normalizeOptionalText(input.phone),
        specialization: normalizeOptionalText(input.specialization),
        status: input.status,
      };

      const { error } = await supabase
        .from("therapists")
        .update(payload as never)
        .eq("id", therapistId)
        .eq("clinic_id", clinicId); // SECURITY: Double-check clinic context

      if (error) return { error: error.message, therapistId: null };

      await loadTherapists();
      return { error: null, therapistId };
    },
    [can, clinicId, loadTherapists],
  );

  return {
    ...state,
    createTherapist,
    refreshTherapists: loadTherapists,
    updateTherapist,
  };
}
