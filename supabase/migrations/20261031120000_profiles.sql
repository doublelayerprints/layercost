-- EVO-7 / ADR-0031 — visible display names and quote audit tags.
--
-- A user has one display name, stored in `public.profiles` and visible to the
-- members of the shared workspaces the user belongs to. Emails remain visible
-- only to workspace owners. Quotes keep storing `created_by`/`updated_by` UUIDs;
-- the UI resolves the current display name at read time.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- All access goes through security-definer RPCs, including reads.
revoke all on table public.profiles from public, anon, authenticated;
grant all on table public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- Name derivation
-- ---------------------------------------------------------------------------

-- Prefer an explicit display name, then the Google/profile name, then the
-- email local part. The result is always trimmed, whitespace-normalized and
-- at most 40 characters.
create or replace function public.profile_name_from_user(
  p_display_name text,
  p_full_name text,
  p_name text,
  p_email text
)
returns text
language sql
immutable
as $$
  select left(
    coalesce(
      nullif(btrim(regexp_replace(p_display_name, '\s+', ' ', 'g')), ''),
      nullif(btrim(regexp_replace(p_full_name, '\s+', ' ', 'g')), ''),
      nullif(btrim(regexp_replace(p_name, '\s+', ' ', 'g')), ''),
      nullif(btrim(split_part(coalesce(p_email, ''), '@', 1)), ''),
      'Membro'
    ),
    40
  );
$$;

-- ---------------------------------------------------------------------------
-- Backfill and lazy creation
-- ---------------------------------------------------------------------------

-- Existing accounts get a profile immediately. New accounts get theirs on the
-- first `get_my_profile` call (every login loads the profile in Settings), so
-- the auth schema has no application triggers and data-only restores do not
-- insert profile rows twice.
insert into public.profiles (user_id, display_name)
select
  u.id,
  public.profile_name_from_user(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.email::text
  )
from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- RPC: read and write the current user's display name
-- ---------------------------------------------------------------------------

create or replace function public.get_my_profile()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.profiles (user_id, display_name)
  select
    u.id,
    public.profile_name_from_user(
      u.raw_user_meta_data->>'display_name',
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      u.email::text
    )
  from auth.users u
  where u.id = v_user
  on conflict (user_id) do nothing;

  select p.display_name into v_name
  from public.profiles p
  where p.user_id = v_user;

  return v_name;
end;
$$;

create or replace function public.set_my_profile(p_display_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_name := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
  if v_name = '' or char_length(v_name) > 40 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  insert into public.profiles (user_id, display_name)
  values (v_user, v_name)
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        updated_at = now();

  return v_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Directory and workspace kind
-- ---------------------------------------------------------------------------

-- The return type changes, so the function must be recreated. Grants are
-- re-applied at the end of this migration.
drop function if exists public.list_my_workspaces();

create or replace function public.list_my_workspaces()
returns table (
  workspace_id text,
  name text,
  role text,
  kind text,
  joined_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select m.workspace_id, w.name, m.role, w.kind, m.created_at
  from public.workspace_members m
  join public.workspaces w on w.id = m.workspace_id
  where m.user_id = auth.uid()
  order by m.created_at, m.workspace_id;
$$;

drop function if exists public.list_workspace_members(text);

create or replace function public.list_workspace_members(p_workspace_id text)
returns table (
  user_id uuid,
  role text,
  email text,
  display_name text,
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
    select
      m.user_id,
      m.role,
      case when v_is_owner then u.email::text else null end,
      coalesce(
        p.display_name,
        public.profile_name_from_user(
          u.raw_user_meta_data->>'display_name',
          u.raw_user_meta_data->>'full_name',
          u.raw_user_meta_data->>'name',
          u.email::text
        )
      )::text,
      m.created_at
    from public.workspace_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    where m.workspace_id = p_workspace_id
    order by m.created_at, m.user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.profile_name_from_user(text, text, text, text) from public;
revoke all on function public.get_my_profile() from public;
revoke all on function public.set_my_profile(text) from public;
revoke all on function public.list_my_workspaces() from public;
revoke all on function public.list_workspace_members(text) from public;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.set_my_profile(text) to authenticated;
grant execute on function public.list_my_workspaces() to authenticated;
grant execute on function public.list_workspace_members(text) to authenticated;
