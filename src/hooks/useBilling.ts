import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import type { BillingRow, BillingStatus, Database, PaymentMethod } from "@/types";

export interface CreateBillingInput {
  amount: number;
  appointment_id?: string | null;
  clinic_id: string;
  package_name?: string | null;
  patient_id: string;
  payment_method?: PaymentMethod;
  sessions_included?: number | null;
  status?: BillingStatus;
  treatment_plan_id?: string | null;
}

interface MutationResult {
  error: string | null;
}

interface UseBillingState {
  error: string | null;
  isLoading: boolean;
  records: BillingRow[];
}

type BillingInsert = Database["public"]["Tables"]["billing"]["Insert"];

const SELECT_FIELDS =
  "id, patient_id, appointment_id, clinic_id, amount, payment_method, status, package_name, sessions_included, sessions_used, treatment_plan_id, paid_at, created_at";

export function useBilling({ patientId }: { patientId?: string } = {}) {
  const { can, clinicId } = useAuth();
  const [state, setState] = useState<UseBillingState>({
    error: null,
    isLoading: true,
    records: [],
  });

  const loadRecords = useCallback(async () => {
    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, records: [] });
      return;
    }

    if (!clinicId) {
      setState({ error: "No clinic context", isLoading: false, records: [] });
      return;
    }

    let query = supabase
      .from("billing")
      .select(SELECT_FIELDS)
      .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
      .order("created_at", { ascending: false });

    if (patientId) query = query.eq("patient_id", patientId);

    const { data, error } = await query;

    if (error) {
      setState({ error: error.message, isLoading: false, records: [] });
      return;
    }

    setState({ error: null, isLoading: false, records: (data ?? []) as BillingRow[] });
  }, [clinicId, patientId]);

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (!supabase) {
        if (isActive) setState({ error: supabaseConfigMessage, isLoading: false, records: [] });
        return;
      }

      if (!clinicId) {
        if (isActive) setState({ error: "No clinic context", isLoading: false, records: [] });
        return;
      }

      let query = supabase
        .from("billing")
        .select(SELECT_FIELDS)
        .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
        .order("created_at", { ascending: false });

      if (patientId) query = query.eq("patient_id", patientId);

      const { data, error } = await query;

      if (!isActive) return;

      if (error) {
        setState({ error: error.message, isLoading: false, records: [] });
        return;
      }

      setState({ error: null, isLoading: false, records: (data ?? []) as BillingRow[] });
    }

    initialize();

    return () => {
      isActive = false;
    };
  }, [clinicId, patientId]);

  const createRecord = useCallback(
    async (input: CreateBillingInput): Promise<MutationResult> => {
      if (!can("manage_billing")) {
        return { error: "You do not have permission to record payments." };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      const payload: BillingInsert = {
        amount: input.amount,
        appointment_id: input.appointment_id ?? null,
        clinic_id: clinicId, // SECURITY: Use clinic from auth context
        package_name: input.package_name ?? null,
        patient_id: input.patient_id,
        payment_method: input.payment_method ?? "cash",
        sessions_included: input.sessions_included ?? null,
        sessions_used: 0,
        status: input.status ?? "due",
        treatment_plan_id: input.treatment_plan_id ?? null,
      };

      const { error } = await supabase.from("billing").insert(payload as never);
      if (error) return { error: error.message };

      await loadRecords();
      return { error: null };
    },
    [can, clinicId, loadRecords],
  );

  const markAsPaid = useCallback(
    async (recordId: string): Promise<MutationResult> => {
      if (!can("manage_billing")) {
        return { error: "You do not have permission to update billing." };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      const { error } = await supabase
        .from("billing")
        .update({ status: "paid", paid_at: new Date().toISOString() } as never)
        .eq("id", recordId)
        .eq("clinic_id", clinicId); // SECURITY: Double-check clinic context

      if (error) return { error: error.message };

      await loadRecords();
      return { error: null };
    },
    [can, clinicId, loadRecords],
  );

  const updateStatus = useCallback(
    async (recordId: string, status: BillingStatus): Promise<MutationResult> => {
      if (!can("manage_billing")) {
        return { error: "You do not have permission to update billing." };
      }

      if (!supabase) return { error: supabaseConfigMessage };
      if (!clinicId) return { error: "No clinic context" };

      const update: Partial<BillingRow> = { status };
      if (status === "paid") update.paid_at = new Date().toISOString();

      const { error } = await supabase
        .from("billing")
        .update(update as never)
        .eq("id", recordId)
        .eq("clinic_id", clinicId); // SECURITY: Double-check clinic context

      if (error) return { error: error.message };

      await loadRecords();
      return { error: null };
    },
    [can, clinicId, loadRecords],
  );

  const totalRevenue = state.records
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalDue = state.records
    .filter((r) => r.status === "due" || r.status === "partial")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    ...state,
    createRecord,
    markAsPaid,
    refreshRecords: loadRecords,
    totalDue,
    totalRevenue,
    updateStatus,
  };
}
