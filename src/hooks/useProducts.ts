import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

export interface ProductRow {
  product_key: string;
  display_name: string;
  supabase_url: string | null;
  bridge_secret_name: string | null;
  is_local: boolean;
  status: "active" | "disabled";
  sort_order: number;
  icon_key: string | null;
}

export function useProducts(opts: { onlyActive?: boolean } = {}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!supabase) return;
    setIsLoading(true);
    let q = supabase.from("products").select("*").order("sort_order", { ascending: true });
    if (opts.onlyActive) q = q.eq("status", "active");
    q.then(({ data, error: err }: { data: ProductRow[] | null; error: { message: string } | null }) => {
      if (err) setError(err.message);
      else setProducts(data ?? []);
      setIsLoading(false);
    });
  }, [opts.onlyActive]);

  useEffect(() => { refetch(); }, [refetch]);

  return { products, isLoading, error, refetch };
}
