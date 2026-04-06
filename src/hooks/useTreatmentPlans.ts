import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { Database, TreatmentPlanRow, TreatmentPlanStatus } from "@/types";

export interface CreateTreatmentPlanInput {
  diagnosis?: string | null;
  notes?: string | null;
  patient_id: string;
  therapist_id: string;
  total_sessions: number;
}

interface MutationResult {
  error: string | null;
  planId?: string | null;
}

interface UseTreatmentPlansState {
  error: string | null;
  isLoading: boolean;
  plans: TreatmentPlanRow[];
}

type PlanInsert = Database["public"]["Tables"]["treatment_plans"]["Insert"];
type PlanUpdate = Database["public"]["Tables"]["treatment_plans"]["Update"];

const SELECT_FIELDS =
  "id, clinic_id, patient_id, therapist_id, diagnosis, total_sessions, completed_sessions, status, started_at, completed_at, abandoned_at, notes, created_at, updated_at";

export function useTreatmentPlans({ patientId }: { patientId?: string } = {}) {
  const { can, clinicId, linkedTherapistId, role } = useAuth();
  const [state, setState] = useState<UseTreatmentPlansState>({
    error: null,
    isLoading: true,
    plans: [],
  });

  const loadPlans = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, plans: [] });
      return;
    }

    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, plans: [] });
      return;
    }

    let query = supabase
      .from("treatment_plans")
      .select(SELECT_FIELDS)
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (patientId) {
      query = query.eq("patient_id", patientId);
    }

    const { data, error } = await query;

    if (error) {
      setState({ error: error.message, isLoading: false, plans: [] });
      return;
    }

    const typed = (data ?? []) as TreatmentPlanRow[];
    const filtered =
      role === "therapist" && linkedTherapistId
        ? typed.filter((p) => p.therapist_id === linkedTherapistId)
        : typed;

    setState({
      error: null,
      isLoading: false,
      plans: filtered,
    });
  }, [clinicId, linkedTherapistId, patientId, role]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (!supabase) {
        if (isActive)
          setState({ error: supabaseConfigMessage, isLoading: false, plans: [] });
        return;
      }

      if (!clinicId) {
        if (isActive)
          setState({ error: "No clinic context", isLoading: false, plans: [] });
        return;
      }

      let query = supabase
        .from("treatment_plans")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await query;

      if (!isActive) return;

      if (error) {
        setState({ error: error.message, isLoading: false, plans: [] });
        return;
      }

      const typed = (data ?? []) as TreatmentPlanRow[];
      const filtered =
        role === "therapist" && linkedTherapistId
          ? typed.filter((p) => p.therapist_id === linkedTherapistId)
          : typed;

      setState({
        error: null,
        isLoading: false,
        plans: filtered,
      });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId, linkedTherapistId, patientId, role]);

  const createPlan = useCallback(
    async (input: CreateTreatmentPlanInput): Promise<MutationResult> => {
      if (!can("manage_patients")) {
        return { error: "You do not have permission to create treatment plans.", planId: null };
      }

      if (!supabase) return { error: supabaseConfigMessage, planId: null };
      if (!clinicId) return { error: "No clinic context", planId: null };

      const payload: PlanInsert = {
        clinic_id: clinicId,
        diagnosis: input.diagnosis ?? null,
        notes: input.notes ?? null,
        patient_id: input.patient_id,
        status: "active",
        therapist_id: input.therapist_id,
        total_sessions: input.total_sessions,
        started_at: null,
        completed_at: null,
        abandoned_at: null,
      };

      const { data, error } = await supabase
        .from("treatment_plans")
        .insert(payload as never)
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message, planId: null };

      await loadPlans();
      return { error: null, planId: (data as any)?.id ?? null };
    },
    [can, clinicId, loadPlans],
  );

  const updatePlanStatus = useCallback(
    async (
      planId: string,
      status: TreatmentPlanStatus,
    ): Promise<MutationResult> => {
      if (!can("manage_patients")) {
        return { error: "You do not have permission to update treatment plans." };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      const update: PlanUpdate = { status, updated_at: new Date().toISOString() };

      if (status === "abandoned") {
        update.abandoned_at = new Date().toISOString();
      } else if (status === "completed") {
        update.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("treatment_plans")
        .update(update as never)
        .eq("id", planId)
        .eq("clinic_id", clinicId);

      if (error) return { error: error.message };

      await loadPlans();
      return { error: null };
    },
    [can, clinicId, loadPlans],
  );

  const activePlan = state.plans.find((p) => p.status === "active") ?? null;

  return {
    ...state,
    activePlan,
    createPlan,
    refreshPlans: loadPlans,
    updatePlanStatus,
  };
}
