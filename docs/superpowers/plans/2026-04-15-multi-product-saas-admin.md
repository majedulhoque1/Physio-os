# Multi-Product SaaS Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Construction OS bridge 400, then evolve Super Admin into a product-agnostic SaaS control plane with working cross-product subscription management and tenant actions.

**Architecture:** Additive, non-destructive. Introduce a `products` registry and a `tenants` mapping table layered *on top of* existing `clinics` / `clinic_subscriptions` (no destructive rename). Generic `product-bridge` edge function routes to any product's Supabase project by registry lookup. Super Admin UI becomes registry-driven. Subscription RPCs gain `product_key` awareness while remaining backward-compatible.

**Tech Stack:** React + TS, Tailwind, Supabase (Postgres + RLS + Edge Functions/Deno), React Router.

---

## File Structure

**New files:**
- `supabase/migrations/20260415_products_registry.sql` — `products` + `tenants` tables + seed
- `supabase/migrations/20260415_product_aware_rpcs.sql` — generalize subscription RPCs
- `supabase/functions/product-bridge/index.ts` — generic bridge (replaces `construction-os-bridge`)
- `src/lib/productBridge.ts` — client, replaces `constructionOsBridge.ts`
- `src/hooks/useProducts.ts` — registry loader
- `src/hooks/useProductTenants.ts` — generalized tenant list/detail
- `src/pages/super-admin/products/ProductTenants.tsx` — single component driven by `:productKey` route param
- `src/pages/super-admin/products/ProductTenantDetail.tsx` — same, for detail
- `src/pages/super-admin/SuperAdminProducts.tsx` — registry admin page
- `src/types/products.ts` — shared types

**Modified files:**
- `src/components/super-admin/SuperAdminShell.tsx` — dynamic product nav
- `src/App.tsx` — registry-driven routes
- `src/pages/super-admin/SuperAdminBilling.tsx` — cross-product billing
- `src/lib/constructionOsBridge.ts` — thin shim re-exporting productBridge (delete after callers migrated)
- `src/hooks/useConstructionOsTenants.ts` — thin shim (delete after callers migrated)

**Deleted after migration complete (separate task):**
- `supabase/functions/construction-os-bridge/index.ts`
- `src/lib/constructionOsBridge.ts`
- `src/hooks/useConstructionOsTenants.ts`
- `src/pages/super-admin/products/ConstructionOsTenants.tsx`
- `src/pages/super-admin/products/ConstructionOsTenantDetail.tsx`

---

## Task 1: Diagnose the Construction OS bridge 400

**Files:**
- Inspect only — no edits.

- [ ] **Step 1: Verify env secrets on this Supabase project**

Run (PowerShell/bash, with Supabase CLI linked to project):
```bash
supabase secrets list
```
Expected: `SUPER_ADMIN_EMAIL` and `PRODUCT_B_ADMIN_SECRET` present. If missing, set:
```bash
supabase secrets set SUPER_ADMIN_EMAIL=majedulhoqueofficial@gmail.com
supabase secrets set PRODUCT_B_ADMIN_SECRET=<value-from-rxhylzbhefghieonnlny-project>
```

- [ ] **Step 2: Probe the remote admin-bridge directly**

Run:
```bash
curl -i -X POST https://rxhylzbhefghieonnlny.supabase.co/functions/v1/admin-bridge \
  -H "content-type: application/json" \
  -H "x-admin-secret: <PRODUCT_B_ADMIN_SECRET>" \
  -d '{"action":"list_tenants"}'
```

Document the response in the commit message of Task 2. Three possible outcomes:
- `200 OK` with JSON → the hub edge function is the problem (env or deploy). Go to Task 2 step 3.
- `404` → admin-bridge doesn't exist on remote project. Stop; user must deploy it remotely. Note in plan.
- `4xx` with error → remote contract mismatch. Surface the real error via Task 2.

- [ ] **Step 3: Verify local edge function is deployed**

