begin;

set search_path = public, extensions;

select plan(41);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres, bypassing RLS)
-- ---------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'owner-a@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'editor-a@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'owner-b@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'newcomer@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'limit-user@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'second-owner@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.workspaces (id, name) values
  ('ws-a', 'Workspace A'),
  ('ws-b', 'Workspace B');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('ws-a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
  ('ws-b', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner');

-- Helper table for tokens that must be reused across statements.
create table public.test_tokens (
  name text primary key,
  token text not null,
  invite_id text
);
grant all on public.test_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- 1-2. The same seed identifier can live in two workspaces
-- ---------------------------------------------------------------------------

insert into public.printers (
  id, workspace_id, name, model, purchase_price, residual_value_bp,
  expected_life_hours, maintenance_per_hour, startup_minutes, multicolor,
  build_volume_mm, rated_power_w, power_profiles, default_avg_watts
) values
  (
    'printer-kobra-3', 'ws-a', 'Kobra 3', 'Kobra 3', 1, 0,
    1, 0, 0, false, array[1, 1, 1], 1, '{}'::jsonb, 1
  ),
  (
    'printer-kobra-3', 'ws-b', 'Kobra 3', 'Kobra 3', 1, 0,
    1, 0, 0, false, array[1, 1, 1], 1, '{}'::jsonb, 1
  );

select is(
  (select count(*) from public.printers
   where id = 'printer-kobra-3' and workspace_id in ('ws-a', 'ws-b')),
  2::bigint,
  'the same seed id exists in two workspaces without collisions'
);

select results_eq(
  $$ select workspace_id from public.printers
     where id = 'printer-kobra-3' and workspace_id in ('ws-a', 'ws-b')
     order by workspace_id $$,
  array['ws-a', 'ws-b']::text[],
  'both workspace rows are distinct'
);

-- ---------------------------------------------------------------------------
-- 3-9. Personal workspace
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select isnt(
  public.ensure_personal_workspace(),
  null,
  'a new user gets a personal workspace'
);

select is(
  public.ensure_personal_workspace(),
  null,
  'a second call is idempotent'
);

select results_eq(
  $$ select role from public.workspace_members where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  array['owner']::text[],
  'the personal workspace makes the user owner'
);

select ok(
  (select name like 'Spazio di newcomer%' from public.workspaces
   where id = (select workspace_id from public.workspace_members
               where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')),
  'the personal workspace is named after the account'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select isnt(
  public.ensure_personal_workspace(),
  null,
  'an existing user also gets a personal workspace'
);

select is(
  public.ensure_personal_workspace(),
  null,
  'the personal workspace is created only once'
);

select is(
  (select count(*) from public.list_my_workspaces()),
  2::bigint,
  'the existing user lists the shared and the personal workspace'
);

set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select is(
  (select count(*) from public.list_my_workspaces()),
  1::bigint,
  'the new user lists exactly the personal workspace'
);

-- ---------------------------------------------------------------------------
-- 10-12. Workspace creation and limits
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select lives_ok(
  $test$
    do $body$
    begin
      for i in 1..10 loop
        perform public.create_workspace('Spazio ' || i::text);
      end loop;
    end
    $body$;
  $test$,
  'a user can own ten workspaces'
);

select throws_ok(
  $$ select public.create_workspace('Spazio 11') $$,
  'P0001',
  'workspace_limit',
  'the eleventh workspace is rejected'
);

select throws_ok(
  $$ select public.create_workspace('   ') $$,
  '22023',
  'invalid_name',
  'an empty workspace name is rejected'
);

-- ---------------------------------------------------------------------------
-- 13-18. Invite lifecycle: create, redeem, idempotent redeem
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  length(public.create_invite('ws-a', 'editor', 7)),
  32,
  'create_invite returns a 32-character token'
);

set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select throws_ok(
  $$ select public.create_invite('ws-a', 'editor', 7) $$,
  '42501',
  'not_owner',
  'a non-owner cannot create an invite'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

insert into public.test_tokens (name, token)
select 'editor', public.create_invite('ws-a', 'editor', 7);

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  public.redeem_invite((select token from public.test_tokens where name = 'editor')),
  'ws-a',
  'a valid invite grants the membership'
);

select results_eq(
  $$ select role from public.workspace_members where workspace_id = 'ws-a'
     and user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  array['editor']::text[],
  'the invite applies the requested role'
);

select is(
  public.redeem_invite((select token from public.test_tokens where name = 'editor')),
  'ws-a',
  'redeeming twice is idempotent'
);

reset role;

select is(
  (select used_count from public.workspace_invites
   where token_hash = encode(extensions.digest(
     (select token from public.test_tokens where name = 'editor'), 'sha256'
   ), 'hex')),
  1,
  'the idempotent redeem does not consume the code twice'
);

-- ---------------------------------------------------------------------------
-- 19-23. Invite failures
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select throws_ok(
  $$ select public.redeem_invite('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') $$,
  'P0001',
  'invite_invalid',
  'an unknown token is rejected'
);

-- Expired invite.
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

insert into public.test_tokens (name, token)
select 'expired', public.create_invite('ws-a', 'editor', 1);

reset role;

update public.workspace_invites i
set expires_at = now() - interval '1 day'
where i.token_hash = encode(extensions.digest(
  (select token from public.test_tokens where name = 'expired'), 'sha256'
), 'hex');

set local role authenticated;
set local request.jwt.claims = '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select throws_ok(
  $$ select public.redeem_invite((select token from public.test_tokens where name = 'expired')) $$,
  'P0001',
  'invite_expired',
  'an expired invite is rejected'
);

-- Revoked invite, revoked through the RPC.
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

insert into public.test_tokens (name, token)
select 'revoked', public.create_invite('ws-a', 'editor', 7);

reset role;

update public.test_tokens t
set invite_id = i.id
from public.workspace_invites i
where t.name = 'revoked'
  and i.token_hash = encode(extensions.digest(t.token, 'sha256'), 'hex');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$ select public.revoke_invite((select invite_id from public.test_tokens where name = 'revoked')) $$,
  'an owner can revoke an invite'
);

set local request.jwt.claims = '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select throws_ok(
  $$ select public.redeem_invite((select token from public.test_tokens where name = 'revoked')) $$,
  'P0001',
  'invite_revoked',
  'a revoked invite is rejected'
);

-- Exhausted invite.
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

insert into public.test_tokens (name, token)
select 'exhausted', public.create_invite('ws-a', 'editor', 7);

reset role;

update public.workspace_invites i
set used_count = i.max_uses
where i.token_hash = encode(extensions.digest(
  (select token from public.test_tokens where name = 'exhausted'), 'sha256'
), 'hex');

set local role authenticated;
set local request.jwt.claims = '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select throws_ok(
  $$ select public.redeem_invite((select token from public.test_tokens where name = 'exhausted')) $$,
  'P0001',
  'invite_exhausted',
  'an exhausted invite is rejected'
);

