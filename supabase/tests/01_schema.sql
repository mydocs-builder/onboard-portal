-- Grundsatz "alles verboten, was nicht erlaubt ist": gilt auch für Tabellen und Funktionen,
-- die später dazukommen.
begin;
set search_path = public, extensions, tests;
select plan(8);

select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
$$, 'every table in public has row level security enabled');

select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
$$, 'every table in public has at least one explicit rule');

select is((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r'), 24::bigint,
          'the model has 24 tables');

select is_empty($$
  select table_name, privilege_type from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'PUBLIC')
$$, 'visitors have no privileges on any table');

select is(
  (select array_agg(p.proname::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  array['registration_info'],
  'visitors can call registration_info() and nothing else');

select is_empty($$
  select table_name, privilege_type from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'authenticated'
     and ((table_name = 'plan_access' and privilege_type in ('INSERT', 'DELETE'))
       or (table_name = 'plan_periods' and privilege_type in ('UPDATE', 'DELETE'))
       or (table_name in ('stripe_events', 'email_log', 'audit_log') and privilege_type <> 'SELECT')
       or (table_name = 'profiles' and privilege_type in ('INSERT', 'DELETE'))
       or (table_name = 'import_batches' and privilege_type in ('UPDATE', 'DELETE')))
$$, 'signed-in users hold no write privileges beyond the access table of the data model');

select is_empty($$
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
$$, 'every security definer function pins its search_path');

-- Der Verkauf ist nach den Migrationen aus; einschalten darf ihn nur der Admin (lokal: die Seed-Daten).
select col_default_is('public', 'launch_settings', 'sales_enabled', 'false',
  'no migration switches sales on: sales_enabled defaults to false');

select * from finish();
rollback;
