begin;

set search_path = public, extensions;

select plan(22);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres, bypassing RLS). The cap triggers fire on these
-- inserts too: with the default limits (20 members / 500 quotes) they pass.
-- ---------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'caps-owner@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'caps-editor@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'caps-extra@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'caps-outsider@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.workspaces (id, name, kind) values
  ('ws-caps', 'Caps shared', 'shared'),
  ('ws-caps-other', 'Caps other', 'shared');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('ws-caps', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('ws-caps-other', '44444444-4444-4444-4444-444444444444', 'owner');

-- Workspace without an explicit limits row: the fallbacks (20/500) apply.
insert into public.workspaces (id, name, kind) values
  ('ws-caps-fallback', 'Caps fallback', 'personal');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('ws-caps-fallback', '11111111-1111-1111-1111-111111111111', 'owner');

-- Tight limits for the workspace under test.
insert into public.workspace_limits (workspace_id, max_members, max_quotes, updated_by) values
  ('ws-caps', 2, 1, '11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- 1. Global signup cap
-- ---------------------------------------------------------------------------

select is(
  public.max_users(),
  1000,
  'the signup cap is 1000 users'
);

select is(
  public.handle_before_user_created('{"email":"new@example.test"}'::jsonb),
  '{"email":"new@example.test"}'::jsonb,
  'under the cap the hook returns the payload unchanged'
);

create or replace function public.max_users()
returns integer
language sql
immutable
as $$
  select 0;
$$;

select throws_ok(
  $$ select public.handle_before_user_created('{"email":"new@example.test"}'::jsonb) $$,
  'P0001',
  'signup_limit_reached',
  'at the cap the hook rejects the signup'
);

create or replace function public.max_users()
returns integer
language sql
immutable
as $$
  select 1000;
$$;

-- ---------------------------------------------------------------------------
-- 2-4. workspace_usage: defaults, counts and configured caps
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select members from public.workspace_usage('ws-caps-fallback')),
  1::integer,
  'a workspace without a limits row counts its members'
);

select is(
  (select max_members from public.workspace_usage('ws-caps-fallback')),
  20::integer,
  'a workspace without a limits row uses the default member cap'
);

select is(
  (select max_quotes from public.workspace_usage('ws-caps-fallback')),
  500::integer,
  'a workspace without a limits row uses the default quote cap'
);

select is(
  (select max_members from public.workspace_usage('ws-caps')),
  2::integer,
  'the configured member limit is visible to members'
);

select is(
  (select max_quotes from public.workspace_usage('ws-caps')),
  1::integer,
  'the configured quote limit is visible to members'
);

select throws_ok(
  $$ select * from public.workspace_usage('ws-caps-other') $$,
  'P0001',
  'workspace_not_found',
  'a non-member cannot read the workspace usage'
);

-- ---------------------------------------------------------------------------
-- 5-7. Member cap trigger
-- ---------------------------------------------------------------------------

-- Audit 06/11/2026 (ADR-0038 §2.7): the client can no longer insert a
-- membership directly, so the only way in is the invite RPC. A direct insert
-- is now rejected before the cap trigger even runs.
select throws_ok(
  $$ insert into public.workspace_members (workspace_id, user_id, role)
     values ('ws-caps', '22222222-2222-2222-2222-222222222222', 'editor') $$,
  '42501',
  null,
  'a direct membership insert is denied: members join through an invite'
);

-- The cap is still the source of truth for the invite path. `create_invite`
-- reads the configured limit (fallback 20) and refuses at the cap; the trigger
-- enforces it for the redeem that would follow. Tighten the limit to the
-- current usage so the refusal is exercised.
reset role;
update public.workspace_limits set max_members = 1 where workspace_id = 'ws-caps';
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ select public.create_invite('ws-caps', 'editor', 7) $$,
  'P0001',
  'member_limit',
  'create_invite respects the configured member limit'
);

-- A workspace with room still accepts an invite; this one is owned by the
-- fourth user.
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select lives_ok(
  $$ select public.create_invite('ws-caps-other', 'editor', 7) $$,
  'a workspace under the cap issues an invite'
);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 8-10. workspace_limits is read-only for the client
-- ---------------------------------------------------------------------------

select is(
  (select max_members from public.workspace_limits where workspace_id = 'ws-caps'),
  1,
  'members can read the workspace limits'
);

select throws_ok(
  $$ update public.workspace_limits set max_members = 99 where workspace_id = 'ws-caps' $$,
  '42501',
  null,
  'the client cannot change the workspace limits'
);

-- ---------------------------------------------------------------------------
-- 11-14. Quote cap trigger
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into public.quotes (id, workspace_id, status, name, quote_date, locale, lines, job, pricing)
     values ('quote-caps-1', 'ws-caps', 'saved', 'Primo', '2026-11-02', 'it', '[]'::jsonb,
             '{}'::jsonb, '{}'::jsonb) $$,
  'a quote under the cap is inserted'
);

select throws_ok(
  $$ insert into public.quotes (id, workspace_id, status, name, quote_date, locale, lines, job, pricing)
     values ('quote-caps-2', 'ws-caps', 'saved', 'Secondo', '2026-11-02', 'it', '[]'::jsonb,
             '{}'::jsonb, '{}'::jsonb) $$,
  'P0001',
  'quote_limit_reached',
  'a quote at the cap is rejected'
);

select lives_ok(
  $$ update public.quotes set name = 'Primo modificato' where id = 'quote-caps-1' $$,
  'a plain update of an active quote is not re-checked'
);

-- A soft delete frees a place for a new quote.
select lives_ok(
  $$ update public.quotes set deleted_at = now() where id = 'quote-caps-1' $$,
  'a soft delete is not re-checked and frees the slot'
);

select lives_ok(
  $$ insert into public.quotes (id, workspace_id, status, name, quote_date, locale, lines, job, pricing)
     values ('quote-caps-3', 'ws-caps', 'saved', 'Terzo', '2026-11-02', 'it', '[]'::jsonb,
             '{}'::jsonb, '{}'::jsonb) $$,
  'a new quote is accepted after the soft delete'
);

-- Restoring a tombstone at full capacity is rejected.
select throws_ok(
  $$ update public.quotes set deleted_at = null where id = 'quote-caps-1' $$,
  'P0001',
  'quote_limit_reached',
  'restoring a tombstone at the cap is rejected'
);

-- ws-caps has a single member (the owner): the direct insert above is denied
-- and members can only join through an invite, which is not redeemed here.
select is(
  (select members from public.workspace_usage('ws-caps')),
  1::integer,
  'the usage reflects the current members'
);

select is(
  (select quotes from public.workspace_usage('ws-caps')),
  1::integer,
  'the usage counts only active quotes'
);

reset role;

select * from finish();
rollback;
