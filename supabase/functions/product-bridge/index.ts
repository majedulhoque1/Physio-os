import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ACTIONS = new Set([
  "list_tenants", "get_tenant_data", "list_users",
  "disable_user", "enable_user", "reassign_user",
  "suspend_tenant", "resume_tenant", "delete_tenant",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b = parts[1].replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(b));
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization");
    if (!auth) return json({ success: false, error: "missing authorization" }, 401);
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const payload = decodeJwtPayload(token);
    if (!payload) return json({ success: false, error: "invalid token" }, 401);

    const superEmail = Deno.env.get("SUPER_ADMIN_EMAIL");
    if (!superEmail) return json({ success: false, error: "SUPER_ADMIN_EMAIL not set" }, 500);
    if (String(payload.email ?? "").toLowerCase() !== superEmail.toLowerCase()) {
      return json({ success: false, error: "forbidden" }, 403);
    }

    const body = await req.json();
    const { product_key, action, ...rest } = body ?? {};
    if (!product_key) return json({ success: false, error: "product_key required" }, 400);
    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return json({ success: false, error: `invalid action: ${action}` }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: product, error: pErr } = await admin
      .from("products")
      .select("product_key, supabase_url, bridge_secret_name, is_local, status")
      .eq("product_key", product_key)
      .maybeSingle();

    if (pErr) return json({ success: false, error: pErr.message }, 500);
    if (!product) return json({ success: false, error: `unknown product: ${product_key}` }, 404);
    if (product.status !== "active") return json({ success: false, error: "product disabled" }, 409);

    if (product.is_local) {
      return json({ success: false, error: "local products do not use bridge; call hub RPCs directly" }, 400);
    }

    if (!product.supabase_url || !product.bridge_secret_name) {
      return json({ success: false, error: "product misconfigured (supabase_url or bridge_secret_name missing)" }, 500);
    }

    const secret = Deno.env.get(product.bridge_secret_name);
    if (!secret) return json({ success: false, error: `env ${product.bridge_secret_name} not set` }, 500);

    const upstream = await fetch(`${product.supabase_url}/functions/v1/admin-bridge`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ action, ...rest }),
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") ?? "application/json";

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `upstream ${upstream.status}: ${text}` }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(text, { status: upstream.status, headers: { ...corsHeaders, "Content-Type": ct } });
  } catch (err) {
    return json({ success: false, error: String(err) }, 500);
  }
});
