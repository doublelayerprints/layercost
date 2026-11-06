-- Audit hardening (6 November 2026).
--
-- 1. `created_by` is assigned by the database on insert, so a member cannot
--    attribute a quote to somebody else. `created_at` stays writable because
--    the first-login import replays the local history.
-- 2. A `sent`/`completed` quote cannot move to another workspace or change its
--    `schema_version`; archiving and soft-deletion stay allowed.
-- 3. Moving a quote into a workspace at its cap is rejected.

begin;

set search_path = public, extensions;

select plan(11);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aa111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'hard-owner@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'bb222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'hard-editor@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.workspaces (id, name, kind) values
  ('ws-hard-a', 'Hardening A', 'shared'),
  ('ws-hard-b', 'Hardening B', 'shared'),
  ('ws-hard-full', 'Hardening full', 'shared');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('ws-hard-a', 'aa111111-1111-1111-1111-111111111111', 'owner'),
  ('ws-hard-a', 'bb222222-2222-2222-2222-222222222222', 'editor'),
  ('ws-hard-b', 'aa111111-1111-1111-1111-111111111111', 'owner'),
  ('ws-hard-full', 'aa111111-1111-1111-1111-111111111111', 'owner');

insert into public.settings (workspace_id) values
  ('ws-hard-a'), ('ws-hard-b'), ('ws-hard-full');

-- One row of room in ws-hard-full.
insert into public.workspace_limits (workspace_id, max_members, max_quotes) values
  ('ws-hard-full', 20, 1);

insert into public.quotes (
  id, workspace_id, status, name, quote_date, locale, lines, job, pricing
) values
  ('q-hard-sent', 'ws-hard-a', 'sent', 'Sent quote', current_date, 'it', '[]', '{}', '{}'),
  ('q-hard-saved', 'ws-hard-a', 'saved', 'Saved quote', current_date, 'it', '[]', '{}', '{}'),
  ('q-hard-moved', 'ws-hard-b', 'saved', 'Movable quote', current_date, 'it', '[]', '{}', '{}'),
  ('q-hard-fill', 'ws-hard-full', 'saved', 'Filler', current_date, 'it', '[]', '{}', '{}');

-- ---------------------------------------------------------------------------
-- 1. created_by is not forgeable by the browser
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"bb222222-2222-2222-2222-222222222222","role":"authenticated"}';

insert into public.quotes (
  id, workspace_id, status, name, quote_date, locale, lines, job, pricing, created_by
) values (
  'q-hard-forged', 'ws-hard-a', 'saved', 'Forged', current_date, 'it', '[]', '{}', '{}',
  'aa111111-1111-1111-1111-111111111111'
);

select is(
  (select created_by::text from public.quotes where id = 'q-hard-forged'),
  'bb222222-2222-2222-2222-222222222222',
  'created_by is forced to the caller, not to the supplied value'
);

-- created_at keeps the caller value so the first-login import preserves history.
insert into public.quotes (
  id, workspace_id, status, name, quote_date, locale, lines, job, pricing, created_at
) values (
  'q-hard-date', 'ws-hard-a', 'saved', 'Dated', current_date, 'it', '[]', '{}', '{}',
  '2024-01-02T03:04:05Z'
);

select is(
  (select created_at from public.quotes where id = 'q-hard-date'),
  '2024-01-02 03:04:05+00'::timestamptz,
  'created_at stays writable so an import keeps the original history'
);

-- ---------------------------------------------------------------------------
-- 2. A sent quote is immutable in its placement
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update public.quotes set workspace_id = 'ws-hard-b' where id = 'q-hard-sent' $$,
  'P0001', 'quote_locked',
  'a sent quote cannot move to another workspace'
);

select throws_ok(
  $$ update public.quotes set schema_version = 999 where id = 'q-hard-sent' $$,
  'P0001', 'quote_locked',
  'a sent quote cannot change schema_version'
);

-- Archiving and soft deletion remain allowed: the UI offers both for any status.
select lives_ok(
  $$ update public.quotes set archived_at = now() where id = 'q-hard-sent' $$,
  'a sent quote can still be archived'
);

select lives_ok(
  $$ update public.quotes set deleted_at = now() where id = 'q-hard-sent' $$,
  'a sent quote can still be soft-deleted'
);

-- --- back to the owner of both workspaces ----------------------------------
set local request.jwt.claims = '{"sub":"aa111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- A saved quote stays movable by a member of both workspaces. It has to run as
-- the owner: `quotes_update_member` checks membership of the *target* space, so
-- the editor (member of ws-hard-a only) would be stopped by RLS, not by a
-- trigger.
select lives_ok(
  $$ update public.quotes set workspace_id = 'ws-hard-b' where id = 'q-hard-saved' $$,
  'a saved quote can move between workspaces the user owns'
);

-- ---------------------------------------------------------------------------
-- 3. Moving a quote into a workspace at its cap is rejected
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update public.quotes set workspace_id = 'ws-hard-full' where id = 'q-hard-moved' $$,
  'P0001', 'quote_limit_reached',
  'moving a quote into a full workspace is rejected'
);

-- Soft-deleting the filler frees a slot, and then the move succeeds.
update public.quotes set deleted_at = now() where id = 'q-hard-fill';

select lives_ok(
  $$ update public.quotes set workspace_id = 'ws-hard-full' where id = 'q-hard-moved' $$,
  'a freed slot allows the move'
);

select is(
  (select workspace_id from public.quotes where id = 'q-hard-moved'),
  'ws-hard-full',
  'the moved quote now belongs to the target workspace'
);

-- ---------------------------------------------------------------------------
-- 4. Service role and SQL sessions keep full control
-- ---------------------------------------------------------------------------

reset role;

insert into public.quotes (
  id, workspace_id, status, name, quote_date, locale, lines, job, pricing, created_by
) values (
  'q-hard-admin', 'ws-hard-a', 'saved', 'Admin', current_date, 'it', '[]', '{}', '{}',
  'aa111111-1111-1111-1111-111111111111'
);

select is(
  (select created_by::text from public.quotes where id = 'q-hard-admin'),
  'aa111111-1111-1111-1111-111111111111',
  'a request without a JWT keeps the supplied created_by'
);

select * from finish();
rollback;