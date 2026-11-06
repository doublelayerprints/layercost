-- Security audit closure (6 November 2026), findings 8 and 10.
--
-- 8. Leaked-password protection is enabled in the project configuration
--    (password_hibp_enabled), not here: it lives in the Auth settings.
-- 10. Owners had powers beyond the documented invariants:
--      a. INSERT on `workspace_members` let an owner add any user id, bypassing
--         invites (expiry, revocation, max_uses) and the member cap pre-check.
--      b. UPDATE on `workspaces` let an owner rewrite `kind` and `created_by`,
--         which escapes the 10-shared-workspaces cap and falsifies the audit.
--
-- The application never inserts memberships or edits workspace columns
-- directly: `create_workspace`, `ensure_personal_workspace` and
-- `redeem_invite` are SECURITY DEFINER and keep working, while `renameWorkspace`
-- only touches `name`. Revoke the excess and pin the workspace columns.

-- ---------------------------------------------------------------------------
-- a. Membership writes only through the invite RPCs
-- ---------------------------------------------------------------------------

revoke insert, update, delete on table public.workspace_members from authenticated;
grant select on table public.workspace_members to authenticated;

-- Owners still manage roles and removals, but only for an existing membership.
-- `leave_workspace` (SECURITY DEFINER) keeps covering self-removal.
grant update (role) on table public.workspace_members to authenticated;
grant delete on table public.workspace_members to authenticated;

-- ---------------------------------------------------------------------------
-- b. A workspace cannot change identity, kind or creator
-- ---------------------------------------------------------------------------

create or replace function public.protect_workspace_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.kind is distinct from old.kind
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'workspace_identity_locked' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger workspaces_protect_identity
before update on public.workspaces
for each row execute function public.protect_workspace_identity();

revoke all on function public.protect_workspace_identity() from public;

-- ---------------------------------------------------------------------------
-- Grants recap
-- ---------------------------------------------------------------------------

-- `authenticated` keeps: select on everything it needs, insert/update on the
-- data tables, update(name) on workspaces, update(role)/delete on memberships.
-- It loses: insert on memberships, update on the workspace identity columns.