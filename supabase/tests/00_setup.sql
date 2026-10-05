-- Hilfsfunktionen für die Tests der Zugriffsregeln. Läuft als erste Datei und bleibt in der
-- lokalen Datenbank stehen (Schema tests, nicht über die Schnittstelle erreichbar); in
-- Migrationen kommt davon nichts vor.

create extension if not exists pgtap with schema extensions;

drop schema if exists tests cascade;
create schema tests;

-- Feste ID zu einem sprechenden Namen, für Nutzer und Beispieldaten.
create function tests.uid(name text)
returns uuid language sql immutable as $$
  select md5('onboard-test:' || name)::uuid;
$$;

create function tests.create_user(name text, meta jsonb default '{}', app jsonb default '{}')
returns uuid language plpgsql as $$
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (tests.uid(name), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          name || '@test.local',
          jsonb_build_object('first_name', initcap(name), 'last_name', 'Test') || meta, app);
  return tests.uid(name);
end;
$$;

-- Anmelden wie über die Schnittstelle: Datenbankrolle und JWT-Angaben.
create function tests.login(name text, aal text default 'aal1')
returns void language sql as $$
  select set_config('request.jwt.claims',
           json_build_object('sub', tests.uid(name), 'role', 'authenticated', 'aal', aal)::text, true),
         set_config('role', 'authenticated', true);
$$;

create function tests.as_anon()
returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true), set_config('role', 'anon', true);
$$;

create function tests.as_service()
returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"service_role"}', true),
         set_config('role', 'service_role', true);
$$;

-- Zurück zur Rolle der Testverbindung, ohne JWT.
create function tests.logout()
returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'none', true);
$$;

-- Anzahl der für die aktuelle Rolle sichtbaren Beispielzeilen einer Inhalts- oder Listentabelle.
create function tests.visible(tbl text)
returns bigint language plpgsql as $$
declare
  col text := case tbl
    when 'phrases' then 'german'
    when 'glossary_terms' then 'term_de'
    when 'companies' then 'name'
    when 'agencies' then 'name'
    when 'job_boards' then 'name'
    else 'title' end;
  n bigint;
begin
  execute format('select count(*) from public.%I where %I like ''T %%''', tbl, col) into n;
  return n;
end;
$$;

-- Ausgangslage für jede Testdatei (läuft in deren Transaktion und wird zurückgerollt).
--
-- Nutzer: alice und bob (free), stella (starter, letzter Tag heute), paula (plus),
--         eve (plus, gestern abgelaufen), bianca (plus, gesperrt), patrick (admin).
-- Inhalte: je Tabelle Zeilen "T ..." mit min_plan free, starter, plus und nicht sichtbare
--         Zeilen (inaktiv, unveröffentlicht, Entwurf, archiviert).
create function tests.fixtures()
returns void language plpgsql as $$
declare
  today date := public.portal_today();
  t text;
