-- Zugriffsregeln: Row Level Security auf jeder Tabelle, ausdrückliche Rechte je Rolle.
-- Quelle: docs/datenmodell.md, Abschnitt "Zugriffsregeln".
--
-- Rollen: Kandidat und Admin kommen beide als Datenbankrolle authenticated an und werden über
-- is_active_user() und is_admin() unterschieden. Der Server (service_role) umgeht die Regeln.
-- Nicht angemeldete Besucher (anon) haben auf keine Tabelle Zugriff.

-- ---------------------------------------------------------------------------------------------
-- Rechte: erst alles entziehen, dann je Tabelle nur das Nötige
-- ---------------------------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant execute on function public.portal_today() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.effective_plan(uuid) to authenticated;
grant execute on function public.mark_first_login() to authenticated;
grant execute on function public.locked_content() to authenticated;
grant execute on function public.public_settings() to authenticated;
grant execute on function public.purge_list_entry(public.import_list, uuid) to authenticated;
grant execute on function public.registration_info() to anon, authenticated;

-- Konten und Zugang
grant select on public.profiles to authenticated;
grant update (first_name, last_name, field, language, reminders_enabled, blocked_at)
  on public.profiles to authenticated;
grant select, update on public.plan_access to authenticated;
grant select, insert on public.plan_periods to authenticated;
grant select, insert, update, delete on public.prices to authenticated;
grant select, update on public.launch_settings to authenticated;
grant select on public.stripe_events, public.email_log, public.audit_log to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;

-- Arbeitsdaten des Kandidaten
grant select, insert, update, delete on public.applications, public.application_events to authenticated;
grant select, insert, delete on public.checklist_progress, public.dismissed_tasks to authenticated;

-- Inhalte und Listen
grant select, insert, update, delete on
  public.checklists, public.checklist_items,
  public.articles, public.templates, public.phrases, public.glossary_terms,
  public.companies, public.jobs, public.agencies, public.job_boards
  to authenticated;
grant select, insert on public.import_batches to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security einschalten: ohne passende Regel sieht niemand etwas
-- ---------------------------------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.plan_access        enable row level security;
alter table public.plan_periods       enable row level security;
alter table public.prices             enable row level security;
alter table public.launch_settings    enable row level security;
alter table public.stripe_events      enable row level security;
alter table public.audit_log          enable row level security;
alter table public.email_log          enable row level security;
alter table public.app_settings       enable row level security;
alter table public.applications       enable row level security;
alter table public.application_events enable row level security;
alter table public.checklists         enable row level security;
alter table public.checklist_items    enable row level security;
alter table public.checklist_progress enable row level security;
alter table public.dismissed_tasks    enable row level security;
alter table public.articles           enable row level security;
alter table public.templates          enable row level security;
alter table public.phrases            enable row level security;
alter table public.glossary_terms     enable row level security;
alter table public.companies          enable row level security;
alter table public.jobs               enable row level security;
alter table public.agencies           enable row level security;
alter table public.job_boards         enable row level security;
alter table public.import_batches     enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Konten
-- ---------------------------------------------------------------------------------------------

-- Welche Felder geändert werden dürfen, prüft zusätzlich der Trigger guard_profile_update.
create policy "candidate reads own profile" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) and blocked_at is null);

create policy "candidate updates own profile" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()) and blocked_at is null)
  with check (user_id = (select auth.uid()) and blocked_at is null);

create policy "admin reads all profiles" on public.profiles
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin blocks accounts" on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------------------------
-- Zugang und Bezahlung: Plan und Pass schreibt nie der Kandidat
-- ---------------------------------------------------------------------------------------------

create policy "candidate reads own access" on public.plan_access
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "admin reads all access" on public.plan_access
  for select to authenticated
  using ((select public.is_admin()));

-- Der Admin schaltet manuell frei oder setzt auf Free; einen bezahlten Pass trägt nur der Webhook ein.
create policy "admin changes access manually" on public.plan_access
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and source <> 'pass');

create policy "candidate reads own periods" on public.plan_periods
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "admin reads all periods" on public.plan_periods
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin adds manual periods" on public.plan_periods
  for insert to authenticated
  with check ((select public.is_admin())
              and source = 'manual' and amount_cents is null and stripe_session_id is null);

create policy "candidate reads active prices" on public.prices
  for select to authenticated
  using (active and (select public.is_active_user()));

