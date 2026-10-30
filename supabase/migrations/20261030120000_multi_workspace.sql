-- EVO-4 / ADR-0028 — spazi separati.
--
-- 1. Primary keys become (workspace_id, id) so that every workspace can reuse
--    the same seed identifiers (printer-kobra-3, material-pla, ...).
-- 2. workspace_invites stores only the SHA-256 hash of a one-time code.
-- 3. The RPCs handle personal workspace creation, invites and membership.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Composite primary keys
-- ---------------------------------------------------------------------------

alter table public.printers drop constraint printers_energy_tariff_fkey;

alter table public.energy_tariffs drop constraint energy_tariffs_pkey;
alter table public.energy_tariffs add primary key (workspace_id, id);
alter table public.energy_tariffs drop constraint energy_tariffs_workspace_id_id_key;

alter table public.printers drop constraint printers_pkey;
alter table public.printers add primary key (workspace_id, id);
alter table public.printers add constraint printers_energy_tariff_fkey
  foreign key (workspace_id, energy_tariff_id)
  references public.energy_tariffs (workspace_id, id);

alter table public.materials drop constraint materials_pkey;
alter table public.materials add primary key (workspace_id, id);

alter table public.extras drop constraint extras_pkey;
alter table public.extras add primary key (workspace_id, id);

alter table public.quotes drop constraint quotes_pkey;
alter table public.quotes add primary key (workspace_id, id);

-- ---------------------------------------------------------------------------
-- Workspace kind
-- ---------------------------------------------------------------------------

-- "personal" is the automatic space of a user; "shared" is created explicitly.
-- The personal space is extra and does not consume the shared-workspace quota.
alter table public.workspaces
  add column kind text not null default 'shared'
  check (kind in ('personal', 'shared'));

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

create table public.workspace_invites (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('owner', 'editor')),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  used_count integer not null default 0 check (used_count >= 0),
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index workspace_invites_workspace_idx
  on public.workspace_invites (workspace_id, created_at desc);

-- All access goes through security-definer RPCs: no direct table grants.
alter table public.workspace_invites enable row level security;

revoke all on table public.workspace_invites from public, anon, authenticated;
grant all on table public.workspace_invites to service_role;

-- ---------------------------------------------------------------------------
-- Limits (hardcoded until EVO-2 / workspace_limits)
-- ---------------------------------------------------------------------------

create or replace function public.max_owned_workspaces()
returns integer
language sql
immutable
as $$
  select 10;
$$;

create or replace function public.max_workspace_members()
returns integer
language sql
immutable
as $$
  select 20;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create a workspace and make the caller its owner
-- ---------------------------------------------------------------------------

create or replace function public.create_workspace(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_owned integer;
  v_id text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if v_name = '' or length(v_name) > 80 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('workspaces:' || v_user::text)
  );

  select count(*) into v_owned
  from public.workspace_members m
  join public.workspaces w on w.id = m.workspace_id
  where m.user_id = v_user
    and m.role = 'owner'
    and w.kind = 'shared';

  if v_owned >= public.max_owned_workspaces() then
    raise exception 'workspace_limit' using errcode = 'P0001';
  end if;

  v_id := 'ws-' || replace(pg_catalog.gen_random_uuid()::text, '-', '');

  insert into public.workspaces (id, name) values (v_id, v_name);
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_id, v_user, 'owner');

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: personal workspace on first authenticated access
-- ---------------------------------------------------------------------------

create or replace function public.ensure_personal_workspace()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_name text;
  v_id text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('personal:' || v_user::text)
  );

  if exists (
    select 1
    from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
    where m.user_id = v_user
      and w.kind = 'personal'
  ) then
    return null;
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  v_name := left(
    'Spazio di ' || coalesce(nullif(split_part(v_email, '@', 1), ''), 'utente'),
    80
  );

  v_id := 'ws-' || replace(pg_catalog.gen_random_uuid()::text, '-', '');

  insert into public.workspaces (id, name, kind)
  values (v_id, v_name, 'personal');

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_id, v_user, 'owner');

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: invites
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

  select count(*) into v_members
  from public.workspace_members m
  where m.workspace_id = p_workspace_id;

  if v_members >= public.max_workspace_members() then
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

create or replace function public.revoke_invite(p_invite_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select i.workspace_id into v_workspace_id
  from public.workspace_invites i
  where i.id = p_invite_id;

  if v_workspace_id is null or not public.is_workspace_owner(v_workspace_id) then
    raise exception 'invite_invalid' using errcode = '42501';
  end if;

  update public.workspace_invites
  set revoked_at = now()
  where id = p_invite_id
    and revoked_at is null;
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

  select count(*) into v_members
  from public.workspace_members m
  where m.workspace_id = v_invite.workspace_id;

  if v_members >= public.max_workspace_members() then
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
-- RPC: reads
-- ---------------------------------------------------------------------------

create or replace function public.list_my_workspaces()
returns table (
  workspace_id text,
  name text,
  role text,
  joined_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select m.workspace_id, w.name, m.role, m.created_at
  from public.workspace_members m
  join public.workspaces w on w.id = m.workspace_id
  where m.user_id = auth.uid()
  order by m.created_at, m.workspace_id;
$$;

create or replace function public.list_workspace_members(p_workspace_id text)
returns table (
  user_id uuid,
  role text,
  email text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_is_owner boolean;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'not_member' using errcode = '42501';
  end if;

  v_is_owner := public.is_workspace_owner(p_workspace_id);

  return query
    select m.user_id, m.role,
           case when v_is_owner then u.email::text else null end,
           m.created_at
    from public.workspace_members m
    join auth.users u on u.id = m.user_id
    where m.workspace_id = p_workspace_id
    order by m.created_at, m.user_id;
end;
$$;

create or replace function public.list_workspace_invites(p_workspace_id text)
returns table (
  id text,
  role text,
  expires_at timestamptz,
  max_uses integer,
  used_count integer,
  revoked_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  return query
    select i.id, i.role, i.expires_at, i.max_uses, i.used_count,
           i.revoked_at, i.created_at
    from public.workspace_invites i
    where i.workspace_id = p_workspace_id
    order by i.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: leave a workspace
-- ---------------------------------------------------------------------------

create or replace function public.leave_workspace(p_workspace_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from public.workspace_members m
  where m.workspace_id = p_workspace_id
    and m.user_id = v_user;

  if not found then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.max_owned_workspaces() from public;
revoke all on function public.max_workspace_members() from public;
revoke all on function public.create_workspace(text) from public;
revoke all on function public.ensure_personal_workspace() from public;
revoke all on function public.create_invite(text, text, integer) from public;
revoke all on function public.revoke_invite(text) from public;
revoke all on function public.redeem_invite(text) from public;
revoke all on function public.list_my_workspaces() from public;
revoke all on function public.list_workspace_members(text) from public;
revoke all on function public.list_workspace_invites(text) from public;
revoke all on function public.leave_workspace(text) from public;

grant execute on function public.max_owned_workspaces() to authenticated;
grant execute on function public.max_workspace_members() to authenticated;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.ensure_personal_workspace() to authenticated;
grant execute on function public.create_invite(text, text, integer) to authenticated;
grant execute on function public.revoke_invite(text) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.list_my_workspaces() to authenticated;
grant execute on function public.list_workspace_members(text) to authenticated;
grant execute on function public.list_workspace_invites(text) to authenticated;
grant execute on function public.leave_workspace(text) to authenticated;