-- Owner invite.
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

insert into public.test_tokens (name, token)
select 'owner', public.create_invite('ws-a', 'owner', 7);

set local request.jwt.claims = '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","role":"authenticated"}';

select lives_ok(
  $$ select public.redeem_invite((select token from public.test_tokens where name = 'owner')) $$,
  'an owner invite creates a second owner'
);

-- ---------------------------------------------------------------------------
-- 24-29. Member and invite listing
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select isnt(
  (select email from public.list_workspace_members('ws-a')
   where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  null,
  'an owner sees member emails'
);

select ok(
  (select count(*) from public.list_workspace_invites('ws-a')) >= 1,
  'an owner lists the invites of the workspace'
);

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (select email from public.list_workspace_members('ws-a')
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  null,
  'an editor does not see member emails'
);

select throws_ok(
  $$ select * from public.list_workspace_invites('ws-a') $$,
  '42501',
  'not_owner',
  'an editor cannot list invites'
);

set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select throws_ok(
  $$ select * from public.list_workspace_members('ws-a') $$,
  '42501',
  'not_member',
  'an outsider cannot list the members'
);

select is(
  public.max_workspace_members(),
  20,
  'the member limit is 20'
);

-- ---------------------------------------------------------------------------
-- 30-32. Leaving a workspace
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select lives_ok(
  $$ select public.leave_workspace('ws-a') $$,
  'an editor can leave a workspace'
);

select throws_ok(
  $$ select public.leave_workspace('ws-a') $$,
  'P0001',
  'not_member',
  'leaving twice is rejected'
);

set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select throws_ok(
  $$ select public.leave_workspace('ws-b') $$,
  'P0001',
  'last_owner',
  'the last owner cannot leave'
);

-- ---------------------------------------------------------------------------
-- 33-38. Isolation with identical seed identifiers
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$ insert into public.materials (id, workspace_id, name, family, price_per_kg, spool_net_weight_g)
     values ('material-pla', 'ws-a', 'PLA A', 'PLA', 1, 1000) $$,
  'workspace A inserts the shared seed id'
);

select results_eq(
  $$ select workspace_id from public.materials where id = 'material-pla' $$,
  array['ws-a']::text[],
  'workspace A sees only its own material'
);

select throws_ok(
  $$ insert into public.materials (id, workspace_id, name, family, price_per_kg, spool_net_weight_g)
     values ('material-intruder', 'ws-b', 'PLA X', 'PLA', 1, 1000) $$,
  '42501',
  null,
  'workspace A cannot write into workspace B'
);

set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select lives_ok(
  $$ insert into public.materials (id, workspace_id, name, family, price_per_kg, spool_net_weight_g)
     values ('material-pla', 'ws-b', 'PLA B', 'PLA', 1, 1000) $$,
  'workspace B inserts the same seed id'
);

select results_eq(
  $$ select workspace_id from public.materials where id = 'material-pla' $$,
  array['ws-b']::text[],
  'workspace B sees only its own material'
);

reset role;

select is(
  (select count(*) from public.materials
   where id = 'material-pla' and workspace_id in ('ws-a', 'ws-b')),
  2::bigint,
  'both workspaces keep their own material-pla row'
);

-- ---------------------------------------------------------------------------
-- 39. Anonymous callers cannot use the workspace RPCs
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{}';

select throws_ok(
  $$ select * from public.list_my_workspaces() $$,
  '42501',
  null,
  'anonymous callers cannot list workspaces'
);

select * from finish();
rollback;
