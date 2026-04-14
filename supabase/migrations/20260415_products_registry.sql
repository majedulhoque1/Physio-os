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