begin
  update public.launch_settings
     set registration_mode = 'open', invite_code = null, new_account_grant = 'none',
         grant_until = null, sales_enabled = false;
  insert into public.app_settings (key, value)
  values ('free_application_limit', '10'), ('pass_reminder_days', '7')
  on conflict (key) do update set value = excluded.value;

  perform tests.create_user(n)
     from unnest(array['alice', 'bob', 'stella', 'paula', 'eve', 'bianca', 'patrick']) n;

  update public.plan_access set plan = 'starter', source = 'pass', pass_length = 'month', valid_until = today
   where user_id = tests.uid('stella');
  update public.plan_access set plan = 'plus', source = 'pass', pass_length = 'quarter', valid_until = today + 30,
         stripe_customer_id = 'cus_test_paula'
   where user_id = tests.uid('paula');
  update public.plan_access set plan = 'plus', source = 'pass', pass_length = 'month', valid_until = today - 1
   where user_id = tests.uid('eve');
  update public.plan_access set plan = 'plus', source = 'manual', manual_reason = 'Test', valid_until = today + 30
   where user_id = tests.uid('bianca');
  update public.profiles set role = 'admin' where user_id = tests.uid('patrick');

  insert into public.plan_periods
    (user_id, plan, source, pass_length, starts_on, ends_on, reason, amount_cents, stripe_session_id, granted_by)
  values
    (tests.uid('paula'), 'plus', 'pass', 'quarter', today - 60, today + 30, null, 7500, 'cs_test_paula', 'stripe'),
    (tests.uid('paula'), 'starter', 'manual', null, today - 90, today - 61, 'Komplett-Begleitung', null, null, 'Patrick'),
    (tests.uid('bob'), 'plus', 'pilot', null, today - 90, today - 61, 'Pilotphase', null, null, 'system');

  delete from public.prices;
  insert into public.prices (plan, pass_length, amount_cents, stripe_price_id, active) values
    ('starter', 'month', 1400, 'price_test_active', true),
    ('plus', 'month', 100, 'price_test_old', false);

  insert into public.stripe_events (id, type) values ('evt_test_1', 'checkout.session.completed');
  insert into public.audit_log (user_id, actor, text) values (tests.uid('alice'), 'system', 'Test entry');
  insert into public.email_log (user_id, kind) values (tests.uid('alice'), 'pass_ending');

  -- Checkliste mit Punkten
  insert into public.checklists (id, key, title, area) values (tests.uid('checklist'), 't_checklist', 'T checklist', 'cv');
  insert into public.checklist_items (id, checklist_id, title, min_plan, active) values
    (tests.uid('item-free'), tests.uid('checklist'), 'T free item', 'free', true),
    (tests.uid('item-starter'), tests.uid('checklist'), 'T starter item', 'starter', true),
    (tests.uid('item-plus'), tests.uid('checklist'), 'T plus item', 'plus', true),
    (tests.uid('item-inactive'), tests.uid('checklist'), 'T inactive item', 'free', false);

  -- Inhalte
  insert into public.articles (slug, area, title, body, min_plan, published) values
    ('t-free', 'cv', 'T free article', 'SECRET BODY', 'free', true),
    ('t-starter', 'cv', 'T starter article', 'SECRET BODY', 'starter', true),
    ('t-plus', 'guide', 'T plus article', 'SECRET BODY', 'plus', true),
    ('t-unpublished', 'cv', 'T unpublished article', 'SECRET BODY', 'free', false);
  insert into public.templates (title, format, file_path, min_plan, active) values
    ('T free template', 'docx', 'T/free.docx', 'free', true),
    ('T starter template', 'docx', 'T/starter.docx', 'starter', true),
    ('T plus template', 'pdf', 'T/plus.pdf', 'plus', true),
    ('T inactive template', 'docx', 'T/inactive.docx', 'free', false);
  insert into public.phrases (category, german, english, min_plan) values
    ('cover_letter', 'T frei', 'free', 'free'),
    ('phone', 'T Starter', 'starter', 'starter'),
    ('vocabulary', 'T Plus', 'plus', 'plus');
  insert into public.glossary_terms (term_de, term_en, what, min_plan) values
    ('T frei', 'free', 'x', 'free'),
    ('T Starter', 'starter', 'x', 'starter'),
    ('T Plus', 'plus', 'x', 'plus');

  -- Listen: drei veröffentlichte Stufen, dazu Entwurf und Archiv
  insert into public.companies (id, name, domain, status, min_plan) values
    (tests.uid('company-free'), 'T free', 't-free.test', 'published', 'free'),
    (tests.uid('company-starter'), 'T starter', 't-starter.test', 'published', 'starter'),
    (tests.uid('company-plus'), 'T plus', 't-plus.test', 'published', 'plus'),
    (tests.uid('company-draft'), 'T draft', 't-draft.test', 'draft', 'free'),
    (tests.uid('company-archived'), 'T archived', 't-archived.test', 'archived', 'free');
  insert into public.jobs (title, company_name, status, min_plan) values
    ('T free', 'T', 'published', 'free'), ('T starter', 'T', 'published', 'starter'),
    ('T plus', 'T', 'published', 'plus'), ('T draft', 'T', 'draft', 'free'), ('T archived', 'T', 'archived', 'free');
  insert into public.agencies (name, status, min_plan) values
    ('T free', 'published', 'free'), ('T starter', 'published', 'starter'),
    ('T plus', 'published', 'plus'), ('T draft', 'draft', 'free'), ('T archived', 'archived', 'free');
  insert into public.job_boards (name, status, min_plan) values
    ('T free', 'published', 'free'), ('T starter', 'published', 'starter'),
    ('T plus', 'published', 'plus'), ('T draft', 'draft', 'free'), ('T archived', 'archived', 'free');

  -- Arbeitsdaten von bob und bianca, an die niemand sonst herankommen darf
  insert into public.applications (id, user_id, company) values
    (tests.uid('app-bob'), tests.uid('bob'), 'Bob Co'),
    (tests.uid('app-bianca'), tests.uid('bianca'), 'Bianca Co');
  insert into public.application_events (application_id, user_id, text)
  values (tests.uid('app-bob'), tests.uid('bob'), 'Applied');
  insert into public.checklist_progress (user_id, item_id) values
    (tests.uid('bob'), tests.uid('item-free')), (tests.uid('bianca'), tests.uid('item-free'));
  insert into public.dismissed_tasks (user_id, task_key) values (tests.uid('bob'), 'cv');

  -- Gesperrt wird zuletzt, damit die Daten von bianca vorhanden sind.
  update public.profiles set blocked_at = now() where user_id = tests.uid('bianca');
end;
$$;

-- Die Standardrechte entziehen neuen Funktionen das Ausführungsrecht für alle; die Tests rufen
-- pgTAP und die Hilfsfunktionen aber auch als Kandidat und als Besucher auf.
grant usage on schema tests to public;
grant execute on all functions in schema tests to public;

do $$
declare
  f regprocedure;
begin
  for f in
    select d.objid::regprocedure
      from pg_depend d join pg_extension e on e.oid = d.refobjid
     where e.extname = 'pgtap' and d.classid = 'pg_proc'::regclass and d.deptype = 'e'
  loop
    execute format('grant execute on function %s to public', f);
  end loop;
end;
$$;

select plan(1);
select has_function('tests', 'fixtures', 'test helpers are installed');
select * from finish();
