-- Freischaltung eines bezahlten Passes. Wird nur vom Stripe-Webhook mit dem Service-Role-Schlüssel
-- aufgerufen; alle Schritte laufen in einer Transaktion.
-- Quelle: docs/umfang-phase-1.md ("Regel für neue Pässe bei laufendem Zugang"), docs/datenmodell.md.

-- Laufzeit eines Passes in Tagen.
create function public.pass_days(length public.pass_length)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case length when 'month' then 30 when 'quarter' then 90 end;
$$;

-- Regeln:
-- - Kein laufender Zugang: Beginn heute.
-- - Upgrade auf eine höhere Stufe: gilt sofort. Der Restwert eines bezahlten Passes (Resttage
--   einschließlich heute, zum Listenpreis pro Tag) wird in Tage der neuen Stufe umgerechnet und
--   abgerundet. Resttage einer kostenlosen Freischaltung werden nicht umgerechnet.
-- - Gleiche oder niedrigere Stufe, auch während einer Freischaltung: Beginn am Tag nach dem
--   bisherigen Ende. Der Pass ist dann vorgemerkt; plan_access stellt die tägliche Funktion um.
-- - Dieselbe Stripe-Session schaltet nur einmal frei.
create function public.grant_pass(
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
  today     date := public.portal_today();
  days      integer := public.pass_days(p_length);
  acc       public.plan_access;
  existing  public.plan_periods;
  last_end  date;
  remaining integer;
  old_cents integer;
  new_cents integer;
  credit    integer := 0;
  starts    date;
  ends      date;
  upgrade   boolean := false;
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
    -- Bisheriges Ende einschließlich bereits vorgemerkter Pässe.
    select greatest(acc.valid_until, max(ends_on)) into last_end
      from public.plan_periods where user_id = p_user_id and starts_on > today;
    last_end := coalesce(last_end, acc.valid_until);
  end if;

  if last_end is null then
    starts := today;
    ends := today + days - 1;
  elsif upgrade then
    if acc.source = 'pass' and acc.pass_length is not null then
      remaining := acc.valid_until - today + 1;
      select amount_cents into old_cents from public.prices
       where plan = acc.plan and pass_length = acc.pass_length and active;
      select amount_cents into new_cents from public.prices
       where plan = p_plan and pass_length = p_length and active;
      if old_cents is not null and new_cents > 0 then
        credit := floor(remaining * (old_cents::numeric / public.pass_days(acc.pass_length))
                                  / (new_cents::numeric / days));
      end if;
    end if;
    starts := today;
    ends := today + days - 1 + credit;
  else
    starts := last_end + 1;
    ends := last_end + days;
  end if;

  insert into public.plan_periods
    (user_id, plan, source, pass_length, starts_on, ends_on, promo_code, amount_cents, credit_days,
     stripe_session_id, granted_by)
  values
    (p_user_id, p_plan, 'pass', p_length, starts, ends, p_promo_code, p_amount_cents,
     case when upgrade then credit end, p_session_id, 'stripe');

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
          format('%s-Pass (%s) gekauft, gültig %s bis %s%s%s',
                 initcap(p_plan::text),
                 case p_length when 'month' then '1 Monat' else '3 Monate' end,
                 to_char(starts, 'DD.MM.YYYY'), to_char(ends, 'DD.MM.YYYY'),
                 case when credit > 0 then format(', %s Tage aus dem bisherigen Pass umgerechnet', credit) else '' end,
                 case when p_promo_code is not null then format(', Gutscheincode %s', p_promo_code) else '' end));

  return jsonb_build_object('already_processed', false, 'plan', p_plan,
                            'starts_on', starts, 'ends_on', ends, 'credit_days', credit);
end;
$$;

-- Plan und Pass schreibt nie der Kandidat: nur der Server darf freischalten.
revoke all on function public.grant_pass(uuid, public.plan_level, public.pass_length, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.grant_pass(uuid, public.plan_level, public.pass_length, text, integer, text, text)
  to service_role;
grant execute on function public.pass_days(public.pass_length) to authenticated, service_role;
