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
-- metadata (subscription_status) -- remote action handled via bridge.
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
