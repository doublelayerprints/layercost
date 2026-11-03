-- EVO-2 / ADR-0027 — signup aperto a tetto numerico e tetti per workspace.
--
-- 1. max_users() is the global signup cap, enforced by the Postgres Auth Hook
--    `before-user-created` (hook wired in the Supabase dashboard, see the
--    workspace runbook §17).
-- 2. workspace_limits stores the configurable per-workspace caps
--    (max_members default 20, max_quotes default 500). The client has
--    read-only access: limits change only via SQL/runbook.
-- 3. Triggers on workspace_members and quotes are the source of truth, with a
--    per-workspace advisory lock and P0001 errors `member_limit_reached` and
--    `quote_limit_reached`.
-- 4. The RPC pre-checks in create_invite/redeem_invite read the configurable
--    limit (fallback 20) instead of the fixed max_workspace_members(); the
--    trigger remains the source of truth.
-- 5. workspace_usage exposes members/quotes counts and caps to members.

-- ---------------------------------------------------------------------------
-- Global signup cap (Auth Hook `before-user-created`)
-- ---------------------------------------------------------------------------

create or replace function public.max_users()
returns integer
language sql
immutable
as $$
  select 1000;
$$;

create or replace function public.handle_before_user_created(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('users:signup')
  );

  select count(*) into v_count from auth.users;

  if v_count >= public.max_users() then
    raise exception 'signup_limit_reached' using errcode = 'P0001';
  end if;

  return payload;
end;
$$;

revoke all on function public.max_users() from public;
revoke all on function public.handle_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.max_users() to authenticated;
grant execute on function public.handle_before_user_created(jsonb) to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Per-workspace limits
-- ---------------------------------------------------------------------------

create table public.workspace_limits (
  workspace_id text primary key references public.workspaces (id) on delete cascade,
  max_members integer not null default 20 check (max_members > 0),
  max_quotes integer not null default 500 check (max_quotes > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.workspace_limits enable row level security;

create policy "members read limits"
  on public.workspace_limits for select to authenticated
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_limits.workspace_id
      and m.user_id = auth.uid()
  ));

-- Backfill: every existing workspace gets the defaults. New workspaces are
-- covered by the fallback (20/500) in the trigger and in workspace_usage.
insert into public.workspace_limits (workspace_id)
select id from public.workspaces
on conflict (workspace_id) do nothing;

revoke all on table public.workspace_limits from public, anon, authenticated;
grant select on table public.workspace_limits to authenticated;
grant all on table public.workspace_limits to service_role;

-- ---------------------------------------------------------------------------
-- Member cap trigger
-- ---------------------------------------------------------------------------

create or replace function public.enforce_workspace_member_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('members:' || new.workspace_id)
  );

  select coalesce(max(l.max_members), 20) into v_max
  from public.workspace_limits l
  where l.workspace_id = new.workspace_id;

  select count(*) into v_count
  from public.workspace_members m
  where m.workspace_id = new.workspace_id;

  if v_count >= v_max then
    raise exception 'member_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger workspace_members_cap
  before insert on public.workspace_members
  for each row execute function public.enforce_workspace_member_cap();

-- ---------------------------------------------------------------------------
-- Quote cap trigger
-- ---------------------------------------------------------------------------
-- Archived quotes count toward the cap; soft-deleted ones do not. A plain
-- UPDATE or a soft delete is not re-checked: only the restore of a tombstone
-- can push the count back over the limit.

create or replace function public.enforce_workspace_quote_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_count integer;
begin
  if tg_op = 'UPDATE'
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

  if v_count >= v_max then
    raise exception 'quote_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger quotes_cap
  before insert or update on public.quotes
  for each row execute function public.enforce_workspace_quote_cap();

-- ---------------------------------------------------------------------------
-- RPC pre-checks read the configurable limit (fallback 20)
-- ---------------------------------------------------------------------------

create or replace function public.create_invite(
  p_workspace_id text,
  p_role text,
  p_days integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_members integer;
  v_max integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  if p_role is null or p_role not in ('owner', 'editor') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  if p_days is null or p_days < 1 or p_days > 30 then
    raise exception 'invalid_expiry' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('members:' || p_workspace_id)
  );

  select coalesce(max(l.max_members), 20) into v_max
  from public.workspace_limits l
  where l.workspace_id = p_workspace_id;

  select count(*) into v_members
  from public.workspace_members m
  where m.workspace_id = p_workspace_id;

  if v_members >= v_max then
    raise exception 'member_limit' using errcode = 'P0001';
  end if;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  insert into public.workspace_invites (
    id, workspace_id, token_hash, role, expires_at
  ) values (
    'inv-' || replace(pg_catalog.gen_random_uuid()::text, '-', ''),
    p_workspace_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    p_role,
    now() + make_interval(days => p_days)
  );

  return v_token;
end;
$$;

create or replace function public.redeem_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_invite public.workspace_invites%rowtype;
  v_members integer;
  v_max integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_token is null or length(btrim(p_token)) < 16 then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;

  v_hash := encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');

  select * into v_invite
  from public.workspace_invites i
  where i.token_hash = v_hash
  for update;

  if not found then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;

  -- Redeeming twice is harmless: the membership already exists and the code
  -- is not consumed again. This check comes before the state checks so that
  -- a member can always re-open a workspace with the same code.
  if exists (
    select 1 from public.workspace_members m
    where m.workspace_id = v_invite.workspace_id
      and m.user_id = v_user
  ) then
    return v_invite.workspace_id;
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'invite_revoked' using errcode = 'P0001';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    raise exception 'invite_exhausted' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('members:' || v_invite.workspace_id)
  );

  select coalesce(max(l.max_members), 20) into v_max
  from public.workspace_limits l
  where l.workspace_id = v_invite.workspace_id;

  select count(*) into v_members
  from public.workspace_members m
  where m.workspace_id = v_invite.workspace_id;

  if v_members >= v_max then
    raise exception 'member_limit' using errcode = 'P0001';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_user, v_invite.role);

  update public.workspace_invites
  set used_count = used_count + 1
  where id = v_invite.id;

  return v_invite.workspace_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: workspace usage (members/quotes counts and caps)
-- ---------------------------------------------------------------------------

create or replace function public.workspace_usage(p_workspace_id text)
returns table (members integer, max_members integer, quotes integer, max_quotes integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid()
  ) then
    raise exception 'workspace_not_found' using errcode = 'P0001';
  end if;

  return query
    select
      (select count(*)::integer from public.workspace_members m
        where m.workspace_id = p_workspace_id),
      (select coalesce(max(l.max_members), 20)::integer from public.workspace_limits l
        where l.workspace_id = p_workspace_id),
      (select count(*)::integer from public.quotes q
        where q.workspace_id = p_workspace_id and q.deleted_at is null),
      (select coalesce(max(l.max_quotes), 500)::integer from public.workspace_limits l
        where l.workspace_id = p_workspace_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.enforce_workspace_member_cap() from public;
revoke all on function public.enforce_workspace_quote_cap() from public;
revoke all on function public.create_invite(text, text, integer) from public;
revoke all on function public.redeem_invite(text) from public;
revoke all on function public.workspace_usage(text) from public;

grant execute on function public.create_invite(text, text, integer) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.workspace_usage(text) to authenticated;
