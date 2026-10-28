begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(33);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres, bypassing RLS)
-- ---------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'owner-a@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'owner-b@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'owner-c@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'no-workspace@example.test', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.workspaces (id, name) values
  ('ws-a', 'Workspace A'),
  ('ws-b', 'Workspace B');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('ws-a', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('ws-a', '22222222-2222-2222-2222-222222222222', 'owner'),
  ('ws-b', '33333333-3333-3333-3333-333333333333', 'owner');

insert into public.settings (workspace_id) values ('ws-a'), ('ws-b');

insert into public.energy_tariffs (
  id, workspace_id, label, price_per_kwh, effective_from
) values
  ('tariff-a', 'ws-a', 'Tariff A', 200000, '2026-01-01'),
  ('tariff-b', 'ws-b', 'Tariff B', 250000, '2026-01-01');

insert into public.printers (
  id, workspace_id, name, model, purchase_price, residual_value_bp,
  expected_life_hours, maintenance_per_hour, startup_minutes, multicolor,
  build_volume_mm, rated_power_w, power_profiles, default_avg_watts
) values
  (
    'p-a', 'ws-a', 'Printer A', 'Model A', 100000000, 2000,
    1000, 10000, 5, false, array[250, 250, 250], 400, '{}'::jsonb, 200
  ),
  (
    'p-b', 'ws-b', 'Printer B', 'Model B', 100000000, 2000,
    1000, 10000, 5, false, array[250, 250, 250], 400, '{}'::jsonb, 200
  );

insert into public.materials (
  id, workspace_id, name, family, price_per_kg, spool_net_weight_g
) values
  ('m-a', 'ws-a', 'PLA A', 'PLA', 20000000, 1000),
  ('m-b', 'ws-b', 'PLA B', 'PLA', 20000000, 1000);

insert into public.extras (id, workspace_id, name, amount, unit) values
  ('e-a', 'ws-a', 'Box A', 400000, 'perUnit'),
  ('e-b', 'ws-b', 'Box B', 400000, 'perUnit');

insert into public.quotes (
  id, workspace_id, status, name, quote_date, locale,
  lines, job, pricing, schema_version
) values
  (
    'q-a', 'ws-a', 'saved', 'Quote A', '2026-10-28', 'it',
    '[{"id":"line-a","name":"Line A","printerId":"p-a","timeSeconds":3600,"materials":[],"quantity":1,"finishingSecondsPerUnit":0,"extraIds":[],"overrides":{}}]'::jsonb,
    '{"setupSeconds":0,"designSeconds":0,"extraIds":[]}'::jsonb,
    '{"mode":"markup","markupBp":3000,"marginBp":2500,"roundingStep":100000,"roundingMode":"up","vatMode":"none","vatRateBp":0}'::jsonb,
    4
  ),
  (
    'q-a-sent', 'ws-a', 'sent', 'Quote A sent', '2026-10-28', 'it',
    '[]'::jsonb,
    '{"setupSeconds":0,"designSeconds":0,"extraIds":[]}'::jsonb,
    '{"mode":"markup","markupBp":3000,"marginBp":2500,"roundingStep":100000,"roundingMode":"up","vatMode":"none","vatRateBp":0}'::jsonb,
    4
  ),
  (
    'q-b', 'ws-b', 'saved', 'Quote B', '2026-10-28', 'it',
    '[]'::jsonb,
    '{"setupSeconds":0,"designSeconds":0,"extraIds":[]}'::jsonb,
    '{"mode":"markup","markupBp":3000,"marginBp":2500,"roundingStep":100000,"roundingMode":"up","vatMode":"none","vatRateBp":0}'::jsonb,
    4
  );

-- ---------------------------------------------------------------------------
-- Shared workspace access
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq(
  $$ select id from public.workspaces order by id $$,
  array['ws-a']::text[],
  'A sees only its workspace'
);

select results_eq(
  $$ select user_id::text from public.workspace_members order by user_id $$,
  array['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']::text[],
  'A sees both owners of the shared workspace'
);

select results_eq(
  $$ select id from public.printers order by id $$,
  array['p-a']::text[],
  'A sees only workspace A data'
);

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select results_eq(
  $$ select id from public.printers order by id $$,
  array['p-a']::text[],
  'B sees the same shared workspace data'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select results_eq(
  $$ select id from public.printers order by id $$,
  array['p-b']::text[],
  'C sees only workspace B data'
);

-- ---------------------------------------------------------------------------
-- Shared quote access and audit metadata
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select results_eq(
  $$ select id from public.quotes where id = 'q-a' $$,
  array['q-a']::text[],
  'owner B sees the quote created by owner A'
);

select lives_ok(
  $$ update public.quotes set name = 'Quote A by B' where id = 'q-a' $$,
  'owner B can edit the quote created by owner A'
);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select name from public.quotes where id = 'q-a'),
  'Quote A by B',
  'owner A sees the change made by owner B'
);

