-- Tägliche Funktion: alles Zeitgesteuerte.
-- Quelle: docs/datenmodell.md, Abschnitt "Geplante Funktionen und Mails".
--
-- Aufteilung: daily_run() ändert den Zustand in einer Transaktion (vorgemerkte Pässe starten,
-- abgelaufene Zugänge beenden, abgelaufene Jobs archivieren). daily_mails() leitet aus dem
-- Zustand ab, welche Mails noch fehlen; daily_mail_sent() vermerkt eine verschickte Mail.
-- Verschickt werden die Mails von der Edge Function "daily". Schlägt der Versand fehl, liefert
-- der nächste Lauf dieselbe Mail wieder. Alle drei Funktionen darf nur der Server aufrufen.

-- Erinnerung an fällige Schritte: nur für Bewerbungen, die noch laufen.
create function public.is_open_application(status public.application_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select status in ('planned', 'applied', 'interview', 'offer');
$$;

create function public.daily_run()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  today    date := public.portal_today();
  last_run date;
  job_days integer;
  started  integer;
  expired  integer;
  archived integer;
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

  insert into public.app_settings (key, value) values ('daily_last_run', today::text)
  on conflict (key) do update set value = excluded.value;

  return jsonb_build_object('date', today, 'passes_started', started,
                            'access_expired', expired, 'jobs_archived', archived);
end;
$$;

-- Fällige Mails, abgeleitet aus dem Zustand. Jede Zeile ist eine Mail; data trägt, was der Text braucht.
-- Gesperrte Konten bekommen keine Mails.
create function public.daily_mails()
returns table (
  kind       public.email_kind,
  user_id    uuid,
  email      text,
  first_name text,
  ref_id     uuid,
  data       jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with env as (
    select public.portal_today() as today,
           coalesce((select value::integer from public.app_settings where key = 'pass_reminder_days'), 7) as remind_days,
           (select sales_enabled from public.launch_settings) as sales_enabled
  ), people as (
    select p.user_id, u.email::text as email, p.first_name, p.reminders_enabled
      from public.profiles p join auth.users u on u.id = p.user_id
     where p.blocked_at is null and u.email is not null
  )
  -- Vorgemerkter Pass ist gestartet: "Your pass is active"
  select 'pass_started'::public.email_kind, pe.user_id, pe.email, pe.first_name, pp.id,
         jsonb_build_object('plan', pp.plan, 'ends_on', pp.ends_on)
    from env, public.plan_periods pp join people pe on pe.user_id = pp.user_id
   where pp.superseded_by is null
     and pp.starts_on <= env.today and pp.starts_on > env.today - 3 and pp.ends_on >= env.today
     and (pp.created_at at time zone 'Europe/Berlin')::date < pp.starts_on
     and not exists (select 1 from public.email_log l
                      where l.user_id = pp.user_id and l.kind = 'pass_started' and l.ref_id = pp.id)
  union all
  -- Zugang endet in pass_reminder_days Tagen, und es ist nichts vorgemerkt
  select 'pass_ending', pe.user_id, pe.email, pe.first_name, null,
         jsonb_build_object('plan', a.plan, 'source', a.source, 'valid_until', a.valid_until,
                            'sales_enabled', env.sales_enabled)
    from env, public.plan_access a join people pe on pe.user_id = a.user_id
   where a.plan <> 'free'
     and a.valid_until >= env.today and a.valid_until <= env.today + env.remind_days
     and not exists (select 1 from public.plan_periods q
                      where q.user_id = a.user_id and q.superseded_by is null and q.starts_on > env.today)
     and not exists (select 1 from public.email_log l
                      where l.user_id = a.user_id and l.kind = 'pass_ending'
                        and l.sent_on >= a.valid_until - env.remind_days)
  union all
  -- Zugang ist abgelaufen: "Your pass has ended"
  select 'pass_ended', pe.user_id, pe.email, pe.first_name, null,
         jsonb_build_object('ended_on', a.valid_until, 'sales_enabled', env.sales_enabled)
    from env, public.plan_access a join people pe on pe.user_id = a.user_id
   where a.plan = 'free' and a.valid_until < env.today and a.valid_until >= env.today - 3
     and not exists (select 1 from public.email_log l
                      where l.user_id = a.user_id and l.kind = 'pass_ended' and l.sent_on > a.valid_until)
  union all
  -- Fällige nächste Schritte: eine gesammelte Mail je Nutzer, je Termin nur einmal
  select 'reminder_next_step', pe.user_id, pe.email, pe.first_name, null,
         jsonb_build_object('applications', jsonb_agg(
           jsonb_build_object('company', ap.company, 'position', ap.position, 'next_type', ap.next_type)
           order by ap.company))
    from env, public.applications ap join people pe on pe.user_id = ap.user_id
   where pe.reminders_enabled
     and ap.next_on <= env.today and ap.next_on > env.today - 3
     and ap.next_type <> 'none' and public.is_open_application(ap.status)
     and ap.reminded_for is distinct from ap.next_on
   group by pe.user_id, pe.email, pe.first_name
  union all
  -- Gesprächstermin morgen
  select 'interview_tomorrow', pe.user_id, pe.email, pe.first_name, ap.id,
         jsonb_build_object('company', ap.company, 'position', ap.position, 'on', ap.next_on)
    from env, public.applications ap join people pe on pe.user_id = ap.user_id
   where pe.reminders_enabled
     and ap.next_type = 'interview' and ap.next_on = env.today + 1
     and public.is_open_application(ap.status)
     and not exists (select 1 from public.email_log l
                      where l.user_id = ap.user_id and l.kind = 'interview_tomorrow' and l.ref_id = ap.id
                        and l.sent_on > ap.next_on - 3);
$$;

-- Vermerkt eine verschickte Mail. Bei der Erinnerung an fällige Schritte wird zusätzlich an den
-- Bewerbungen festgehalten, für welchen Termin erinnert wurde.
create function public.daily_mail_sent(p_kind public.email_kind, p_user_id uuid, p_ref_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := public.portal_today();
begin
  insert into public.email_log (user_id, kind, ref_id) values (p_user_id, p_kind, p_ref_id)
  on conflict do nothing;

  if p_kind = 'reminder_next_step' then
    update public.applications
       set reminded_for = next_on
     where user_id = p_user_id and next_on <= today and next_on > today - 3
       and next_type <> 'none' and public.is_open_application(status)
       and reminded_for is distinct from next_on;
  end if;
end;
$$;

grant execute on function public.is_open_application(public.application_status) to authenticated, service_role;
grant execute on function public.daily_run() to service_role;
grant execute on function public.daily_mails() to service_role;
grant execute on function public.daily_mail_sent(public.email_kind, uuid, uuid) to service_role;
