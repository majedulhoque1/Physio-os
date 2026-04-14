import { supabase } from "@/lib/supabase";

export interface CoTenantRow {
  org_id: string;
  user_count: number;
}

export interface CoUserRow {
  id: string;
  email: string;
  org_id: string;
  status: "active" | "disabled" | string;
  [key: string]: unknown;
}

export interface CoTenantData {
  org_id: string;
  tables: Record<string, unknown[]>;
}

type BridgeAction =
  | "list_tenants"
  | "get_tenant_data"
  | "list_users"
  | "disable_user"
  | "enable_user"
  | "reassign_user"
  | "suspend_tenant"
  | "delete_tenant";

type BridgeEnvelope<T> = {
  success?: boolean;
  result?: T;
  error?: unknown;
};

function isEnvelope<T>(data: unknown): data is BridgeEnvelope<T> {
  return !!data && typeof data === "object" && ("success" in data || "result" in data || "error" in data);
}

function unwrapBridgeData<T>(data: unknown): T {
  if (isEnvelope<T>(data)) {
    if (data.success === false) {
      throw new Error(typeof data.error === "string" ? data.error : "Construction OS bridge returned an error");
    }

    if ("result" in data) {
      return data.result as T;
    }
  }

  return data as T;
}

function getBridgeErrorMessage(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) return `Bridge ${status}: ${data.trim()}`;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim()) return `Bridge ${status}: ${record.error}`;
    if (typeof record.message === "string" && record.message.trim()) return `Bridge ${status}: ${record.message}`;
    try {
      return `Bridge ${status}: ${JSON.stringify(record)}`;
    } catch {
      /* fall through */
    }
  }

  return `Construction OS bridge failed (${status})`;
}

async function invoke<T>(action: BridgeAction, extra: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("Supabase not configured");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in to load Construction OS data");
  }

  const bridgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/construction-os-bridge`;
  let response: Response;

  try {
    response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:
          import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...extra }),
    });
  } catch {
    throw new Error(
      "Cannot reach the Construction OS bridge. The edge function may not be deployed on this Supabase project yet.",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    throw new Error(getBridgeErrorMessage(data, response.status));
  }

  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
    throw new Error(String((data as { error: unknown }).error));
  }

  return unwrapBridgeData<T>(data);
}

export const constructionOsBridge = {
  listTenants: () => invoke<CoTenantRow[]>("list_tenants"),
  getTenantData: (orgId: string) => invoke<CoTenantData>("get_tenant_data", { org_id: orgId }),
  listUsers: (orgId: string) => invoke<CoUserRow[]>("list_users", { org_id: orgId }),
  disableUser: (userId: string) => invoke<{ ok: true }>("disable_user", { user_id: userId }),
  enableUser: (userId: string) => invoke<{ ok: true }>("enable_user", { user_id: userId }),
  reassignUser: (userId: string, newOrgId: string) =>
    invoke<{ ok: true }>("reassign_user", { user_id: userId, new_org_id: newOrgId }),
  suspendTenant: (orgId: string) => invoke<{ ok: true }>("suspend_tenant", { org_id: orgId }),
  deleteTenant: (orgId: string) => invoke<{ ok: true }>("delete_tenant", { org_id: orgId }),
};
