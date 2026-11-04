-- EVO-8 / ADR-0034 — admin console for users, workspaces and workspace caps.
--
-- There is no global admin role in workspace_members: administration is
-- identified by a boolean flag on public.profiles. All admin access goes
-- through security-definer RPCs guarded by is_app_admin(), following the
-- profiles pattern (ADR-0031): no direct table grants, no RLS changes.
--
-- 1. profiles.is_admin (default false) marks the application administrator.
--    It is set by a one-off SQL statement at deploy time (workspace runbook);
--    the UUID never enters the repository.
-- 2. is_app_admin() reads the flag for the current JWT subject and returns
--    false for anonymous calls.
-- 3. Read RPCs expose minimal operational data only: emails, display names,
--    providers, account timestamps and per-workspace counts. No quote
--    contents, no economic data.
-- 4. admin_update_workspace_limits is the UI path for the workspace caps
--    previously editable only via SQL (runbook §16.2, EVO-2 / ADR-0027).
--    The triggers remain the source of truth: lowering a limit below the
--    current usage is allowed and only affects future inserts/restores.
-- 5. Destructive operations (delete/disable users, memberships, workspaces)
--    are out of scope: they require the Admin API with the service role.

-- ---------------------------------------------------------------------------
-- Admin marker
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column is_admin boolean not null default false;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: overview
-- ---------------------------------------------------------------------------

create or replace function public.admin_overview()
returns table (
  total_users bigint,
  max_users_limit integer,
  total_personal_workspaces bigint,
  total_shared_workspaces bigint,
  total_quotes bigint,
  total_memberships bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return query
    select
      (select count(*) from auth.users),
      public.max_users(),
      (select count(*) from public.workspaces w where w.kind = 'personal'),
      (select count(*) from public.workspaces w where w.kind = 'shared'),
      (select count(*) from public.quotes q where q.deleted_at is null),
      (select count(*) from public.workspace_members m);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: users
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  providers text,
  workspace_count integer,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return query
    select
      u.id,
      u.email::text,
      coalesce(
        p.display_name,
        public.profile_name_from_user(
          u.raw_user_meta_data->>'display_name',
          u.raw_user_meta_data->>'full_name',
          u.raw_user_meta_data->>'name',
          u.email::text
        )
      )::text,
      (
        select string_agg(distinct i.provider, ',')
        from auth.identities i
        where i.user_id = u.id
      ),
      (
        select count(*)::integer from public.workspace_members m
        where m.user_id = u.id
      ),
      u.created_at,
      u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    order by u.created_at desc, u.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: workspaces with usage and caps
-- ---------------------------------------------------------------------------

-- Counts follow the same semantics as the caps triggers (EVO-2): archived
-- quotes count, soft-deleted ones do not. Caps fall back to 20/500 when a
-- workspace has no row in workspace_limits.

create or replace function public.admin_list_workspaces()
returns table (
  workspace_id text,
  name text,
  kind text,
  members integer,
  max_members integer,
  quotes integer,
  max_quotes integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return query
    select
      w.id,
      w.name,
      w.kind,
      (
        select count(*)::integer from public.workspace_members m
        where m.workspace_id = w.id
      ),
      (
        select coalesce(max(l.max_members), 20)::integer
        from public.workspace_limits l where l.workspace_id = w.id
      ),
      (
        select count(*)::integer from public.quotes q
        where q.workspace_id = w.id and q.deleted_at is null
      ),
      (
        select coalesce(max(l.max_quotes), 500)::integer
        from public.workspace_limits l where l.workspace_id = w.id
      ),
      w.created_at
    from public.workspaces w
    order by w.created_at desc, w.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: members of one workspace
-- ---------------------------------------------------------------------------

create or replace function public.admin_workspace_members(p_workspace_id text)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.workspaces w where w.id = p_workspace_id
  ) then
    raise exception 'workspace_not_found' using errcode = 'P0001';
  end if;

  return query
    select
      m.user_id,
      u.email::text,
      coalesce(
        p.display_name,
        public.profile_name_from_user(
          u.raw_user_meta_data->>'display_name',
          u.raw_user_meta_data->>'full_name',
          u.raw_user_meta_data->>'name',
          u.email::text
        )
      )::text,
      m.role,
      m.created_at
    from public.workspace_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    where m.workspace_id = p_workspace_id
    order by m.created_at, m.user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: update workspace caps
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_workspace_limits(
  p_workspace_id text,
  p_max_members integer,
  p_max_quotes integer
)
returns table (max_members integer, max_quotes integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  if p_max_members is null or p_max_members < 1
     or p_max_quotes is null or p_max_quotes < 1 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.workspaces w where w.id = p_workspace_id
  ) then
    raise exception 'workspace_not_found' using errcode = 'P0001';
  end if;

  insert into public.workspace_limits
    (workspace_id, max_members, max_quotes, updated_by, updated_at)
  values
    (p_workspace_id, p_max_members, p_max_quotes, auth.uid(), now())
  on conflict (workspace_id) do update
    set max_members = excluded.max_members,
        max_quotes = excluded.max_quotes,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return query
    select l.max_members, l.max_quotes
    from public.workspace_limits l
    where l.workspace_id = p_workspace_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- The guard inside each function rejects non-admins with `not_admin`; the
-- grants to authenticated only let the request reach the function.

revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_list_workspaces() from public, anon;
revoke all on function public.admin_workspace_members(text) from public, anon;
revoke all on function public.admin_update_workspace_limits(text, integer, integer) from public, anon;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_workspaces() to authenticated;
grant execute on function public.admin_workspace_members(text) to authenticated;
grant execute on function public.admin_update_workspace_limits(text, integer, integer) to authenticated;