Run:
```bash
supabase functions list
```
Expected: `construction-os-bridge` present. If not:
```bash
supabase functions deploy construction-os-bridge
```

- [ ] **Step 4: Commit findings**

```bash
git commit --allow-empty -m "docs: diagnose construction-os-bridge 400 (findings in body)"
```

---

## Task 2: Surface real bridge error messages

**Files:**
- Modify: `src/lib/constructionOsBridge.ts:55-69`

- [ ] **Step 1: Improve `getBridgeErrorMessage` to never swallow the upstream body**

Replace lines 55-69 of `src/lib/constructionOsBridge.ts`:
```ts
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
```

- [ ] **Step 2: Manual test**

Reload `/super-admin/products/construction-os` in the browser. Confirm the error message now contains the real upstream cause (e.g. `Bridge 403: forbidden`, `Bridge 400: invalid action`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/constructionOsBridge.ts
git commit -m "fix(super-admin): surface upstream bridge error body instead of generic 400"
```

---

## Task 3: Create products registry + tenants mapping (migration)

**Files:**
- Create: `supabase/migrations/20260415_products_registry.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260415_products_registry.sql`:
```sql
-- Multi-product SaaS control plane: products + tenants registry.
-- Non-destructive: layers on top of existing clinics / clinic_subscriptions.

create table if not exists products (
  product_key text primary key,
  display_name text not null,
  supabase_url text,
  bridge_secret_name text,
  is_local boolean not null default false,
  status text not null default 'active' check (status in ('active','disabled')),
  sort_order int not null default 100,
  icon_key text,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy sa_products_read on products
  for select to authenticated
  using (coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficial@gmail.com');

create policy sa_products_write on products
  for all to authenticated
  using (coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficial@gmail.com')
  with check (coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficial@gmail.com');

-- Tenants: unified mapping across products.
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  product_key text not null references products(product_key) on delete restrict,
  external_id text not null,
  name text not null,
  owner_email text,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now(),
  unique (product_key, external_id)
);

alter table tenants enable row level security;

create policy sa_tenants_read on tenants
  for select to authenticated
  using (coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficial@gmail.com');

create policy sa_tenants_write on tenants
  for all to authenticated
  using (coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficial@gmail.com')
  with check (coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficial@gmail.com');

-- Seed products.
insert into products (product_key, display_name, is_local, status, sort_order, icon_key)
values
  ('physio_os', 'Physio OS', true, 'active', 10, 'building'),
  ('construction_os', 'Construction OS', false, 'active', 20, 'hardhat')
on conflict (product_key) do update
  set display_name = excluded.display_name,
      is_local = excluded.is_local,
      sort_order = excluded.sort_order,
      icon_key = excluded.icon_key;

update products
  set supabase_url = 'https://rxhylzbhefghieonnlny.supabase.co',
      bridge_secret_name = 'PRODUCT_B_ADMIN_SECRET'
  where product_key = 'construction_os';

-- Backfill tenants from existing clinics.
insert into tenants (product_key, external_id, name, owner_email, status, created_at)
select
  'physio_os',
  c.id::text,
  c.name,
  (select u.email from auth.users u where u.id = c.owner_user_id),
  'active',
  c.created_at
from clinics c
on conflict (product_key, external_id) do nothing;
```

- [ ] **Step 2: Apply migration locally (or to linked project)**

Run:
```bash
supabase db push
```
Expected: migration applies; no errors.

- [ ] **Step 3: Verify**

Run (Supabase SQL editor or psql):
```sql
select product_key, display_name, is_local from products order by sort_order;
select product_key, count(*) from tenants group by product_key;
```
Expected: `physio_os` (true), `construction_os` (false); tenants count matches `select count(*) from clinics`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415_products_registry.sql
git commit -m "feat(super-admin): add products + tenants registry (non-destructive)"
```

---

## Task 4: Product-aware subscription RPCs

**Files:**
- Create: `supabase/migrations/20260415_product_aware_rpcs.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260415_product_aware_rpcs.sql`:
```sql
-- Product-aware subscription + tenant RPCs. Backward-compatible: existing
-- clinic-id RPCs continue to work. New tenant-id overloads route for any product.

-- Resolve a tenant row (by id) into (product_key, external_id).
create or replace function _sa_resolve_tenant(p_tenant_id uuid)
returns table(product_key text, external_id text, name text)
language sql
stable
security definer
set search_path = public
as $$
  select product_key, external_id, name from tenants where id = p_tenant_id;
$$;

-- Cross-product subscription approval. For physio_os, updates clinic_subscriptions
-- keyed by external_id::uuid. For remote products, records intent in tenants
-- metadata (subscription_status) — remote action handled via bridge.
create or replace function sa_approve_subscription_v2(
  p_tenant_id uuid,
  p_plan_key text default 'starter'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product text;
  v_external text;
begin
  perform _sa_check_access();

  select product_key, external_id into v_product, v_external
  from tenants where id = p_tenant_id;

  if v_product is null then
    raise exception 'Tenant not found: %', p_tenant_id;
  end if;

  if v_product = 'physio_os' then
    update clinic_subscriptions
    set status = 'active',
        plan_key = p_plan_key,
        upgrade_requested_at = null,
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        updated_at = now()
    where clinic_id = v_external::uuid;

    if not found then
      raise exception 'clinic_subscriptions row not found for clinic_id %', v_external;
    end if;

    insert into subscription_invoices (clinic_id, status, amount_due_cents, currency, due_at)
    select v_external::uuid, 'open', sp.monthly_price_cents, 'bdt', now() + interval '7 days'
    from subscription_plans sp
    where sp.plan_key = p_plan_key;
  else
    update tenants set status = 'active' where id = p_tenant_id;
  end if;
end;
$$;

-- Suspend / resume / delete at hub level. For physio_os, cascades via sa_delete_tenant.
-- For remote products, caller is expected to also invoke the bridge.
create or replace function sa_set_tenant_status(
  p_tenant_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _sa_check_access();
  if p_status not in ('active','suspended','deleted') then
    raise exception 'invalid status: %', p_status;
  end if;
  update tenants set status = p_status where id = p_tenant_id;
  if not found then
    raise exception 'Tenant not found: %', p_tenant_id;
  end if;
end;
$$;

-- Cross-product tenant list. Joins tenants registry with physio_os subscription data.
create or replace function sa_list_all_tenants(p_search text default null)
returns table (
  tenant_id uuid,
  product_key text,
  external_id text,
  name text,
  owner_email text,
  status text,
  plan_key text,
  subscription_status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.product_key,
    t.external_id,
    t.name,
    t.owner_email,
    t.status,
    case when t.product_key = 'physio_os' then cs.plan_key else null end,
    case when t.product_key = 'physio_os' then cs.status else null end,
    t.created_at
  from tenants t
  left join clinic_subscriptions cs
    on t.product_key = 'physio_os' and cs.clinic_id = t.external_id::uuid
  where
    coalesce(auth.jwt() ->> 'email', '') = 'majedulhoqueofficial@gmail.com'
    and (p_search is null or p_search = '' or t.name ilike '%' || p_search || '%')
  order by t.created_at desc;
$$;

-- Platform stats now summed across all products.
create or replace function sa_platform_stats_v2()
returns table (
  total_tenants bigint,
  total_users bigint,
  active_subscriptions bigint,
  mrr_cents bigint,
  by_product json
)
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select
      (select count(*) from tenants where status != 'deleted') as total_tenants,
      (select count(*) from auth.users) as total_users,
      (select count(*) from clinic_subscriptions where status = 'active') as active_subs,
      (select coalesce(sum(sp.monthly_price_cents), 0)
         from clinic_subscriptions cs
         join subscription_plans sp on sp.plan_key = cs.plan_key
         where cs.status = 'active') as mrr
  ),
  grouped as (
    select product_key, count(*)::int as tenants
    from tenants
    where status != 'deleted'
    group by product_key
  )
  select
    c.total_tenants,
    c.total_users,
    c.active_subs,
    c.mrr,
    (select json_agg(json_build_object('product_key', product_key, 'tenants', tenants)) from grouped)
  from counts c;
$$;

-- Ensure trigger keeps tenants in sync when clinics are inserted/updated/deleted.
create or replace function _sync_physio_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into tenants (product_key, external_id, name, owner_email, status, created_at)
    values ('physio_os', new.id::text, new.name,
      (select email from auth.users where id = new.owner_user_id),
      'active', new.created_at)
    on conflict (product_key, external_id) do nothing;
  elsif tg_op = 'UPDATE' then
    update tenants
    set name = new.name,
        owner_email = (select email from auth.users where id = new.owner_user_id)
    where product_key = 'physio_os' and external_id = new.id::text;
  elsif tg_op = 'DELETE' then
    delete from tenants where product_key = 'physio_os' and external_id = old.id::text;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_physio_tenant on clinics;
create trigger trg_sync_physio_tenant
after insert or update or delete on clinics
for each row execute function _sync_physio_tenant();
```

- [ ] **Step 2: Apply**

Run `supabase db push`. Expected: success.

- [ ] **Step 3: Smoke-test via SQL**

```sql
select * from sa_platform_stats_v2();
select * from sa_list_all_tenants(null) limit 5;
```
Expected: both return rows; `by_product` JSON shows physio_os count.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415_product_aware_rpcs.sql
git commit -m "feat(super-admin): product-aware subscription + tenant RPCs"
```

---

## Task 5: Generic product-bridge edge function

**Files:**
- Create: `supabase/functions/product-bridge/index.ts`

- [ ] **Step 1: Write the edge function**

Create `supabase/functions/product-bridge/index.ts`:
```ts
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
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy product-bridge
```

- [ ] **Step 3: Set env vars (if not already set)**

```bash
supabase secrets set SUPER_ADMIN_EMAIL=majedulhoqueofficial@gmail.com
supabase secrets set PRODUCT_B_ADMIN_SECRET=<value>
```

- [ ] **Step 4: Smoke-test**

```bash
curl -i -X POST "$VITE_SUPABASE_URL/functions/v1/product-bridge" \
  -H "authorization: Bearer <super-admin-jwt>" \
  -H "content-type: application/json" \
  -d '{"product_key":"construction_os","action":"list_tenants"}'
```
Expected: `{"success":true,"result":[...]}` OR the real upstream error.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/product-bridge/index.ts
git commit -m "feat(super-admin): generic product-bridge edge function (registry-driven)"
```

---

## Task 6: Client-side productBridge + hooks

**Files:**
- Create: `src/lib/productBridge.ts`
- Create: `src/hooks/useProducts.ts`
- Create: `src/hooks/useProductTenants.ts`

- [ ] **Step 1: Create `src/lib/productBridge.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/hooks/useProducts.ts`**

```ts
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
```

- [ ] **Step 3: Create `src/hooks/useProductTenants.ts`**

```ts
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
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no new errors in the three new files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/productBridge.ts src/hooks/useProducts.ts src/hooks/useProductTenants.ts
git commit -m "feat(super-admin): productBridge client + product/tenant hooks"
```

---

## Task 7: Registry-driven sidebar

**Files:**
- Modify: `src/components/super-admin/SuperAdminShell.tsx:19-26`

- [ ] **Step 1: Replace hardcoded `productItems`**

In `src/components/super-admin/SuperAdminShell.tsx`, remove lines 23-26 (`const productItems = [...]`). Add import at top:
```tsx
import { useProducts } from "@/hooks/useProducts";
```

Inside `SuperAdminShell()` component, add after `const [productsOpen, setProductsOpen] = useState(...)`:
```tsx
const { products } = useProducts({ onlyActive: true });
const iconMap: Record<string, typeof Building2> = {
  building: Building2,
  hardhat: HardHat,
  package: Package,
};
const productItems = products.map((p) => ({
  to: `/super-admin/products/${p.product_key}`,
  icon: iconMap[p.icon_key ?? ""] ?? Package,
  label: p.display_name,
}));
```

- [ ] **Step 2: Visual verify**

Run `npm run dev`, log in as super admin, open `/super-admin`. Expand Products dropdown. Expected: Physio OS and Construction OS both appear (from DB, not hardcoded).

- [ ] **Step 3: Commit**

```bash
git add src/components/super-admin/SuperAdminShell.tsx
git commit -m "feat(super-admin): registry-driven product sidebar"
```

---

## Task 8: Generalized ProductTenants page

**Files:**
- Create: `src/pages/super-admin/products/ProductTenants.tsx`
- Modify: `src/App.tsx` (add route)

- [ ] **Step 1: Read current ConstructionOsTenants for reference**

Run:
```bash
cat src/pages/super-admin/products/ConstructionOsTenants.tsx
```
Note the UI structure; the new component mirrors it but parameterized by `:productKey`.

- [ ] **Step 2: Create `src/pages/super-admin/products/ProductTenants.tsx`**

```tsx
import { useParams, Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useRemoteProductTenants } from "@/hooks/useProductTenants";

export default function ProductTenants() {
  const { productKey } = useParams<{ productKey: string }>();
  const { products, isLoading: productsLoading } = useProducts({ onlyActive: true });
  const product = products.find((p) => p.product_key === productKey);

  const { tenants, isLoading, error, refetch } = useRemoteProductTenants(productKey ?? "");

  if (productsLoading) return <div className="p-6">Loading product...</div>;
  if (!product) return <div className="p-6">Unknown product: {productKey}</div>;
  if (product.is_local) {
    return (
      <div className="p-6">
        <p className="nb-heading mb-2">{product.display_name}</p>
        <p className="text-sm">Local product — manage from the unified tenant list.</p>
        <Link to="/super-admin/tenants" className="underline">Go to tenants</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="nb-heading text-2xl">{product.display_name}</h1>
        <button onClick={refetch} className="nb-btn">Refresh</button>
      </div>
      {isLoading && <p>Loading tenants…</p>}
      {error && <div className="nb-alert-error">{error}</div>}
      {!isLoading && !error && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">External ID</th>
              <th className="p-2">Users</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={String(t.org_id)} className="border-t">
                <td className="p-2 font-mono text-xs">{String(t.org_id)}</td>
                <td className="p-2">{String(t.user_count ?? 0)}</td>
                <td className="p-2">
                  <Link
                    to={`/super-admin/products/${productKey}/tenants/${encodeURIComponent(String(t.org_id))}`}
                    className="underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire route in `src/App.tsx`**

Find the super-admin route section (search for `super-admin/products`). Replace the two existing `ConstructionOs*` routes with the generalized ones:
```tsx
<Route path="/super-admin/products/:productKey" element={<ProductTenants />} />
<Route path="/super-admin/products/:productKey/tenants/:externalId" element={<ProductTenantDetail />} />
```

Add imports:
```tsx
import ProductTenants from "@/pages/super-admin/products/ProductTenants";
import ProductTenantDetail from "@/pages/super-admin/products/ProductTenantDetail";
```

(If `ProductTenantDetail` not yet created, temporarily alias to `ProductTenants` — Task 9 creates the real one.)

- [ ] **Step 4: Manual test**

Navigate to `/super-admin/products/construction-os` (note: URL uses hyphen but DB uses underscore — check that your product_key seed matches the URL. If seeded as `construction_os`, link must be `/super-admin/products/construction_os`. Adjust sidebar in Task 7 accordingly. Confirm alignment.) Expected: tenant list renders or shows real bridge error.

- [ ] **Step 5: Commit**

```bash
git add src/pages/super-admin/products/ProductTenants.tsx src/App.tsx
git commit -m "feat(super-admin): generalized ProductTenants page driven by route param"
```

---

## Task 9: Generalized ProductTenantDetail + cross-product actions

**Files:**
- Create: `src/pages/super-admin/products/ProductTenantDetail.tsx`

- [ ] **Step 1: Create the detail page**

```tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { callProductBridge } from "@/lib/productBridge";
import { useProducts } from "@/hooks/useProducts";

export default function ProductTenantDetail() {
  const { productKey, externalId } = useParams<{ productKey: string; externalId: string }>();
  const navigate = useNavigate();
  const { products } = useProducts({ onlyActive: true });
  const product = products.find((p) => p.product_key === productKey);

  const [data, setData] = useState<unknown>(null);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!productKey || !externalId) return;
    setError(null);
    Promise.all([
      callProductBridge(productKey, "get_tenant_data", { org_id: externalId }),
      callProductBridge<Array<Record<string, unknown>>>(productKey, "list_users", { org_id: externalId }),
    ])
      .then(([d, u]) => { setData(d); setUsers(Array.isArray(u) ? u : []); })
      .catch((e: Error) => setError(e.message));
  }, [productKey, externalId]);

  async function act(action: "suspend_tenant" | "delete_tenant", confirmMsg: string) {
    if (!productKey || !externalId) return;
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      await callProductBridge(productKey, action, { org_id: externalId });
      if (action === "delete_tenant") navigate(`/super-admin/products/${productKey}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function actUser(userId: string, action: "disable_user" | "enable_user") {
    setBusy(true);
    setError(null);
    try {
      await callProductBridge(productKey ?? "", action, { user_id: userId });
      const refreshed = await callProductBridge<Array<Record<string, unknown>>>(
        productKey ?? "", "list_users", { org_id: externalId }
      );
      setUsers(Array.isArray(refreshed) ? refreshed : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!product) return <div className="p-6">Loading product…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="nb-heading text-2xl">
          {product.display_name} — {externalId}
        </h1>
        <div className="flex gap-2">
          <button className="nb-btn" disabled={busy}
            onClick={() => act("suspend_tenant", "Suspend this tenant?")}>Suspend</button>
          <button className="nb-btn bg-red-500" disabled={busy}
            onClick={() => act("delete_tenant", "DELETE this tenant? Irreversible.")}>Delete</button>
        </div>
      </div>

      {error && <div className="nb-alert-error">{error}</div>}

      <section>
        <h2 className="nb-heading mb-2">Users</h2>
        <table className="w-full text-sm">
          <thead><tr><th>Email</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u.id)} className="border-t">
                <td className="p-2">{String(u.email)}</td>
                <td className="p-2">{String(u.status)}</td>
                <td className="p-2">
                  {u.status === "active" ? (
                    <button className="nb-btn-sm" onClick={() => actUser(String(u.id), "disable_user")}>Disable</button>
                  ) : (
                    <button className="nb-btn-sm" onClick={() => actUser(String(u.id), "enable_user")}>Enable</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="nb-heading mb-2">Raw tenant data</h2>
        <pre className="text-xs bg-gray-100 p-3 overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

Navigate to a Construction OS tenant detail page. Confirm data loads, Suspend / Delete / Disable user buttons function (if the remote admin-bridge implements them).

- [ ] **Step 3: Commit**

```bash
git add src/pages/super-admin/products/ProductTenantDetail.tsx
git commit -m "feat(super-admin): generalized ProductTenantDetail with suspend/delete/user actions"
```

---

## Task 10: Unified tenants page + cross-product billing dashboard

**Files:**
- Modify: `src/pages/super-admin/SuperAdminDashboard.tsx` (use `sa_platform_stats_v2`)
- Modify: `src/pages/super-admin/SuperAdminTenants.tsx` (use `sa_list_all_tenants`)
- Modify: `src/pages/super-admin/SuperAdminBilling.tsx` (product filter)

- [ ] **Step 1: Swap platform stats RPC**

In `src/hooks/useSuperAdmin.ts` `usePlatformStats`, change `.rpc("sa_platform_stats")` to `.rpc("sa_platform_stats_v2")` and update the `PlatformStats` interface to:
```ts
export interface PlatformStats {
  total_tenants: number;
  total_users: number;
  active_subscriptions: number;
  mrr_cents: number;
  by_product: Array<{ product_key: string; tenants: number }>;
}
```

Update `src/pages/super-admin/SuperAdminDashboard.tsx` — rename any reference from `total_clinics` to `total_tenants`. Add a small "By product" breakdown card rendering `stats?.by_product`.

- [ ] **Step 2: Swap tenant list RPC**

In `src/hooks/useSuperAdmin.ts` `useTenantList`, change `.rpc("sa_list_tenants", ...)` to `.rpc("sa_list_all_tenants", { p_search: search || null })`. Update `TenantListItem` interface to match `UnifiedTenantRow` (from `useProductTenants.ts`). Propagate rename `clinic_id` → `tenant_id` and add `product_key`.

Update `src/pages/super-admin/SuperAdminTenants.tsx`:
- Add a product-key badge/column.
- Row click routes to `/super-admin/products/:product_key/tenants/:external_id` for non-physio_os products, or `/super-admin/tenants/:tenant_id` for physio_os (preserve existing behavior).

- [ ] **Step 3: Add product filter to billing**

In `src/pages/super-admin/SuperAdminBilling.tsx`, add a dropdown sourced from `useProducts({ onlyActive: true })`. Filter invoice rows by product_key client-side (until invoices are product-aware — see future work note).

- [ ] **Step 4: Type-check + manual test**

```bash
npx tsc --noEmit
npm run dev
```
Navigate through Dashboard, Tenants, Billing. Expected: no runtime errors; Dashboard shows by-product counts; Tenants list shows both products; Billing filter dropdown populated.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSuperAdmin.ts src/pages/super-admin/SuperAdminDashboard.tsx \
        src/pages/super-admin/SuperAdminTenants.tsx src/pages/super-admin/SuperAdminBilling.tsx
git commit -m "feat(super-admin): unified cross-product stats, tenants, billing filter"
```

---

## Task 11: Products registry admin page

**Files:**
- Create: `src/pages/super-admin/SuperAdminProducts.tsx`
- Modify: `src/App.tsx` (add route under `/super-admin/settings/products`)
- Modify: `src/components/super-admin/SuperAdminShell.tsx` (add nav link under Settings if desired)

- [ ] **Step 1: Create the page**

```tsx
import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { supabase as supabaseClient } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;

export default function SuperAdminProducts() {
  const { products, refetch } = useProducts({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(product_key: string, status: "active" | "disabled") {
    setBusy(true);
    const next = status === "active" ? "disabled" : "active";
    const { error } = await supabase.from("products").update({ status: next }).eq("product_key", product_key);
    setBusy(false);
    if (error) setError(error.message);
    else refetch();
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="nb-heading text-2xl">Products</h1>
      {error && <div className="nb-alert-error">{error}</div>}
      <table className="w-full text-sm">
        <thead><tr><th>Key</th><th>Name</th><th>Local</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.product_key} className="border-t">
              <td className="p-2 font-mono">{p.product_key}</td>
              <td className="p-2">{p.display_name}</td>
              <td className="p-2">{p.is_local ? "yes" : "no"}</td>
              <td className="p-2">{p.status}</td>
              <td className="p-2">
                <button className="nb-btn-sm" disabled={busy}
                  onClick={() => toggle(p.product_key, p.status)}>
                  {p.status === "active" ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500">
        Add new products by inserting into the <code>products</code> table. Remote products need
        <code>supabase_url</code>, <code>bridge_secret_name</code>, and the secret env var set on this project.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Add route in `src/App.tsx`**

```tsx
import SuperAdminProducts from "@/pages/super-admin/SuperAdminProducts";
// ...
<Route path="/super-admin/settings/products" element={<SuperAdminProducts />} />
```

- [ ] **Step 3: Manual test**

Navigate to `/super-admin/settings/products`. Expected: both products listed; toggle works; sidebar reflects status.

- [ ] **Step 4: Commit**

```bash
git add src/pages/super-admin/SuperAdminProducts.tsx src/App.tsx
git commit -m "feat(super-admin): products registry admin page"
```

---

## Task 12: Retire legacy construction-os-specific code

**Files:**
- Delete: `src/pages/super-admin/products/ConstructionOsTenants.tsx`
- Delete: `src/pages/super-admin/products/ConstructionOsTenantDetail.tsx`
- Delete: `src/hooks/useConstructionOsTenants.ts`
- Delete: `src/lib/constructionOsBridge.ts`
- Delete: `supabase/functions/construction-os-bridge/index.ts`

- [ ] **Step 1: Confirm no remaining imports**

Run:
```bash
grep -r "constructionOsBridge\|useCoTenant\|ConstructionOsTenants\|ConstructionOsTenantDetail\|construction-os-bridge" src/ supabase/
```
Expected: zero matches. If any remain, update them to use the generalized replacements.

- [ ] **Step 2: Delete files**

```bash
rm src/pages/super-admin/products/ConstructionOsTenants.tsx
rm src/pages/super-admin/products/ConstructionOsTenantDetail.tsx
rm src/hooks/useConstructionOsTenants.ts
rm src/lib/constructionOsBridge.ts
rm -r supabase/functions/construction-os-bridge
```

- [ ] **Step 3: Undeploy the old edge function**

```bash
supabase functions delete construction-os-bridge
```

- [ ] **Step 4: Type-check + run dev**

```bash
npx tsc --noEmit
npm run dev
```
Click through Dashboard, Tenants, Physio OS, Construction OS, Billing, Settings → Products. Expected: zero errors, all features work.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(super-admin): remove legacy construction-os-specific code (replaced by generic product-bridge)"
```

---

## Verification (end-to-end)

Run after all tasks:

1. **Bridge bug fixed:** `/super-admin/products/construction_os` either loads tenants OR shows a concrete upstream error (no more silent `Construction OS bridge failed (400)`).
2. **Registry drives UI:** disable `construction_os` in `/super-admin/settings/products`; sidebar drops it within a refresh.
3. **Cross-product dashboard:** `/super-admin` shows total tenants summed across products, by-product breakdown card present.
4. **Subscription approval works:** on a Physio OS tenant, call approve → `clinic_subscriptions.status='active'`, invoice row created.
5. **Tenant actions via bridge:** on a Construction OS tenant detail page, click Suspend → upstream receives `suspend_tenant`; UI shows success or real error.
6. **RLS holds:** non-super-admin account cannot select from `products` or `tenants` (`select * from products` returns 0 rows / permission error).
7. **Existing Physio OS flows unaffected:** admin dashboard, treatment plans, clinic login — all still work (trigger keeps `tenants` in sync on clinic create/update).
8. **New product drop-in:** `insert into products (product_key, display_name, is_local, supabase_url, bridge_secret_name, status, sort_order, icon_key) values ('petsheba','PetSheba',false,'https://...','PETSHEBA_ADMIN_SECRET','disabled',30,'package')` — appears in Products admin page with status=disabled; once enabled + secret set, sidebar + tenant listing work without code changes.

---

## Out of Scope

- Stripe / payment integration (manual invoice approval stays).
- Multi-role super admin (single email gate preserved).
- Impersonation tokens (needs separate design).
- Product-aware `subscription_invoices` table (current filter is client-side on physio-only invoices; future migration adds `product_key` to invoices).
