import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/lib/supabase";
import { callProductBridge } from "@/lib/productBridge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

export interface UnifiedTenantRow {
  tenant_id: string;
  product_key: string;
  external_id: string;
  name: string;
  owner_email: string | null;
  status: string;
  plan_key: string | null;
  subscription_status: string | null;
  created_at: string;
}

export function useAllTenants(search: string) {
  const [tenants, setTenants] = useState<UnifiedTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!supabase) return;
    setIsLoading(true);
    supabase.rpc("sa_list_all_tenants", { p_search: search || null })
      .then(({ data, error: err }: { data: UnifiedTenantRow[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setTenants(data ?? []);
        setIsLoading(false);
      });
  }, [search]);

  useEffect(() => { refetch(); }, [refetch]);
  return { tenants, isLoading, error, refetch };
}

export function useRemoteProductTenants(productKey: string) {
  const [tenants, setTenants] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    callProductBridge<Array<Record<string, unknown>>>(productKey, "list_tenants")
      .then((rows) => setTenants(Array.isArray(rows) ? rows : []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [productKey]);

  useEffect(() => { refetch(); }, [refetch]);
  return { tenants, isLoading, error, refetch };
}
