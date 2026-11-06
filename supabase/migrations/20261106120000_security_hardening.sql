-- Security audit follow-up (6 November 2026).
--
-- Three hardening fixes found while auditing the cloud schema. They do not
-- change the application contract: the client already sends `created_by` and
-- never deletes or moves a sent quote on purpose, so the new guards only reject
-- requests that were never legitimate.
--
-- 1. Force `created_by` on insert. Before this migration any member could
--    insert a quote attributing it to another user, which made the audit tags
--    ("Creato da …") falsifiable. `created_at` is deliberately left to the
--    caller: the first-login import replays the local quotes with their
--    original timestamps, and overriding it would silently rewrite the history
--    and the list order.
-- 2. Lock `workspace_id` on quotes that are `sent` or `completed`. Mixed with
--    the existing economic lock, a sent document can no longer move to another
--    space behind the customer's back. Archiving and soft-deletion stay allowed
--    because the UI offers them for every status (AGENTS.md: archive, don't
--    delete); they do not change the document or its figures.
-- 3. Apply the quote cap when an UPDATE moves a row between workspaces; before
--    this, a member could bypass a full workspace by moving quotes in.

-- ---------------------------------------------------------------------------
-- 1. Audit fields are assigned by the database, not by the caller
-- ---------------------------------------------------------------------------

create or replace function public.set_created_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- service_role and SQL sessions without a JWT keep full control (fixtures,
  -- backups, administrative repairs); the browser is always `authenticated`.
  if auth.uid() is null then
    return new;
  end if;

  new.created_by = auth.uid();
  return new;
end;
$$;

create trigger quotes_set_created_fields
before insert on public.quotes
for each row execute function public.set_created_fields();

create trigger energy_tariffs_set_created_fields
before insert on public.energy_tariffs
for each row execute function public.set_created_fields();

create trigger printers_set_created_fields
before insert on public.printers
for each row execute function public.set_created_fields();

create trigger materials_set_created_fields
before insert on public.materials
for each row execute function public.set_created_fields();

create trigger extras_set_created_fields
before insert on public.extras
for each row execute function public.set_created_fields();

-- ---------------------------------------------------------------------------
-- 2. A sent or completed quote is immutable in its placement too
-- ---------------------------------------------------------------------------

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
    -- Placement: a sent document cannot move to another workspace, where the
    -- same user might have different permissions or a different cap.
    -- `deleted_at` and `archived_at` stay writable: the UI archives and
    -- soft-deletes any quote, and neither changes the document.
    or new.workspace_id is distinct from old.workspace_id
    or new.schema_version is distinct from old.schema_version
  ) then
    raise exception 'quote_locked' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Moving a quote to another workspace counts as an insert there
-- ---------------------------------------------------------------------------

create or replace function public.enforce_workspace_quote_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_count integer;
  v_moved boolean := tg_op = 'UPDATE' and new.workspace_id is distinct from old.workspace_id;
begin
  -- A plain update of a live row, or a soft delete, does not change the count.
  -- A restore from tombstone and a move to another workspace both do.
  if tg_op = 'UPDATE'
     and not v_moved
     and (old.deleted_at is null or new.deleted_at is not null) then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('quotes:' || new.workspace_id)
  );

  select coalesce(max(l.max_quotes), 500) into v_max
  from public.workspace_limits l
  where l.workspace_id = new.workspace_id;

  select count(*) into v_count
  from public.quotes q
  where q.workspace_id = new.workspace_id
    and q.deleted_at is null;

  -- The row being inserted/moved/restored is not counted yet (BEFORE trigger),
  -- so `>=` rejects the one that would exceed the cap.
  if v_count >= v_max then
    raise exception 'quote_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.set_created_fields() from public;

-- The triggers run as the table owner; no role needs to call the function.