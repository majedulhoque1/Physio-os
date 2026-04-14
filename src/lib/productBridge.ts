import { supabase } from "@/lib/supabase";

export type BridgeAction =
  | "list_tenants" | "get_tenant_data" | "list_users"
  | "disable_user" | "enable_user" | "reassign_user"
  | "suspend_tenant" | "resume_tenant" | "delete_tenant";

type Envelope<T> = { success?: boolean; result?: T; error?: unknown };

export async function callProductBridge<T>(
  productKey: string,
  action: BridgeAction,
  extra: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("You must be signed in");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-bridge`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ product_key: productKey, action, ...extra }),
    });
  } catch {
    throw new Error("Cannot reach product-bridge edge function");
  }

  const ct = res.headers.get("content-type") ?? "";
  const data: unknown = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = typeof data === "object" && data && "error" in (data as Record<string, unknown>)
      ? String((data as { error: unknown }).error)
      : `Bridge ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`;
    throw new Error(msg);
  }

  const env = data as Envelope<T>;
  if (env && typeof env === "object" && env.success === false) {
    throw new Error(typeof env.error === "string" ? env.error : "bridge error");
  }
  if (env && "result" in (env as object)) return (env as Envelope<T>).result as T;
  return data as T;
}
