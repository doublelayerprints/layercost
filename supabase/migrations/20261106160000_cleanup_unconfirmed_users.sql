-- Automatic cleanup of unconfirmed signups (audit 06/11/2026, finding 4).
--
-- With email confirmation enabled (ADR-0038 §2.6) an account exists only if
-- GoTrue managed to send the confirmation email: the insert and the send share
-- one transaction, so a failed send rolls the user back. What remains is the
-- case of a real address that nobody confirms, which still counts toward the
-- global signup cap (`max_users()` counts every row in auth.users).
--
-- This job deletes accounts that never confirmed, after a grace period, so the
-- cap reflects real users. It is deliberately conservative:
--
--   * only `email_confirmed_at is null` (never confirmed, not "not recently");
--   * older than the grace period, so a slow inbox is not punished;
--   * never a user with a workspace membership, a profile or any quote: if
--     something was created, the account is not abandoned and is left alone;
--   * never a user that has signed in at least once.
--
-- The 1000-user cap is the reason this exists: without cleanup, automated
-- signups to plausible-but-unowned addresses would eventually lock the door.

-- ---------------------------------------------------------------------------
-- Cleanup function
-- ---------------------------------------------------------------------------

create or replace function public.delete_unconfirmed_users(
  p_grace_hours integer default 48,
  p_limit integer default 500,
  p_dry_run boolean default false
)
returns table (deleted integer, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_deleted integer := 0;
  v_remaining integer;
begin
  if p_grace_hours is null or p_grace_hours < 1 then
    raise exception 'invalid_grace' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  select coalesce(array_agg(id), '{}')
  into v_ids
  from (
    select u.id
    from auth.users u
    where u.email_confirmed_at is null
      and u.created_at < now() - make_interval(hours => p_grace_hours)
      and u.last_sign_in_at is null
      and not exists (
        select 1 from public.workspace_members m where m.user_id = u.id
      )
      and not exists (
        select 1 from public.profiles p where p.user_id = u.id
      )
      and not exists (
        select 1 from public.quotes q where q.created_by = u.id or q.updated_by = u.id
      )
      and not exists (
        select 1 from public.workspaces w where w.created_by = u.id
      )
    order by u.created_at
    limit p_limit
  ) candidates;

  if p_dry_run then
    select count(*) into v_remaining
    from auth.users u
    where u.email_confirmed_at is null
      and u.created_at < now() - make_interval(hours => p_grace_hours);
    return query select coalesce(array_length(v_ids, 1), 0), v_remaining;
    return;
  end if;

  if coalesce(array_length(v_ids, 1), 0) > 0 then
    -- Sessions and identities cascade from auth.users; refresh tokens too.
    delete from auth.users where id = any (v_ids);
    v_deleted := coalesce(array_length(v_ids, 1), 0);
  end if;

  select count(*) into v_remaining
  from auth.users u
  where u.email_confirmed_at is null
    and u.created_at < now() - make_interval(hours => p_grace_hours);

  return query select v_deleted, v_remaining;
end;
$$;

revoke all on function public.delete_unconfirmed_users(integer, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.delete_unconfirmed_users(integer, integer, boolean)
  to service_role, postgres, supabase_admin;

-- ---------------------------------------------------------------------------
-- Schedule: daily at 03:41 UTC, before the weekly backup at 03:23 on Sundays
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema extensions;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'layercost-cleanup-unconfirmed';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end;
$$;

select cron.schedule(
  'layercost-cleanup-unconfirmed',
  '41 3 * * *',
  $$select public.delete_unconfirmed_users(48, 500, false)$$
);