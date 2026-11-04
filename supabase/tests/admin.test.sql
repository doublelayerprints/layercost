begin;

set search_path = public, extensions;

select plan(34);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres, bypassing RLS). Only user A gets a profile row; the
-- others exercise the display-name fallback. B and C have no admin flag.
-- ---------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'admin-owner@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'bbbbbbbb-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'admin-member@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'cccccccc-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'admin-outsider@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into auth.identities (
  provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at
) values
  ('email', 'admin-owner@example.test', 'aaaaaaaa-1111-1111-1111-111111111111',
   '{"sub":"admin-owner@example.test"}'::jsonb, now(), now(), now()),
  ('email', 'admin-member@example.test', 'bbbbbbbb-2222-2222-2222-222222222222',
   '{"sub":"admin-member@example.test"}'::jsonb, now(), now(), now()),
  ('email', 'admin-outsider@example.test', 'cccccccc-3333-3333-3333-333333333333',
   '{"sub":"admin-outsider@example.test"}'::jsonb, now(), now(), now());

insert into public.profiles (user_id, display_name) values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'Admin Uno');

insert into public.workspaces (id, name, kind) values
  ('ws-admin-shared', 'Admin shared', 'shared'),
  ('ws-admin-personal', 'Admin personal', 'personal'),
  ('ws-admin-other', 'Admin other', 'shared');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('ws-admin-shared', 'aaaaaaaa-1111-1111-1111-111111111111', 'owner'),
  ('ws-admin-shared', 'bbbbbbbb-2222-2222-2222-222222222222', 'editor'),
  ('ws-admin-personal', 'aaaaaaaa-1111-1111-1111-111111111111', 'owner'),
  ('ws-admin-other', 'cccccccc-3333-3333-3333-333333333333', 'owner');

insert into public.workspace_limits (workspace_id, max_members, max_quotes, updated_by) values
  ('ws-admin-shared', 5, 10, 'aaaaaaaa-1111-1111-1111-111111111111');

insert into public.quotes (id, workspace_id, status, name, quote_date, locale, lines, job, pricing, deleted_at) values
  ('quote-admin-1', 'ws-admin-shared', 'saved', 'Attivo', '2026-11-04', 'it', '[]'::jsonb,
   '{}'::jsonb, '{}'::jsonb, null),
  ('quote-admin-2', 'ws-admin-shared', 'saved', 'Cancellato', '2026-11-04', 'it', '[]'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now());

-- ---------------------------------------------------------------------------
-- 1-6. Before the flag: every admin RPC rejects the plain member
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  public.is_app_admin(),
  false,
  'the admin flag is false by default'
);

select throws_ok(
  $$ select * from public.admin_overview() $$,
  '42501',
  'not_admin',
  'the overview rejects a non-admin'
);

select throws_ok(
  $$ select * from public.admin_list_users() $$,
  '42501',
  'not_admin',
  'the user list rejects a non-admin'
);

select throws_ok(
  $$ select * from public.admin_list_workspaces() $$,
  '42501',
  'not_admin',
  'the workspace list rejects a non-admin'
);

select throws_ok(
  $$ select * from public.admin_workspace_members('ws-admin-shared') $$,
  '42501',
  'not_admin',
  'the member list rejects a non-admin'
);

select throws_ok(
  $$ select * from public.admin_update_workspace_limits('ws-admin-shared', 30, 800) $$,
  '42501',
  'not_admin',
  'the limits update rejects a non-admin'
);

-- ---------------------------------------------------------------------------
-- Grant the admin flag, then verify the reads as the admin
-- ---------------------------------------------------------------------------

reset role;

update public.profiles
set is_admin = true
where user_id = 'aaaaaaaa-1111-1111-1111-111111111111';

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  public.is_app_admin(),
  true,
  'the admin flag is read from profiles'
);

select is(
  (select total_users from public.admin_overview()),
  3::bigint,
  'the overview counts the users'
);

select is(
  (select max_users_limit from public.admin_overview()),
  1000::integer,
  'the overview exposes the signup cap'
);

select is(
  (select total_personal_workspaces from public.admin_overview()),
  1::bigint,
  'the overview counts the personal workspaces'
);

