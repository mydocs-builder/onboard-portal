-- Vollständig erstattete vorgemerkte Pässe zählen nicht mehr als Pass: Die tägliche Funktion
-- startet sie nicht und verschickt keine Mail dazu, sie verhindern die Erinnerung vor Ablauf
-- nicht, und grant_pass() hängt neue Pässe nicht hinter sie und rechnet sie beim Upgrade nicht um.
-- Die Planphase bleibt mit dem Vermerk der Erstattung stehen.
-- "Vollständig erstattet" heißt: refunded_cents erreicht amount_cents. Eine Teilerstattung ändert nichts.
-- Quelle: docs/datenmodell.md, "Umsetzung der täglichen Funktion".
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

  insert into public.app_settings (key, value) values ('daily_last_run', today::text)
  on conflict (key) do update set value = excluded.value;

  return jsonb_build_object('date', today, 'passes_started', started,
                            'access_expired', expired, 'jobs_archived', archived,
                            'consents_deleted', consents);
end;
$$;

create or replace function public.daily_mails()
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
  -- Vorgemerkter Pass ist gestartet: "Your pass starts today"
  select 'pass_started'::public.email_kind, pe.user_id, pe.email, pe.first_name, pp.id,
         jsonb_build_object('plan', pp.plan, 'ends_on', pp.ends_on)
    from env, public.plan_periods pp join people pe on pe.user_id = pp.user_id
   where pp.superseded_by is null and not coalesce(pp.refunded_cents >= pp.amount_cents, false)
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
                      where q.user_id = a.user_id and q.superseded_by is null and q.starts_on > env.today
                        and not coalesce(q.refunded_cents >= q.amount_cents, false))
     and not exists (select 1 from public.email_log l
                      where l.user_id = a.user_id and l.kind = 'pass_ending'
                        and l.sent_on >= a.valid_until - env.remind_days)
  union all
  -- Zugang ist abgelaufen: "Your pass has ended"
  select 'pass_ended', pe.user_id, pe.email, pe.first_name, null,
         jsonb_build_object('ended_on', a.valid_until, 'sales_enabled', env.sales_enabled,
                            'plan', ended.plan, 'source', ended.source)
    from env, public.plan_access a join people pe on pe.user_id = a.user_id
    left join lateral (
      select q.plan, q.source from public.plan_periods q
       where q.user_id = a.user_id and q.superseded_by is null and q.ends_on = a.valid_until
       order by q.starts_on desc limit 1) ended on true
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

