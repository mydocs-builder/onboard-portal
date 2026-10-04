-- Erstattungen: an der Planphase vermerkt, damit die Auswertung sie nicht als Verkauf zählt.
-- Der tägliche Abgleich mit Stripe trägt sie ein. Den Zugang ändert das nicht; ihn setzt der
-- Admin per Hand auf Free.
-- Quelle: docs/datenmodell.md, "Umsetzung der täglichen Funktion".

alter table public.plan_periods
  add column refunded_at    timestamptz,
  add column refunded_cents integer check (refunded_cents > 0),
  add constraint plan_periods_refund_complete check ((refunded_at is null) = (refunded_cents is null));

-- Vermerkt den in Stripe erstatteten Betrag an der Planphase der Checkout-Session und schreibt
-- einen Eintrag ins Änderungsprotokoll. Ein unveränderter Betrag ändert nichts (täglicher Aufruf).
create function public.record_refund(p_session_id text, p_refunded_cents integer, p_refunded_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  per public.plan_periods;
begin
  select * into per from public.plan_periods where stripe_session_id = p_session_id for update;
  if not found then
    return jsonb_build_object('found', false, 'changed', false);
  end if;
  if per.refunded_cents is not distinct from p_refunded_cents then
    return jsonb_build_object('found', true, 'changed', false);
  end if;

  update public.plan_periods
     set refunded_at = p_refunded_at, refunded_cents = p_refunded_cents
   where id = per.id;

  if per.user_id is not null then
    insert into public.audit_log (user_id, actor, text)
    values (per.user_id, 'stripe',
            format('Erstattung in Stripe: %s € für den %s-Pass %s bis %s. Der Zugang wird dadurch nicht geändert.',
                   replace(to_char(p_refunded_cents / 100.0, 'FM999990.00'), '.', ','),
                   initcap(per.plan::text),
                   to_char(per.starts_on, 'DD.MM.YYYY'), to_char(per.ends_on, 'DD.MM.YYYY')));
  end if;

  return jsonb_build_object(
    'found', true, 'changed', true, 'user_id', per.user_id, 'plan', per.plan,
    'starts_on', per.starts_on, 'ends_on', per.ends_on,
    -- Hat der Nutzer noch Zugang, muss der Admin ihn per Hand auf Free setzen.
    'access_active', exists (select 1 from public.plan_access a
                              where a.user_id = per.user_id and a.plan <> 'free'
                                and a.valid_until >= public.portal_today()));
end;
$$;

grant execute on function public.record_refund(text, integer, timestamptz) to service_role;
