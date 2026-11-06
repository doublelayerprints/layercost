-- Cleanup of unconfirmed signups (audit 06/11/2026, finding 4).
--
-- The job protects the 1000-user cap from automated signups. Being a DELETE on
-- auth.users, every guardrail deserves a test: grace period, confirmed users,
-- anybody who ever signed in, and anybody who left a trace (membership,
-- profile, quote, workspace).

begin;

set search_path = public, extensions;

select plan(12);

-- ---------------------------------------------------------------------------
-- Fixtures: fresh candidates vs protected users
-- ---------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at,
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data
) values
  -- deleted: unconfirmed, old, never signed in, no trace
  ('d1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'gone-1@example.test', null,
   now() - interval '72 hours', now() - interval '72 hours', null, '{}', '{}'),
  ('d1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'gone-2@example.test', null,
   now() - interval '7 days', now() - interval '7 days', null, '{}', '{}'),
  -- kept: within the grace period
  ('d2000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'fresh@example.test', null,
   now() - interval '1 hour', now() - interval '1 hour', null, '{}', '{}'),
  -- kept: confirmed
  ('d3000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'confirmed@example.test', now() - interval '3 days',
   now() - interval '3 days', now() - interval '3 days', now() - interval '3 days', '{}', '{}'),
  -- kept: unconfirmed but has signed in
  ('d4000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'signed@example.test', null,
   now() - interval '3 days', now() - interval '3 days', now() - interval '2 days', '{}', '{}'),
  -- kept: unconfirmed but owns a workspace
  ('d5000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'member@example.test', null,
   now() - interval '3 days', now() - interval '3 days', null, '{}', '{}'),
  -- kept: unconfirmed but has a profile
  ('d6000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'profile@example.test', null,
   now() - interval '3 days', now() - interval '3 days', null, '{}', '{}'),
  -- kept: unconfirmed but created a quote
  ('d7000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'author@example.test', null,
   now() - interval '3 days', now() - interval '3 days', null, '{}', '{}');

insert into public.workspaces (id, name, kind, created_by) values
  ('ws-cleanup', 'Cleanup', 'shared', 'd5000000-0000-4000-8000-000000000001');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('ws-cleanup', 'd5000000-0000-4000-8000-000000000001', 'owner');

insert into public.profiles (user_id, display_name) values
  ('d6000000-0000-4000-8000-000000000001', 'Profilo');

insert into public.settings (workspace_id) values ('ws-cleanup');

insert into public.quotes (
  id, workspace_id, status, name, quote_date, locale, lines, job, pricing, created_by
) values (
  'q-cleanup', 'ws-cleanup', 'saved', 'Q', current_date, 'it', '[]', '{}', '{}',
  'd7000000-0000-4000-8000-000000000001'
);

-- ---------------------------------------------------------------------------
-- 1. Dry run deletes nothing
-- ---------------------------------------------------------------------------

select is(
  (select deleted from public.delete_unconfirmed_users(48, 500, true)),
  2,
  'the dry run reports the two candidates'
);

select is(
  (select count(*)::integer from auth.users where email like 'gone-%@example.test'),
  2,
  'the dry run leaves the candidates in place'
);

-- ---------------------------------------------------------------------------
-- 2. Limits and validation
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.delete_unconfirmed_users(0, 500, true) $$,
  '22023', 'invalid_grace',
  'a grace period below one hour is rejected'
);

select throws_ok(
  $$ select public.delete_unconfirmed_users(48, 0, true) $$,
  '22023', 'invalid_limit',
  'a limit below one is rejected'
);

-- The limit caps one run and leaves the rest for the next one.
select is(
  (select deleted from public.delete_unconfirmed_users(48, 1, true)),
  1,
  'the limit bounds how many are removed in a single run'
);

-- ---------------------------------------------------------------------------
-- 3. Real run
-- ---------------------------------------------------------------------------

select is(
  (select deleted from public.delete_unconfirmed_users(48, 500, false)),
  2,
  'only the two abandoned signups are deleted'
);

select is(
  (select count(*)::integer from auth.users where email like 'gone-%@example.test'),
  0,
  'the abandoned signups are gone'
);

select is(
  (select count(*)::integer from auth.users where email = 'fresh@example.test'),
  1,
  'an unconfirmed account within the grace period survives'
);

select is(
  (select count(*)::integer from auth.users where email = 'signed@example.test'),
  1,
  'an unconfirmed account that signed in survives'
);

select is(
  (select count(*)::integer from auth.users where email = 'member@example.test'),
  1,
  'an unconfirmed account that owns a workspace survives'
);

select is(
  (select count(*)::integer from auth.users where email in ('profile@example.test', 'author@example.test')),
  2,
  'unconfirmed accounts with a profile or a quote survive'
);

select is(
  (select count(*)::integer from cron.job where jobname = 'layercost-cleanup-unconfirmed' and active),
  1,
  'the daily job is scheduled and active'
);

select * from finish();
rollback;