create or replace function public.grant_pass(
  p_user_id      uuid,
  p_plan         public.plan_level,
  p_length       public.pass_length,
  p_session_id   text,
  p_amount_cents integer,
  p_promo_code   text default null,
  p_customer_id  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  today      date := public.portal_today();
  days       integer := public.pass_days(p_length);
  acc        public.plan_access;
  existing   public.plan_periods;
  last_end   date;
  new_cents  integer;
  value      numeric := 0;   -- bezahlter Restwert in Cent
  credit     integer := 0;
  starts     date;
  ends       date;
  upgrade    boolean := false;
  new_id     uuid;
  replaced   integer := 0;
begin
  if p_plan = 'free' or p_session_id is null then
    raise exception 'invalid_pass' using errcode = '22023';
  end if;

  -- Sperrt den Zugang des Nutzers: zwei Meldungen für denselben Nutzer laufen nacheinander.
  select * into acc from public.plan_access where user_id = p_user_id for update;
  if not found then
    raise exception 'unknown_user' using errcode = 'P0002';
  end if;

  select * into existing from public.plan_periods where stripe_session_id = p_session_id;
  if found then
    return jsonb_build_object('already_processed', true, 'plan', existing.plan,
                              'starts_on', existing.starts_on, 'ends_on', existing.ends_on,
                              'credit_days', coalesce(existing.credit_days, 0));
  end if;

  if acc.plan <> 'free' and acc.valid_until >= today then
    upgrade := p_plan > acc.plan;
    -- Spätestes Ende: laufender Zugang und alle vorgemerkten, nicht ersetzten Phasen.
    select greatest(acc.valid_until, max(ends_on)) into last_end
      from public.plan_periods
     where user_id = p_user_id and starts_on > today and superseded_by is null
       and not coalesce(refunded_cents >= amount_cents, false);
    last_end := coalesce(last_end, acc.valid_until);
  end if;

  if last_end is null then
    starts := today;
    ends := today + days - 1;
  elsif upgrade then
    -- Laufender Pass: Resttage einschließlich heute. Eine kostenlose Freischaltung zählt nicht.
    if acc.source = 'pass' and acc.pass_length is not null then
      select value + (acc.valid_until - today + 1) * (pr.amount_cents::numeric / public.pass_days(acc.pass_length))
        into value
        from public.prices pr
       where pr.plan = acc.plan and pr.pass_length = acc.pass_length and pr.active;
      value := coalesce(value, 0);
    end if;

    -- Vorgemerkte bezahlte Pässe niedrigerer Stufe: volle Laufzeit.
    select value + coalesce(sum((q.ends_on - q.starts_on + 1)
                                * (pr.amount_cents::numeric / public.pass_days(q.pass_length))), 0)
      into value
      from public.plan_periods q
      join public.prices pr on pr.plan = q.plan and pr.pass_length = q.pass_length and pr.active
     where q.user_id = p_user_id and q.source = 'pass' and q.starts_on > today
       and q.superseded_by is null and q.plan < p_plan
       and not coalesce(q.refunded_cents >= q.amount_cents, false);

    select amount_cents into new_cents from public.prices
     where plan = p_plan and pass_length = p_length and active;
    if new_cents > 0 then
      credit := floor(value / (new_cents::numeric / days));
    end if;

    starts := today;
    ends := today + days - 1 + credit;
  else
    starts := last_end + 1;
    ends := last_end + days;
  end if;

  insert into public.plan_periods
    (user_id, plan, source, pass_length, starts_on, ends_on, promo_code, amount_cents, credit_days,
     stripe_session_id, granted_by, upgraded_from)
  values
    (p_user_id, p_plan, 'pass', p_length, starts, ends, p_promo_code, p_amount_cents,
     case when upgrade then credit end, p_session_id, 'stripe',
     case when upgrade then acc.plan end)
  returning id into new_id;

  if upgrade then
    update public.plan_periods q
       set superseded_by = new_id
     where q.user_id = p_user_id and q.source = 'pass' and q.starts_on > today
       and q.superseded_by is null and q.plan < p_plan and q.id <> new_id
       and not coalesce(q.refunded_cents >= q.amount_cents, false);
    get diagnostics replaced = row_count;
  end if;

  if starts = today then
    update public.plan_access
       set plan = p_plan, source = 'pass', pass_length = p_length, valid_until = ends,
           manual_reason = null, stripe_customer_id = coalesce(p_customer_id, stripe_customer_id)
     where user_id = p_user_id;
  elsif p_customer_id is not null then
    update public.plan_access set stripe_customer_id = p_customer_id where user_id = p_user_id;
  end if;

  insert into public.audit_log (user_id, actor, text)
  values (p_user_id, 'stripe',
          format('%s-Pass (%s) gekauft, gültig %s bis %s%s%s%s',
                 initcap(p_plan::text),
                 case p_length when 'month' then '1 Monat' else '3 Monate' end,
                 to_char(starts, 'DD.MM.YYYY'), to_char(ends, 'DD.MM.YYYY'),
                 case when credit > 0 then format(', %s Tage aus dem bisherigen Pass umgerechnet', credit) else '' end,
                 case when replaced > 0 then format(', %s vorgemerkte Pässe ersetzt', replaced) else '' end,
                 case when p_promo_code is not null then format(', Gutscheincode %s', p_promo_code) else '' end));

  return jsonb_build_object('already_processed', false, 'plan', p_plan,
                            'starts_on', starts, 'ends_on', ends, 'credit_days', credit);
end;
$$;
