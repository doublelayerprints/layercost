begin;

set search_path = public, extensions;

select plan(17);

-- ---------------------------------------------------------------------------
-- Fixtures: accounts start without a profile; get_my_profile creates it lazily.
-- ---------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'marco@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Marco Rossi"}', now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'giulia@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Giulia"}', now(), now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'carlo.neri@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.workspaces (id, name, kind) values
  ('ws-audit-shared', 'Audit shared', 'shared'),
  ('ws-audit-personal', 'Audit personal', 'personal');

insert into public.workspace_members (workspace_id, user_id, role, created_at) values
  ('ws-audit-shared', '11111111-1111-1111-1111-111111111111', 'owner', '2026-10-01T00:00:00Z'),
  ('ws-audit-shared', '22222222-2222-2222-2222-222222222222', 'editor', '2026-10-02T00:00:00Z'),
  ('ws-audit-personal', '33333333-3333-3333-3333-333333333333', 'owner', '2026-10-03T00:00:00Z');

-- ---------------------------------------------------------------------------
-- 1-4. Lazy creation and name derivation
-- ---------------------------------------------------------------------------

select is(
  public.profile_name_from_user('  ', '  Marco   Rossi ', null, null),
  'Marco Rossi',
  'the name derivation normalizes whitespace'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  public.get_my_profile(),
  'Marco Rossi',
  'the first read creates the profile from the Google full_name'
);

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is(
  public.get_my_profile(),
  'Giulia',
  'an explicit display_name wins over the profile name'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select is(
  public.get_my_profile(),
  'carlo.neri',
  'without a profile name the email local part is used'
);

-- ---------------------------------------------------------------------------
-- 5-10. Profile reads, writes and validation
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is(
  public.set_my_profile('  Giulia   Bianchi  '),
  'Giulia Bianchi',
  'set_my_profile normalizes whitespace and returns the saved name'
);

select is(
  public.get_my_profile(),
  'Giulia Bianchi',
  'the updated name is readable immediately'
);

select throws_ok(
  $$ select public.set_my_profile('   ') $$,
  '22023',
  'invalid_name',
  'a blank display name is rejected'
);

select throws_ok(
  $$ select public.set_my_profile(repeat('a', 41)) $$,
  '22023',
  'invalid_name',
  'a display name longer than 40 characters is rejected'
);

select is(
  public.set_my_profile(repeat('b', 40)),
  repeat('b', 40),
  'a 40-character display name is accepted'
);

select is(
  public.set_my_profile('Giulia Bianchi'),
  'Giulia Bianchi',
  'the name can be changed again'
);

-- ---------------------------------------------------------------------------
-- 12-16. Directory visibility and isolation
-- ---------------------------------------------------------------------------

-- The editor sees names but not emails.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select results_eq(
  $$ select display_name from public.list_workspace_members('ws-audit-shared') $$,
  array['Marco Rossi', 'Giulia Bianchi']::text[],
  'an editor sees the display names of the shared workspace'
);

select is(
  (select count(*) from public.list_workspace_members('ws-audit-shared')
   where email is not null),
  0::bigint,
  'an editor never receives member emails'
);

-- The owner sees both names and emails.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from public.list_workspace_members('ws-audit-shared')
   where email is not null),
  2::bigint,
  'an owner still receives member emails'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$ select * from public.list_workspace_members('ws-audit-shared') $$,
  '42501',
  'not_member',
  'an outsider cannot list the directory'
);

select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'the profiles table is not directly readable by authenticated users'
);

-- ---------------------------------------------------------------------------
-- 17-18. Workspace kind
-- ---------------------------------------------------------------------------

select is(
  (select kind from public.list_my_workspaces() where workspace_id = 'ws-audit-personal'),
  'personal',
  'list_my_workspaces exposes the personal kind'
);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select kind from public.list_my_workspaces() where workspace_id = 'ws-audit-shared'),
  'shared',
  'list_my_workspaces exposes the shared kind'
);

reset role;

select * from finish();
rollback;
