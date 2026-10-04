-- Mail "Your pass has ended" nennt die abgelaufene Stufe. plan_access steht nach dem Ablauf schon
-- auf free; Stufe und Quelle kommen deshalb aus der Planphase, die am Ablaufdatum endete.
-- Gibt es keine (Zugang vom Admin ohne Planphase gesetzt), bleiben beide leer und der Text allgemein.
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