create policy "admin manages prices" on public.prices
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Kandidaten und Besucher erfahren die Startphase nur über registration_info().
create policy "admin reads launch settings" on public.launch_settings
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin changes launch settings" on public.launch_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "admin reads stripe events" on public.stripe_events
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin reads email log" on public.email_log
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin reads audit log" on public.audit_log
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin manages app settings" on public.app_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------------------------
-- Arbeitsdaten des Kandidaten: nur die eigenen, der Admin sieht nichts davon
-- ---------------------------------------------------------------------------------------------

create policy "candidate manages own applications" on public.applications
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()))
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "candidate manages own application events" on public.application_events
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()))
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "candidate reads own progress" on public.checklist_progress
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

-- Abhaken lässt sich nur, was die eigene Stufe sehen darf (die Regel auf checklist_items greift
-- auch in dieser Unterabfrage).
create policy "candidate ticks visible items" on public.checklist_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user())
              and exists (select 1 from public.checklist_items i where i.id = item_id));

create policy "candidate unticks own items" on public.checklist_progress
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "candidate reads own dismissed tasks" on public.dismissed_tasks
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "candidate dismisses tasks" on public.dismissed_tasks
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "candidate reopens tasks" on public.dismissed_tasks
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

-- ---------------------------------------------------------------------------------------------
-- Inhalte und Listen: Kandidaten lesen Veröffentlichtes ab ihrer Stufe, der Admin pflegt
-- effective_plan liefert für gesperrte Konten NULL, der Vergleich schlägt dann fehl.
-- ---------------------------------------------------------------------------------------------

create policy "candidate reads active checklists" on public.checklists
  for select to authenticated
  using (active and (select public.is_active_user()));

create policy "candidate reads items by plan" on public.checklist_items
  for select to authenticated
  using (active and min_plan <= (select public.effective_plan((select auth.uid()))));

create policy "candidate reads articles by plan" on public.articles
  for select to authenticated
  using (published and min_plan <= (select public.effective_plan((select auth.uid()))));

create policy "candidate reads templates by plan" on public.templates
  for select to authenticated
  using (active and min_plan <= (select public.effective_plan((select auth.uid()))));

create policy "candidate reads phrases by plan" on public.phrases
  for select to authenticated
  using (min_plan <= (select public.effective_plan((select auth.uid()))));

create policy "candidate reads glossary by plan" on public.glossary_terms
  for select to authenticated
  using (min_plan <= (select public.effective_plan((select auth.uid()))));

do $$
declare
  t text;
begin
  foreach t in array array['companies', 'jobs', 'agencies', 'job_boards'] loop
    execute format(
      'create policy "candidate reads published by plan" on public.%I
         for select to authenticated
         using (status = ''published'' and min_plan <= (select public.effective_plan((select auth.uid()))))', t);
  end loop;

  foreach t in array array['checklists', 'checklist_items', 'articles', 'templates', 'phrases',
                           'glossary_terms'] loop
    execute format(
      'create policy "admin manages content" on public.%I
         for all to authenticated
         using ((select public.is_admin()))
         with check ((select public.is_admin()))', t);
  end loop;

  -- Listen: lesen, anlegen, ändern; löschen nur im Entwurf. Veröffentlichtes wird archiviert.
  -- Dieselbe Sperre setzen die Trigger guard_list_delete und guard_list_status für alle Rollen durch.
  foreach t in array array['companies', 'jobs', 'agencies', 'job_boards'] loop
    execute format(
      'create policy "admin reads list" on public.%I
         for select to authenticated using ((select public.is_admin()))', t);
    execute format(
      'create policy "admin adds to list" on public.%I
         for insert to authenticated with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admin changes list" on public.%I
         for update to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admin deletes drafts" on public.%I
         for delete to authenticated
         using ((select public.is_admin()) and status = ''draft'')', t);
  end loop;
end;
$$;

create policy "admin reads import batches" on public.import_batches
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin creates import batches" on public.import_batches
  for insert to authenticated
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------------------------
-- Vorlagendateien: abrufbar nur, wenn der zugehörige Eintrag in templates für die eigene Stufe
-- sichtbar ist. Der kurzlebige Download-Link setzt dieses Leserecht voraus.
-- ---------------------------------------------------------------------------------------------

create policy "templates: download by plan" on storage.objects
  for select to authenticated
  using (bucket_id = 'templates'
         and exists (select 1 from public.templates t where t.file_path = objects.name));

create policy "templates: admin manages files" on storage.objects
  for all to authenticated
  using (bucket_id = 'templates' and (select public.is_admin()))
  with check (bucket_id = 'templates' and (select public.is_admin()));
