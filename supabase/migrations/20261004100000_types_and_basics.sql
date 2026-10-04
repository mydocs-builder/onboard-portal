-- Grundlagen: Standardrechte, Wertelisten als Typen, gemeinsame Hilfsfunktionen.
-- Quelle: docs/datenmodell.md

-- Alles verboten, was nicht erlaubt ist: Supabase gibt neuen Tabellen und Funktionen in public
-- sonst automatisch Rechte für anon und authenticated. Rechte werden je Tabelle ausdrücklich vergeben
-- (Migration access_rules).
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

-- Konten
create type public.user_role as enum ('candidate', 'admin');
create type public.portal_language as enum ('en', 'de');
-- Berufsfeld im Profil und Branche in den Listen teilen sich eine Werteliste,
-- damit Filter, Import und Fachvokabular immer dieselben Werte kennen.
create type public.industry as enum ('it', 'engineering', 'nursing_care', 'healthcare', 'logistics');

-- Zugang und Bezahlung
create type public.plan_level as enum ('free', 'starter', 'plus');          -- Reihenfolge = Rangfolge
create type public.access_source as enum ('none', 'pass', 'manual');
create type public.period_source as enum ('pass', 'manual', 'pilot');
create type public.pass_length as enum ('month', 'quarter');
create type public.registration_mode as enum ('open', 'invite');
create type public.account_grant as enum ('none', 'starter', 'plus');

-- Bewerbungen
create type public.application_status as enum
  ('planned', 'applied', 'interview', 'offer', 'accepted', 'rejected', 'no_response', 'withdrawn');
create type public.next_step_type as enum
  ('apply', 'follow_up', 'interview', 'documents', 'decision', 'offer_reply', 'none');
create type public.application_source as enum
  ('job_board', 'company_list', 'job_list', 'agency', 'direct', 'referral', 'other');

-- Checklisten und Inhalte
create type public.task_key as enum ('cv', 'linkedin', 'xing', 'visa');
create type public.article_area as enum ('cv', 'linkedin', 'interview', 'guide', 'agencies', 'contract');
create type public.template_format as enum ('docx', 'pdf');
create type public.phrase_category as enum ('cover_letter', 'phone', 'interview', 'vocabulary');

-- Listen und Import
create type public.list_status as enum ('draft', 'published', 'archived');
create type public.employer_type as enum ('hospital', 'care_home', 'outpatient');
create type public.company_signal as enum
  ('english_ads', 'relocation_support', 'visa_support', 'recognition_partnership');
create type public.agency_model as enum ('direct', 'temp', 'both');
create type public.import_list as enum ('companies', 'jobs', 'agencies', 'job_boards');

-- Betrieb
create type public.email_kind as enum
  ('reminder_next_step', 'interview_tomorrow', 'pass_ending', 'pass_ended', 'pass_started');

-- "Heute" im Sinne des Portals: Laufzeiten und Fälligkeiten rechnen in deutscher Zeit,
-- unabhängig von der Zeitzone des Datenbankservers.
create function public.portal_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Berlin')::date;
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
