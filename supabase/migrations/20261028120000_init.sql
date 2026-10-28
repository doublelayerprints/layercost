-- LayerCost cloud schema (T5.4.2).
--
-- The local app remains the source of truth for drafts, theme and locale.
-- This schema stores the shared workspace configuration and saved quotes.
-- All money is in micro-euros (bigint), percentages in basis points (integer),
-- time in seconds and mass in centigrams, matching the domain.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id text primary key,
  name text not null check (length(btrim(name)) > 0),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id text not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.settings (
  workspace_id text primary key references public.workspaces (id) on delete cascade,
  currency text not null default 'EUR' check (currency = 'EUR'),
  locale text not null default 'it-IT' check (locale = 'it-IT'),
  labor_rate_per_hour bigint not null default 0 check (labor_rate_per_hour >= 0),
  failure_rate_bp integer not null default 500 check (failure_rate_bp between 0 and 10000),
  time_overhead_bp integer not null default 0 check (time_overhead_bp between 0 and 10000),
  pricing_mode text not null default 'markup' check (pricing_mode in ('markup', 'margin')),
  markup_bp integer not null default 3000 check (markup_bp between 0 and 100000),
  margin_bp integer not null default 2500 check (margin_bp between 0 and 9999),
  rounding_step bigint not null default 100000 check (rounding_step > 0),
  rounding_mode text not null default 'up' check (rounding_mode in ('up', 'nearest', 'down')),
  vat_mode text not null default 'none' check (vat_mode in ('none', 'excluded', 'included')),
  vat_rate_bp integer not null default 2200 check (vat_rate_bp between 0 and 10000),
  allocation_mode text not null default 'proportional'
    check (allocation_mode in ('proportional', 'equalPerUnit')),
  onboarding_complete boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.energy_tariffs (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  label text not null check (length(btrim(label)) > 0),
  price_per_kwh bigint not null check (price_per_kwh >= 0),
  effective_from date not null,
  notes text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint energy_tariffs_workspace_id_id_key unique (workspace_id, id)
);

create index energy_tariffs_workspace_effective_idx
  on public.energy_tariffs (workspace_id, effective_from desc);

create table public.printers (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  model text not null check (length(btrim(model)) > 0),
  purchase_price bigint not null check (purchase_price >= 0),
  residual_value_bp integer not null check (residual_value_bp between 0 and 10000),
  expected_life_hours integer not null check (expected_life_hours > 0),
  maintenance_per_hour bigint not null check (maintenance_per_hour >= 0),
  startup_minutes integer not null check (startup_minutes >= 0),
  multicolor boolean not null default false,
  build_volume_mm integer[] not null check (
    array_length(build_volume_mm, 1) = 3
    and build_volume_mm[1] > 0
    and build_volume_mm[2] > 0
    and build_volume_mm[3] > 0
  ),
  rated_power_w integer not null check (rated_power_w > 0),
  power_profiles jsonb not null default '{}'::jsonb
    check (jsonb_typeof(power_profiles) = 'object'),
  default_avg_watts integer not null check (default_avg_watts > 0),
  energy_tariff_id text,
  notes text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint printers_energy_tariff_fkey
    foreign key (workspace_id, energy_tariff_id)
    references public.energy_tariffs (workspace_id, id)
);

create index printers_workspace_deleted_idx on public.printers (workspace_id, deleted_at);

create table public.materials (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  family text not null check (
    family in (
      'PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'PLA_CF', 'PETG_CF',
      'PVA', 'PA', 'PC', 'HIPS', 'OTHER'
    )
  ),
  price_per_kg bigint not null check (price_per_kg >= 0),
  spool_net_weight_g integer not null check (spool_net_weight_g > 0),
  supplier text,
  color text,
  failure_rate_bp integer check (failure_rate_bp between 0 and 10000),
  notes text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index materials_workspace_deleted_idx on public.materials (workspace_id, deleted_at);

create table public.extras (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  amount bigint not null check (amount >= 0),
  unit text not null check (unit in ('perUnit', 'perJob')),
  category text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index extras_workspace_deleted_idx on public.extras (workspace_id, deleted_at);

create table public.quotes (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  status text not null check (status in ('saved', 'sent', 'completed')),
  name text not null check (length(btrim(name)) > 0),
  customer text,
  quote_date date not null,
  locale text not null check (locale in ('it', 'en')),
  lines jsonb not null check (jsonb_typeof(lines) = 'array'),
  job jsonb not null check (jsonb_typeof(job) = 'object'),
  pricing jsonb not null check (jsonb_typeof(pricing) = 'object'),
  snapshot jsonb check (snapshot is null or jsonb_typeof(snapshot) = 'object'),
  result jsonb check (result is null or jsonb_typeof(result) = 'object'),
  engine_version text,
  schema_version integer not null default 4 check (schema_version between 1 and 1000),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create index quotes_workspace_status_idx
  on public.quotes (workspace_id, status, quote_date desc);
create index quotes_workspace_updated_idx on public.quotes (workspace_id, updated_at);
create index quotes_workspace_deleted_idx on public.quotes (workspace_id, deleted_at);

-- ---------------------------------------------------------------------------
-- Functions and triggers
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

-- Kept intentionally trivial: the daily GitHub Action only needs a database request.
create or replace function public.keepalive()
returns text
language sql
security definer
set search_path = ''
as $$
  select 'ok'::text;
$$;

create or replace function public.set_audit_fields()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' and auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.protect_locked_quote()
returns trigger
language plpgsql
as $$
begin
  if new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by then
    raise exception 'quote_metadata_locked' using errcode = 'P0001';
  end if;

  if old.status = 'completed' and new.status <> 'completed' then
    raise exception 'quote_locked' using errcode = 'P0001';
  end if;

  if old.status = 'sent' and new.status not in ('sent', 'completed') then
    raise exception 'quote_locked' using errcode = 'P0001';
  end if;

  if old.status = 'saved' and new.status not in ('saved', 'sent', 'completed') then
    raise exception 'quote_locked' using errcode = 'P0001';
  end if;

  if old.status in ('sent', 'completed') and (
    new.lines is distinct from old.lines
    or new.job is distinct from old.job
    or new.pricing is distinct from old.pricing
    or new.snapshot is distinct from old.snapshot
    or new.result is distinct from old.result
    or new.name is distinct from old.name
    or new.customer is distinct from old.customer
    or new.quote_date is distinct from old.quote_date
    or new.locale is distinct from old.locale
    or new.engine_version is distinct from old.engine_version
  ) then
    raise exception 'quote_locked' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining integer;
begin
  if tg_op = 'DELETE' and old.role <> 'owner' then
    return old;
  end if;
  if tg_op = 'UPDATE' and (old.role <> 'owner' or new.role = 'owner') then
    return new;
  end if;

  select count(*) into remaining
  from public.workspace_members
  where workspace_id = old.workspace_id
    and role = 'owner'
    and user_id <> old.user_id;

  if remaining = 0 then
    raise exception 'last_owner' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger settings_set_audit_fields
before update on public.settings
for each row execute function public.set_audit_fields();

create trigger energy_tariffs_set_audit_fields
before update on public.energy_tariffs
for each row execute function public.set_audit_fields();

create trigger printers_set_audit_fields
before update on public.printers
for each row execute function public.set_audit_fields();

create trigger materials_set_audit_fields
before update on public.materials
for each row execute function public.set_audit_fields();

create trigger extras_set_audit_fields
before update on public.extras
for each row execute function public.set_audit_fields();

create trigger quotes_set_audit_fields
before update on public.quotes
for each row execute function public.set_audit_fields();

create trigger quotes_protect_locked
before update on public.quotes
for each row execute function public.protect_locked_quote();

create trigger workspace_members_protect_last_owner_on_role
before update of role on public.workspace_members
for each row execute function public.protect_last_owner();

create trigger workspace_members_protect_last_owner_on_delete
before delete on public.workspace_members
for each row execute function public.protect_last_owner();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.settings enable row level security;
alter table public.energy_tariffs enable row level security;
alter table public.printers enable row level security;
alter table public.materials enable row level security;
alter table public.extras enable row level security;
alter table public.quotes enable row level security;

create policy workspaces_select_member
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id));

create policy workspaces_update_owner
on public.workspaces for update
to authenticated
using (public.is_workspace_owner(id))
with check (public.is_workspace_owner(id));

create policy workspace_members_select_member
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy workspace_members_insert_owner
on public.workspace_members for insert
to authenticated
with check (public.is_workspace_owner(workspace_id));

create policy workspace_members_update_owner
on public.workspace_members for update
to authenticated
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy workspace_members_delete_owner
on public.workspace_members for delete
to authenticated
using (public.is_workspace_owner(workspace_id));

create policy settings_select_member
on public.settings for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy settings_insert_member
on public.settings for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy settings_update_member
on public.settings for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy energy_tariffs_select_member
on public.energy_tariffs for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy energy_tariffs_insert_member
on public.energy_tariffs for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy energy_tariffs_update_member
on public.energy_tariffs for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy printers_select_member
on public.printers for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy printers_insert_member
on public.printers for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy printers_update_member
on public.printers for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy materials_select_member
on public.materials for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy materials_insert_member
on public.materials for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy materials_update_member
on public.materials for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy extras_select_member
on public.extras for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy extras_insert_member
on public.extras for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy extras_update_member
on public.extras for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy quotes_select_member
on public.quotes for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy quotes_insert_member
on public.quotes for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy quotes_update_member
on public.quotes for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

-- No delete policy on data tables: deletion is a soft delete via deleted_at.
-- No insert/delete policy on workspaces: the workspace is created by the admin.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on table public.workspaces from public, anon, authenticated;
revoke all on table public.workspace_members from public, anon, authenticated;
revoke all on table public.settings from public, anon, authenticated;
revoke all on table public.energy_tariffs from public, anon, authenticated;
revoke all on table public.printers from public, anon, authenticated;
revoke all on table public.materials from public, anon, authenticated;
revoke all on table public.extras from public, anon, authenticated;
revoke all on table public.quotes from public, anon, authenticated;

grant select, update on table public.workspaces to authenticated;
grant select, insert, update, delete on table public.workspace_members to authenticated;
grant select, insert, update on table public.settings to authenticated;
grant select, insert, update on table public.energy_tariffs to authenticated;
grant select, insert, update on table public.printers to authenticated;
grant select, insert, update on table public.materials to authenticated;
grant select, insert, update on table public.extras to authenticated;
grant select, insert, update on table public.quotes to authenticated;

revoke all on function public.is_workspace_member(text) from public;
revoke all on function public.is_workspace_owner(text) from public;
revoke all on function public.keepalive() from public;
revoke all on function public.set_audit_fields() from public;
revoke all on function public.protect_locked_quote() from public;
revoke all on function public.protect_last_owner() from public;

grant execute on function public.is_workspace_member(text) to authenticated;
grant execute on function public.is_workspace_owner(text) to authenticated;
grant execute on function public.keepalive() to anon, authenticated;