select lives_ok(
  $$
    insert into public.quotes (
      id, workspace_id, status, name, quote_date, locale,
      lines, job, pricing, schema_version
    ) values (
      'q-audit', 'ws-a', 'saved', 'Audit quote', '2026-10-28', 'it',
      '[]'::jsonb,
      '{"setupSeconds":0,"designSeconds":0,"extraIds":[]}'::jsonb,
      '{"mode":"markup","markupBp":3000,"marginBp":2500,"roundingStep":100000,"roundingMode":"up","vatMode":"none","vatRateBp":0}'::jsonb,
      4
    )
  $$,
  'owner A can create a quote'
);

select results_eq(
  $$ select created_by::text || '|' || updated_by::text from public.quotes where id = 'q-audit' $$,
  array['11111111-1111-1111-1111-111111111111|11111111-1111-1111-1111-111111111111']::text[],
  'the database records the creator and the first editor'
);

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select lives_ok(
  $$ update public.quotes set name = 'Audit quote by B' where id = 'q-audit' $$,
  'owner B can edit the new quote'
);

select results_eq(
  $$ select created_by::text || '|' || updated_by::text from public.quotes where id = 'q-audit' $$,
  array['11111111-1111-1111-1111-111111111111|22222222-2222-2222-2222-222222222222']::text[],
  'the creator stays and the last editor changes'
);

set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select results_eq(
  $$ select id from public.printers order by id $$,
  '{}'::text[],
  'a user without membership sees no data'
);

-- ---------------------------------------------------------------------------
-- Write policies
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$
    insert into public.printers (
      id, workspace_id, name, model, purchase_price, residual_value_bp,
      expected_life_hours, maintenance_per_hour, startup_minutes, multicolor,
      build_volume_mm, rated_power_w, power_profiles, default_avg_watts
    ) values (
      'p-a2', 'ws-a', 'Printer A2', 'Model A2', 1, 0,
      1, 0, 0, false, array[1, 1, 1], 1, '{}'::jsonb, 1
    )
  $$,
  'a member can insert into its workspace'
);

select throws_ok(
  $$
    insert into public.printers (
      id, workspace_id, name, model, purchase_price, residual_value_bp,
      expected_life_hours, maintenance_per_hour, startup_minutes, multicolor,
      build_volume_mm, rated_power_w, power_profiles, default_avg_watts
    ) values (
      'p-x', 'ws-b', 'Intruder', 'Model X', 1, 0,
      1, 0, 0, false, array[1, 1, 1], 1, '{}'::jsonb, 1
    )
  $$,
  '42501',
  null,
  'a member cannot insert into another workspace'
);

update public.printers set name = 'Hacked' where id = 'p-b';

reset role;

select is(
  (select name from public.printers where id = 'p-b'),
  'Printer B',
  'a member cannot update another workspace'
);

-- ---------------------------------------------------------------------------
-- Quote isolation
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select results_eq(
  $$ select id from public.quotes where id = 'q-a' $$,
  '{}'::text[],
  'an owner of another workspace cannot see the shared quote'
);

