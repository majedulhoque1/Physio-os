import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/lib/supabase";
import type {
  SAPatientRow,
  SATherapistRow,
  SAAppointmentRow,
  SATreatmentPlanRow,
} from "@/types";

// Cast to allow calling custom RPC functions not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

export interface PlatformStats {
  total_tenants: number;
  total_users: number;
  active_subscriptions: number;
  mrr_cents: number;
  by_product: Array<{ product_key: string; tenants: number }> | null;
}

export interface TenantListItem {
  tenant_id: string;
  product_key: string;
  external_id: string;  // clinic UUID for physio_os
  name: string;         // formerly clinic_name
  owner_email: string | null;
  status: string;
  plan_key: string | null;
  subscription_status: string | null;
  created_at: string;
}

export interface TenantDetail {
  clinic: {
    id: string;
    name: string;
    slug: string;
    owner_user_id: string | null;
    created_at: string;
  };
  owner: {
    email: string | null;
    full_name: string | null;
  };
  subscription: {
    plan_key: string | null;
    status: string | null;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
  } | null;
  stats: {
    total_patients: number;
    total_therapists: number;
    total_appointments: number;
    active_treatment_plans: number;
  };
}

export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    setIsLoading(true);
    supabase
      .rpc("sa_platform_stats_v2")
      .then(({ data, error: err }: { data: PlatformStats | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setStats(data);
        setIsLoading(false);
      });
  }, []);

  return { stats, isLoading, error };
}

export function useTenantList(search: string) {
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!supabase) return;
    setIsLoading(true);
    supabase
      .rpc("sa_list_all_tenants", { p_search: search || null })
      .then(({ data, error: err }: { data: TenantListItem[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setTenants(data ?? []);
        setIsLoading(false);
      });
  }, [search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { tenants, isLoading, error, refetch };
}

export function useTenantDetail(clinicId: string | undefined) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    supabase
      .rpc("sa_tenant_detail", { p_clinic_id: clinicId })
      .then(({ data, error: err }: { data: TenantDetail | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setDetail(data);
        setIsLoading(false);
      });
  }, [clinicId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { detail, isLoading, error, refetch };
}

export async function createTenant(params: {
  clinic_name: string;
  owner_email: string;
  plan_key: string;
  trial_end: string | null;
  temp_password: string;
}) {
  if (!supabase) return { error: "Supabase not configured", clinicId: null };

  const { data, error } = await supabase.rpc("sa_create_tenant", {
    p_clinic_name: params.clinic_name,
    p_owner_email: params.owner_email,
    p_plan_key: params.plan_key,
    p_trial_end: params.trial_end,
    p_temp_password: params.temp_password,
  });

  if (error) return { error: error.message, clinicId: null };
  return { error: null, clinicId: data as string };
}

export async function updateSubscription(params: {
  clinic_id: string;
  plan_key?: string;
  status?: string;
  trial_end?: string | null;
}) {
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase.rpc("sa_update_subscription", {
    p_clinic_id: params.clinic_id,
    p_plan_key: params.plan_key ?? null,
    p_status: params.status ?? null,
    p_trial_end: params.trial_end ?? null,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateClinic(params: {
  clinic_id: string;
  name?: string;
}): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.rpc("sa_update_clinic", {
    p_clinic_id: params.clinic_id,
    p_name: params.name ?? null,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteTenant(clinicId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.rpc("sa_delete_tenant", { p_clinic_id: clinicId });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateInvoice(params: {
  invoice_id: string;
  status?: string;
  amount_due_cents?: number;
  due_at?: string | null;
  paid_at?: string | null;
}): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.rpc("sa_update_invoice", {
    p_invoice_id: params.invoice_id,
    p_status: params.status ?? null,
    p_amount_due_cents: params.amount_due_cents ?? null,
    p_due_at: params.due_at ?? null,
    p_paid_at: params.paid_at ?? null,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteInvoice(invoiceId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.rpc("sa_delete_invoice", { p_invoice_id: invoiceId });
  if (error) return { error: error.message };
  return { error: null };
}

export async function approveTenant(params: {
  clinic_id: string;
  plan_key?: string;
}): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase.rpc("sa_approve_subscription", {
    p_clinic_id: params.clinic_id,
    p_plan_key: params.plan_key ?? "starter",
  });

  if (error) return { error: error.message };
  return { error: null };
}

export function useTenantPatients(clinicId: string | undefined) {
  const [data, setData] = useState<SAPatientRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_patients", { p_clinic_id: clinicId })
      .then(({ data: rows, error: err }: { data: SAPatientRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { data, isLoading, error, fetch };
}

export function useTenantTherapists(clinicId: string | undefined) {
  const [data, setData] = useState<SATherapistRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_therapists", { p_clinic_id: clinicId })
      .then(({ data: rows, error: err }: { data: SATherapistRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { data, isLoading, error, fetch };
}

export function useTenantAppointments(clinicId: string | undefined) {
  const [data, setData] = useState<SAAppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_appointments", { p_clinic_id: clinicId })
      .then(({ data: rows, error: err }: { data: SAAppointmentRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { data, isLoading, error, fetch };
}

export function useTenantTreatmentPlans(clinicId: string | undefined) {
  const [data, setData] = useState<SATreatmentPlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase || !clinicId) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_treatment_plans", { p_clinic_id: clinicId })
      .then(({ data: rows, error: err }: { data: SATreatmentPlanRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setData(rows ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { data, isLoading, error, fetch };
}
