-- Vorschau für die Bestellübersicht: Beginn, Ablaufdatum und Umrechnung eines Passes, bevor bezahlt wird.
-- Quelle: docs/datenmodell.md, Abschnitt "Zugang, Pässe und Startphase".
--
-- Die Rechnung steht jetzt genau einmal, in pass_terms(). grant_pass() schaltet damit frei,
-- preview_pass() zeigt dem Kandidaten dasselbe Ergebnis vorab. Am Verhalten von grant_pass()
-- ändert sich nichts.

-- ---------------------------------------------------------------------------------------------
-- Laufzeit eines neuen Passes für einen Nutzer, Stand heute. Ändert nichts.
--   kein laufender Zugang:             Beginn heute
--   gleiche oder niedrigere Stufe:     Beginn am Tag nach dem spätesten Ende
--   Upgrade:                           Beginn heute, bezahlter Restwert in Tage umgerechnet
-- current_plan und current_source sind leer, wenn kein Zugang läuft.
-- ---------------------------------------------------------------------------------------------
create function public.pass_terms(
  p_user_id uuid,
  p_plan    public.plan_level,
  p_length  public.pass_length
)
returns table (
  starts_on      date,
  ends_on        date,
  upgrade        boolean,
  credit_days    integer,
  current_plan   public.plan_level,
  current_source public.access_source
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today      date := public.portal_today();
  days       integer := public.pass_days(p_length);
  acc        public.plan_access;
  last_end   date;
  new_cents  integer;
  value      numeric := 0;   -- bezahlter Restwert in Cent
begin
  if p_plan = 'free' then
    raise exception 'invalid_pass' using errcode = '22023';
  end if;

  select * into acc from public.plan_access a where a.user_id = p_user_id;
  if not found then
    raise exception 'unknown_user' using errcode = 'P0002';
  end if;

  upgrade := false;
  credit_days := 0;

  if acc.plan <> 'free' and acc.valid_until >= today then
    current_plan := acc.plan;
    current_source := acc.source;
    upgrade := p_plan > acc.plan;
    -- Spätestes Ende: laufender Zugang und alle vorgemerkten, nicht ersetzten Phasen.
    select greatest(acc.valid_until, max(q.ends_on)) into last_end
      from public.plan_periods q
     where q.user_id = p_user_id and q.starts_on > today and q.superseded_by is null
       and not coalesce(q.refunded_cents >= q.amount_cents, false);
    last_end := coalesce(last_end, acc.valid_until);
  end if;

  if last_end is null then
    starts_on := today;
    ends_on := today + days - 1;
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

    select pr.amount_cents into new_cents from public.prices pr
     where pr.plan = p_plan and pr.pass_length = p_length and pr.active;
    if new_cents > 0 then
      credit_days := floor(value / (new_cents::numeric / days));
    end if;

    starts_on := today;
    ends_on := today + days - 1 + credit_days;
  else
    starts_on := last_end + 1;
    ends_on := last_end + days;
  end if;

  return next;
end;
$$;

-- Nur der Server; Kandidaten erreichen die Rechnung über preview_pass().
grant execute on function public.pass_terms(uuid, public.plan_level, public.pass_length) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Freischaltung eines bezahlten Passes: wie bisher, die Laufzeit kommt aus pass_terms().
-- ---------------------------------------------------------------------------------------------
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
  acc        public.plan_access;
  existing   public.plan_periods;
  terms      record;
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

  select * into terms from public.pass_terms(p_user_id, p_plan, p_length);

  insert into public.plan_periods
    (user_id, plan, source, pass_length, starts_on, ends_on, promo_code, amount_cents, credit_days,
     stripe_session_id, granted_by, upgraded_from)
  values
    (p_user_id, p_plan, 'pass', p_length, terms.starts_on, terms.ends_on, p_promo_code, p_amount_cents,
     case when terms.upgrade then terms.credit_days end, p_session_id, 'stripe',
     case when terms.upgrade then acc.plan end)
  returning id into new_id;

  if terms.upgrade then
    update public.plan_periods q
       set superseded_by = new_id
     where q.user_id = p_user_id and q.source = 'pass' and q.starts_on > today
       and q.superseded_by is null and q.plan < p_plan and q.id <> new_id
       and not coalesce(q.refunded_cents >= q.amount_cents, false);
    get diagnostics replaced = row_count;
  end if;

  if terms.starts_on = today then
    update public.plan_access
       set plan = p_plan, source = 'pass', pass_length = p_length, valid_until = terms.ends_on,
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
                 to_char(terms.starts_on, 'DD.MM.YYYY'), to_char(terms.ends_on, 'DD.MM.YYYY'),
                 case when terms.credit_days > 0 then format(', %s Tage aus dem bisherigen Pass umgerechnet', terms.credit_days) else '' end,
                 case when replaced > 0 then format(', %s vorgemerkte Pässe ersetzt', replaced) else '' end,
                 case when p_promo_code is not null then format(', Gutscheincode %s', p_promo_code) else '' end));

  return jsonb_build_object('already_processed', false, 'plan', p_plan,
                            'starts_on', terms.starts_on, 'ends_on', terms.ends_on, 'credit_days', terms.credit_days);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Vorschau für den angemeldeten Kandidaten, nur für das eigene Konto. Liefert nichts, wenn das
-- Konto gesperrt ist oder es den Pass nicht zu kaufen gibt (kein aktiver Preis).
-- Ob der Verkauf eingeschaltet ist, prüft weiterhin begin_checkout().
-- ---------------------------------------------------------------------------------------------
create function public.preview_pass(p_plan public.plan_level, p_length public.pass_length)
returns table (
  starts_on      date,
  ends_on        date,
  upgrade        boolean,
  credit_days    integer,
  current_plan   public.plan_level,
  current_source public.access_source,
  amount_cents   integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.starts_on, t.ends_on, t.upgrade, t.credit_days, t.current_plan, t.current_source, pr.amount_cents
  from public.prices pr,
       lateral public.pass_terms(auth.uid(), p_plan, p_length) t
  where pr.plan = p_plan and pr.pass_length = p_length and pr.active
    and public.is_active_user();
$$;

grant execute on function public.preview_pass(public.plan_level, public.pass_length) to authenticated;
