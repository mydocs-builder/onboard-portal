-- Unbestätigte Konten: begrenztes erneutes Senden des Bestätigungslinks und Löschen nach Ablauf der Frist.
-- Quelle: docs/datenmodell.md, Abschnitte "Konten und Rollen" und "Geplante Funktionen und Mails".

insert into public.app_settings (key, value) values
  ('unconfirmed_account_days', '7'),      -- Frist bis zum Löschen unbestätigter Konten
  ('confirmation_resend_limit', '3');     -- "Send the link again" je Konto

-- Wie oft der Bestätigungslink erneut verschickt wurde.
alter table public.profiles add column confirmation_resends integer not null default 0;

-- ---------------------------------------------------------------------------------------------
-- Erneutes Senden begrenzen. Supabase Auth trägt jeden Versand des Bestätigungslinks in
-- auth.users.confirmation_sent_at ein; der Trigger zählt mit und weist den Versand ab, sobald
-- die Grenze erreicht ist. Das gilt für jeden Weg, auch für Aufrufe an der Oberfläche vorbei.
-- Gezählt wird nur bei selbst registrierten, noch unbestätigten Konten; der erste Versand bei
-- der Registrierung zählt nicht. Eine erneute Registrierung mit derselben, noch unbestätigten
-- Adresse verschickt den Link ebenfalls und zählt deshalb mit.
-- ---------------------------------------------------------------------------------------------
create function public.limit_confirmation_resends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_resends integer;
begin
  if new.confirmation_sent_at is not distinct from old.confirmation_sent_at
     or old.confirmation_sent_at is null
     or new.email_confirmed_at is not null
     or old.invited_at is not null then
    return new;
  end if;

  select value::integer into max_resends from public.app_settings where key = 'confirmation_resend_limit';

  update public.profiles
     set confirmation_resends = confirmation_resends + 1
   where user_id = new.id and confirmation_resends < coalesce(max_resends, 3);
  if not found and exists (select 1 from public.profiles where user_id = new.id) then
    raise exception 'confirmation_resend_limit_reached' using errcode = 'P0001',
      hint = 'The confirmation link was already sent the maximum number of times.';
  end if;
  return new;
end;
$$;

create trigger limit_confirmation_resends before update on auth.users
  for each row execute function public.limit_confirmation_resends();

-- ---------------------------------------------------------------------------------------------
-- Tägliche Funktion: wie bisher, dazu Schritt 5 (unbestätigte Konten löschen).
-- ---------------------------------------------------------------------------------------------
create or replace function public.daily_run()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  today      date := public.portal_today();
  last_run   date;
  job_days   integer;
  keep_years integer;
  open_days  integer;
  started    integer;
  expired    integer;
  archived   integer;
  consents   integer;
  wait_days  integer;
  unconfirmed integer;
