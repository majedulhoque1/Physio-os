-- Super admin: edit/delete tenants and invoices

-- Update clinic basic fields
create or replace function sa_update_clinic(
  p_clinic_id uuid,
  p_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _sa_check_access();

  update clinics
  set name = coalesce(p_name, name)
  where id = p_clinic_id;

  if not found then
    raise exception 'Clinic not found';
  end if;
end;
$$;

-- Delete tenant entirely. Handles tables lacking ON DELETE CASCADE.
create or replace function sa_delete_tenant(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _sa_check_access();

  -- Child tables without cascade FKs
  delete from session_notes where clinic_id = p_clinic_id;
  delete from billing where clinic_id = p_clinic_id;
  delete from appointments where clinic_id = p_clinic_id;
  delete from treatment_plans where clinic_id = p_clinic_id;
  delete from patients where clinic_id = p_clinic_id;
  delete from therapists where clinic_id = p_clinic_id;
  delete from leads where clinic_id = p_clinic_id;
  delete from client_profiles where clinic_id = p_clinic_id;

  -- Cascade-backed tables cleared explicitly as well for clarity
  delete from subscription_invoices where clinic_id = p_clinic_id;
  delete from clinic_subscriptions where clinic_id = p_clinic_id;
  delete from clinic_memberships where clinic_id = p_clinic_id;

  delete from clinics where id = p_clinic_id;

  if not found then
    raise exception 'Clinic not found';
  end if;
end;
$$;

-- Edit invoice
create or replace function sa_update_invoice(
  p_invoice_id uuid,
  p_status text default null,
  p_amount_due_cents integer default null,
  p_due_at timestamptz default null,
  p_paid_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _sa_check_access();

  update subscription_invoices
  set
    status = coalesce(p_status, status),
    amount_due_cents = coalesce(p_amount_due_cents, amount_due_cents),
    due_at = case when p_due_at is not null then p_due_at else due_at end,
    paid_at = case when p_paid_at is not null then p_paid_at else paid_at end,
    updated_at = now()
  where id = p_invoice_id;

  if not found then
    raise exception 'Invoice not found';
  end if;
end;
$$;

-- Delete invoice
create or replace function sa_delete_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _sa_check_access();

  delete from subscription_invoices where id = p_invoice_id;

  if not found then
    raise exception 'Invoice not found';
  end if;
end;
$$;
