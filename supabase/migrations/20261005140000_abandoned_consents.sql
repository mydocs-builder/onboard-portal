-- Zustimmungen zu nicht abgeschlossenen Käufen (ohne Planphase) werden schon nach 30 Tagen gelöscht,
-- nicht erst nach drei Jahren. Die Frist ist eine eigene Einstellung.
-- Quelle: docs/datenmodell.md, "Zustimmung beim Kauf".

insert into public.app_settings (key, value) values ('abandoned_consent_days', '30');

-- daily_run(): Schritt 4 um die kurze Frist ergänzt, sonst unverändert.
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
begin
  -- Zwei Läufe gleichzeitig würden dieselben Pässe doppelt starten.
  perform pg_advisory_xact_lock(hashtextextended('public.daily_run', 0));

  -- Fällt ein Lauf aus, holt der nächste bis zu sieben Tage nach.
  select value::date into last_run from public.app_settings where key = 'daily_last_run';
  last_run := greatest(coalesce(last_run, today - 1), today - 7);

  -- 1. Vorgemerkte Pässe starten: Planphasen, deren Beginn seit dem letzten Lauf erreicht ist.
  --    Ersetzte Phasen starten nie. Am Kauftag begonnene Pässe hat grant_pass schon eingetragen.
  with due as (
    select distinct on (p.user_id) p.*
      from public.plan_periods p
     where p.user_id is not null
       and p.superseded_by is null
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

  insert into public.app_settings (key, value) values ('daily_last_run', today::text)
  on conflict (key) do update set value = excluded.value;

  return jsonb_build_object('date', today, 'passes_started', started,
                            'access_expired', expired, 'jobs_archived', archived,
                            'consents_deleted', consents);
end;
$$;
