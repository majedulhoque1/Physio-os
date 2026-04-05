import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMockClinic } from "@/contexts/MockClinicContext";
import { getVisibleBilling } from "@/lib/mockClinic";
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
  "id, patient_id, appointment_id, clinic_id, amount, payment_method, status, package_name, sessions_included, sessions_used, paid_at, created_at";

export function useBilling({ patientId }: { patientId?: string } = {}) {
  const { can, isDemoMode, role } = useAuth();
  const {
    createBillingRecord,
    data: mockData,
    markBillingPaid: markMockBillingPaid,
    updateBillingStatus: updateMockBillingStatus,
  } = useMockClinic();
  const [state, setState] = useState<UseBillingState>({
    error: null,
    isLoading: true,
    records: [],
  });

  const demoRecords = useMemo(
    () =>
      getVisibleBilling(mockData, role)
        .filter((record) => (patientId ? record.patient_id === patientId : true))
        .sort((left, right) => (right.created_at ?? "").localeCompare(left.created_at ?? "")),
    [mockData, role, patientId],
  );

  async function loadRecords() {
    if (isDemoMode) {
      setState({ error: null, isLoading: false, records: demoRecords });
      return;
    }

    if (!supabase) {
      setState({ error: supabaseConfigMessage, isLoading: false, records: [] });
      return;
    }

    let query = supabase
      .from("billing")
      .select(SELECT_FIELDS)
      .order("created_at", { ascending: false });

    if (patientId) query = query.eq("patient_id", patientId);

    const { data, error } = await query;

    if (error) {
      setState({ error: error.message, isLoading: false, records: [] });
      return;
    }

    setState({ error: null, isLoading: false, records: (data ?? []) as BillingRow[] });
  }

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      if (isDemoMode) {
        if (isActive) {
          setState({ error: null, isLoading: false, records: demoRecords });
        }
        return;
      }

      if (!supabase) {
        if (isActive) setState({ error: supabaseConfigMessage, isLoading: false, records: [] });
        return;
      }

      let query = supabase
        .from("billing")
        .select(SELECT_FIELDS)
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
  }, [demoRecords, isDemoMode, patientId]);

  async function createRecord(input: CreateBillingInput): Promise<MutationResult> {
    if (!can("manage_billing")) {
      return { error: "You do not have permission to record payments." };
    }

    if (isDemoMode) {
      createBillingRecord({
        amount: input.amount,
        appointment_id: input.appointment_id ?? null,
        package_name: input.package_name ?? null,
        patient_id: input.patient_id,
        payment_method: input.payment_method ?? "cash",
        sessions_included: input.sessions_included ?? null,
        status: input.status ?? "due",
      });

      return { error: null };
    }

    if (!supabase) return { error: supabaseConfigMessage };

    const payload: BillingInsert = {
      amount: input.amount,
      appointment_id: input.appointment_id ?? null,
      clinic_id: input.clinic_id,
      package_name: input.package_name ?? null,
      patient_id: input.patient_id,
      payment_method: input.payment_method ?? "cash",
      sessions_included: input.sessions_included ?? null,
      sessions_used: 0,
      status: input.status ?? "due",
    };

    const { error } = await supabase.from("billing").insert(payload as never);
    if (error) return { error: error.message };

    await loadRecords();
    return { error: null };
  }

  async function markAsPaid(recordId: string): Promise<MutationResult> {
    if (!can("manage_billing")) {
      return { error: "You do not have permission to update billing." };
    }

    if (isDemoMode) {
      markMockBillingPaid(recordId);
      return { error: null };
    }

    if (!supabase) return { error: supabaseConfigMessage };

    const { error } = await supabase
      .from("billing")
      .update({ status: "paid", paid_at: new Date().toISOString() } as never)
      .eq("id", recordId);

    if (error) return { error: error.message };

    await loadRecords();
    return { error: null };
  }

  async function updateStatus(recordId: string, status: BillingStatus): Promise<MutationResult> {
    if (!can("manage_billing")) {
      return { error: "You do not have permission to update billing." };
    }

    if (isDemoMode) {
      updateMockBillingStatus(recordId, status);
      return { error: null };
    }

    if (!supabase) return { error: supabaseConfigMessage };

    const update: Partial<BillingRow> = { status };
    if (status === "paid") update.paid_at = new Date().toISOString();

    const { error } = await supabase
      .from("billing")
      .update(update as never)
      .eq("id", recordId);

    if (error) return { error: error.message };

    await loadRecords();
    return { error: null };
  }

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