begin
  -- Zwei Läufe gleichzeitig würden dieselben Pässe doppelt starten.
  perform pg_advisory_xact_lock(hashtextextended('public.daily_run', 0));

  -- Fällt ein Lauf aus, holt der nächste bis zu sieben Tage nach.
  select value::date into last_run from public.app_settings where key = 'daily_last_run';
  last_run := greatest(coalesce(last_run, today - 1), today - 7);

  -- 1. Vorgemerkte Pässe starten: Planphasen, deren Beginn seit dem letzten Lauf erreicht ist.
  --    Ersetzte und vollständig erstattete Phasen starten nie. Am Kauftag begonnene Pässe hat grant_pass schon eingetragen.
  with due as (
    select distinct on (p.user_id) p.*
      from public.plan_periods p
     where p.user_id is not null
       and p.superseded_by is null
       and not coalesce(p.refunded_cents >= p.amount_cents, false)
       and p.starts_on > last_run and p.starts_on <= today and p.ends_on >= today
       and (p.created_at at time zone 'Europe/Berlin')::date < p.starts_on
     order by p.user_id, p.starts_on desc
  ), upd as (
    update public.plan_access a
       set plan = due.plan,
           source = (case when due.source = 'pass' then 'pass' else 'manual' end)::public.access_source,
           pass_length = due.pass_length,
           valid_until = due.ends_on,
           manual_reason = case when due.source <> 'pass' then due.reason end
      from due
     where a.user_id = due.user_id
    returning a.user_id, due.plan, due.ends_on
  ), log as (
    insert into public.audit_log (user_id, actor, text)
    select user_id, 'system',
           format('Vorgemerkter %s-Zugang gestartet, gültig bis %s', initcap(plan::text), to_char(ends_on, 'DD.MM.YYYY'))
      from upd
    returning 1
  )
  select count(*) into started from log;

  -- 2. Abgelaufene Zugänge: zurück auf Free. valid_until bleibt als Datum des Ablaufs stehen.
  with old as (
    select user_id, plan from public.plan_access
     where plan <> 'free' and valid_until < today
       for update
  ), upd as (
    update public.plan_access a
       set plan = 'free', source = 'none', pass_length = null, manual_reason = null
      from old
     where a.user_id = old.user_id
    returning a.user_id, old.plan as old_plan, a.valid_until
  ), log as (
    insert into public.audit_log (user_id, actor, text)
    select user_id, 'system',
           format('%s-Zugang am %s abgelaufen, zurück auf Free', initcap(old_plan::text), to_char(valid_until, 'DD.MM.YYYY'))
      from upd
    returning 1
  )
  select count(*) into expired from log;

  -- 3. Abgelaufene Jobs archivieren. Ohne Ablaufdatum gilt posted_on plus job_default_days.
  select value::integer into job_days from public.app_settings where key = 'job_default_days';
  with upd as (
    update public.jobs
       set status = 'archived'
     where status = 'published'
       and coalesce(expires_on, posted_on + coalesce(job_days, 30)) < today
    returning 1
  )
  select count(*) into archived from upd;

  -- 4. Zustimmungen zum Kauf löschen, deren Aufbewahrungsfrist abgelaufen ist (deutsche Zeit):
  --    zu abgeschlossenen Käufen mit dem Ende des consent_retention_years-ten Kalenderjahres nach
  --    dem Kauf, zu nicht abgeschlossenen (ohne Planphase) nach abandoned_consent_days Tagen.
  select value::integer into keep_years from public.app_settings where key = 'consent_retention_years';
  select value::integer into open_days from public.app_settings where key = 'abandoned_consent_days';
  with gone as (
    delete from public.purchase_consents c
     where make_date(extract(year from c.consented_at at time zone 'Europe/Berlin')::integer
                     + coalesce(keep_years, 3) + 1, 1, 1) <= today
        or (c.plan_period_id is null
            and (c.consented_at at time zone 'Europe/Berlin')::date + coalesce(open_days, 30) < today)
    returning 1
  )
  select count(*) into consents from gone;

  -- 5. Selbst registrierte Konten löschen, deren E-Mail-Adresse nach unconfirmed_account_days Tagen
  --    (deutsche Zeit) nicht bestätigt ist. Vom Admin eingeladene Konten bleiben. Ein solches Konto
  --    war nie angemeldet; seine Planphasen (Pilotphase) verschwinden deshalb mit, sonst zählten sie
  --    in der Auswertung als kostenlose Phase ohne Buchung. Zurück bleibt je Konto ein Eintrag im
  --    Änderungsprotokoll ohne Personenbezug, damit die Zahl der nie bestätigten Registrierungen
  --    zählbar bleibt.
  select value::integer into wait_days from public.app_settings where key = 'unconfirmed_account_days';
  with stale as (
    select u.id, (u.created_at at time zone 'Europe/Berlin')::date as registered_on
      from auth.users u
      join public.profiles p on p.user_id = u.id
     where u.email_confirmed_at is null
       and u.invited_at is null and not p.invited_by_admin
       and (u.created_at at time zone 'Europe/Berlin')::date + coalesce(wait_days, 7) <= today
  ), periods as (
    delete from public.plan_periods q using stale where q.user_id = stale.id
    returning 1
  ), gone as (
    delete from auth.users u using stale where u.id = stale.id
    returning stale.registered_on
  ), log as (
    insert into public.audit_log (user_id, actor, text)
    select null, 'system',
           format('Unbestätigtes Konto gelöscht (registriert am %s, E-Mail-Adresse nicht bestätigt)',
                  to_char(registered_on, 'DD.MM.YYYY'))
      from gone
    returning 1
  )
  select count(*) into unconfirmed from log;

  insert into public.app_settings (key, value) values ('daily_last_run', today::text)
  on conflict (key) do update set value = excluded.value;

  return jsonb_build_object('date', today, 'passes_started', started,
                            'access_expired', expired, 'jobs_archived', archived,
                            'consents_deleted', consents,
                            'unconfirmed_accounts_deleted', unconfirmed);
end;
$$;
