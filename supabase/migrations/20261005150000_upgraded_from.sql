-- Beim Upgrade hält die Planphase fest, von welcher Stufe aus gewechselt wurde. Die Kaufbestätigung
-- liest die bisherige Stufe von dort, statt sie abzuleiten.
-- Quelle: docs/datenmodell.md, "Freischaltung eines bezahlten Passes".

alter table public.plan_periods
  add column upgraded_from public.plan_level
  check (upgraded_from is null or (upgraded_from <> 'free' and upgraded_from < plan));

-- grant_pass(): trägt beim Upgrade die bisherige Stufe des Zugangs ein, sonst unverändert.
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
     where user_id = p_user_id and starts_on > today and superseded_by is null;
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
       and q.superseded_by is null and q.plan < p_plan;

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
       and q.superseded_by is null and q.plan < p_plan and q.id <> new_id;
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