select is(
  (select total_shared_workspaces from public.admin_overview()),
  2::bigint,
  'the overview counts the shared workspaces'
);

select is(
  (select total_quotes from public.admin_overview()),
  1::bigint,
  'the overview counts only active quotes'
);

select is(
  (select total_memberships from public.admin_overview()),
  4::bigint,
  'the overview counts the memberships'
);

select is(
  (select count(*)::integer from public.admin_list_users()),
  3,
  'the user list contains every user'
);

select is(
  (select count(*)::integer from public.admin_list_users()
    where email = 'admin-member@example.test'),
  1,
  'the user list exposes the email to the admin'
);

select is(
  (select display_name from public.admin_list_users()
    where email = 'admin-member@example.test'),
  'admin-member',
  'the user list derives the display name when the profile is missing'
);

select is(
  (select count(*)::integer from public.admin_list_users()
    where providers = 'email'),
  3,
  'the user list aggregates the auth providers'
);

select is(
  (select count(*)::integer from public.admin_list_workspaces()),
  3,
  'the workspace list contains every workspace'
);

select is(
  (select members from public.admin_list_workspaces()
    where workspace_id = 'ws-admin-shared'),
  2,
  'the workspace list counts the members'
);

select is(
  (select quotes from public.admin_list_workspaces()
    where workspace_id = 'ws-admin-shared'),
  1,
  'the workspace list counts only active quotes'
);

select is(
  (select max_members from public.admin_list_workspaces()
    where workspace_id = 'ws-admin-shared'),
  5,
  'the workspace list exposes the configured member cap'
);

select is(
  (select max_quotes from public.admin_list_workspaces()
    where workspace_id = 'ws-admin-shared'),
  10,
  'the workspace list exposes the configured quote cap'
);

select is(
  (select max_members from public.admin_list_workspaces()
    where workspace_id = 'ws-admin-personal'),
  20,
  'a workspace without a limits row uses the default member cap'
);

select is(
  (select count(*)::integer from public.admin_workspace_members('ws-admin-other')
    where email = 'admin-outsider@example.test'),
  1,
  'the member list shows the email of a workspace the admin does not belong to'
);

select throws_ok(
  $$ select * from public.admin_workspace_members('ws-admin-missing') $$,
  'P0001',
  'workspace_not_found',
  'the member list rejects an unknown workspace'
);

-- ---------------------------------------------------------------------------
-- The limits update is the UI path of runbook §16.2
-- ---------------------------------------------------------------------------

select is(
  (select max_members from public.admin_update_workspace_limits('ws-admin-shared', 30, 800)),
  30,
  'the limits update returns the new member cap'
);

select is(
  (select max_quotes from public.admin_update_workspace_limits('ws-admin-shared', 30, 800)),
  800,
  'the limits update returns the new quote cap'
);

select is(
  (select updated_by from public.workspace_limits
    where workspace_id = 'ws-admin-shared'),
  'aaaaaaaa-1111-1111-1111-111111111111'::uuid,
  'the limits update records the admin as updated_by'
);

select is(
  (select max_members from public.workspace_usage('ws-admin-shared')),
  30::integer,
  'the member-facing usage reflects the new cap immediately'
);

select throws_ok(
  $$ select * from public.admin_update_workspace_limits('ws-admin-shared', 0, 800) $$,
  '22023',
  'invalid_limit',
  'a zero member cap is rejected'
);

select throws_ok(
  $$ select * from public.admin_update_workspace_limits('ws-admin-shared', 30, 0) $$,
  '22023',
  'invalid_limit',
  'a zero quote cap is rejected'
);

select throws_ok(
  $$ select * from public.admin_update_workspace_limits('ws-admin-missing', 30, 800) $$,
  'P0001',
  'workspace_not_found',
  'the limits update rejects an unknown workspace'
);

-- ---------------------------------------------------------------------------
-- Another member stays a non-admin
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"bbbbbbbb-2222-2222-2222-222222222222","role":"authenticated"}';

select is(
  public.is_app_admin(),
  false,
  'a member without the flag is not an admin'
);

select throws_ok(
  $$ select * from public.admin_overview() $$,
  '42501',
  'not_admin',
  'a member without the flag cannot read the overview'
);

reset role;

select * from finish();
rollback;
