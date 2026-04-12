import { useCallback, useState } from "react";
import { supabase as supabaseClient } from "@/lib/supabase";
import type { UpgradeRequestItem, SAInvoiceRow } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

export async function requestUpgrade(clinicId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.rpc("request_upgrade", { p_clinic_id: clinicId });
  if (error) return { error: error.message };
  return { error: null };
}

export function useUpgradePendingList() {
  const [requests, setRequests] = useState<UpgradeRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_upgrade_requests")
      .then(({ data, error: err }: { data: UpgradeRequestItem[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setRequests(data ?? []);
        setIsLoading(false);
      });
  }, []);

  return { requests, isLoading, error, fetch };
}

export function useSAInvoiceList(clinicId?: string) {
  const [invoices, setInvoices] = useState<SAInvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    supabase
      .rpc("sa_list_invoices", { p_clinic_id: clinicId ?? null })
      .then(({ data, error: err }: { data: SAInvoiceRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setInvoices(data ?? []);
        setIsLoading(false);
      });
  }, [clinicId]);

  return { invoices, isLoading, error, fetch };
}