update public.quotes set name = 'Hijacked' where id = 'q-a';

reset role;

select is(
  (select name from public.quotes where id = 'q-a'),
  'Quote A by B',
  'an owner of another workspace cannot update the shared quote'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select results_eq(
  $$ select id from public.quotes $$,
  '{}'::text[],
  'a user without membership sees no quotes'
);

select throws_ok(
  $$
    insert into public.quotes (
      id, workspace_id, status, name, quote_date, locale,
      lines, job, pricing, schema_version
    ) values (
      'q-outsider', 'ws-a', 'saved', 'Outsider', '2026-10-28', 'it',
      '[]'::jsonb,
      '{"setupSeconds":0,"designSeconds":0,"extraIds":[]}'::jsonb,
      '{"mode":"markup","markupBp":3000,"marginBp":2500,"roundingStep":100000,"roundingMode":"up","vatMode":"none","vatRateBp":0}'::jsonb,
      4
    )
  $$,
  '42501',
  null,
  'a user without membership cannot insert a quote'
);

-- ---------------------------------------------------------------------------
-- Quote lifecycle and soft delete
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ update public.quotes set archived_at = now() where id = 'q-a-sent' $$,
  'a sent quote can be archived'
);

select throws_ok(
  $$ update public.quotes set name = 'Hacked quote' where id = 'q-a-sent' $$,
  'P0001',
  'quote_locked',
  'a sent quote cannot change its economic fields'
);

select lives_ok(
  $$ update public.quotes set status = 'completed' where id = 'q-a-sent' $$,
  'a sent quote can move to completed'
);

select throws_ok(
  $$ update public.quotes set status = 'sent' where id = 'q-a-sent' $$,
  'P0001',
  'quote_locked',
  'a completed quote cannot move back'
);

select lives_ok(
  $$ update public.quotes set name = 'Quote A updated' where id = 'q-a' $$,
  'a saved quote remains editable'
);

select throws_ok(
  $$ delete from public.quotes where id = 'q-a' $$,
  '42501',
  null,
  'physical delete is not granted'
);

-- ---------------------------------------------------------------------------
-- Settings isolation
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

update public.settings set labor_rate_per_hour = 999 where workspace_id = 'ws-a';

reset role;

select is(
  (select labor_rate_per_hour from public.settings where workspace_id = 'ws-a'),
  0::bigint,
  'another workspace cannot update settings'
);

-- ---------------------------------------------------------------------------
-- Membership management
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ insert into public.workspace_members (workspace_id, user_id, role)
     values ('ws-a', '44444444-4444-4444-4444-444444444444', 'editor') $$,
  'an owner can add a member'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$ insert into public.workspace_members (workspace_id, user_id, role)
     values ('ws-a', '44444444-4444-4444-4444-444444444444', 'editor') $$,
  '42501',
  null,
  'an owner of another workspace cannot add a member'
);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ delete from public.workspace_members
     where workspace_id = 'ws-a' and user_id = '22222222-2222-2222-2222-222222222222' $$,
  'an owner can remove another owner when one remains'
);

select throws_ok(
  $$ delete from public.workspace_members
     where workspace_id = 'ws-a' and user_id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001',
  'last_owner',
  'the last owner cannot be removed'
);

-- Administrative cleanup (service role, no JWT subject) may remove the last
-- owner so that deleting a workspace cascades correctly.
set local role service_role;
set local request.jwt.claims = '{}';

select lives_ok(
  $$ delete from public.workspace_members
     where workspace_id = 'ws-a' and user_id = '11111111-1111-1111-1111-111111111111' $$,
  'an admin without a JWT subject can remove the last owner'
);

-- ---------------------------------------------------------------------------
-- Keep-alive
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{}';

select is(public.keepalive(), 'ok', 'the anonymous keep-alive RPC works');

select * from finish();
rollback;
