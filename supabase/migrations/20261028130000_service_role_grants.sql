-- Administrative access for scripts that use the service role.
--
-- The browser only receives the publishable/anon key, so the app never uses
-- this role. It is needed by local E2E fixtures, the workspace bootstrap and
-- the operational backup scripts. RLS still applies to anon/authenticated.
grant all on table public.workspaces to service_role;
grant all on table public.workspace_members to service_role;
grant all on table public.settings to service_role;
grant all on table public.energy_tariffs to service_role;
grant all on table public.printers to service_role;
grant all on table public.materials to service_role;
grant all on table public.extras to service_role;
grant all on table public.quotes to service_role;
