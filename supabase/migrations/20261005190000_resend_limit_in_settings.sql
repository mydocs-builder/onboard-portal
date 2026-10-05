-- Die Grenze für "Send the link again" (confirmation_resend_limit) wird für das Frontend lesbar,
-- damit sie dort nicht fest im Code steht.
-- Quelle: docs/datenmodell.md, Abschnitt "Zugriffsregeln".
--
-- public_settings() bekommt den Wert zu den übrigen Grenzwerten. Die Seite "Check your inbox" sieht
-- aber ein Besucher, der noch nicht angemeldet ist, und Besucher dürfen nur registration_info()
-- aufrufen; deshalb trägt auch registration_info() den Wert. Beide Funktionen ändern ihren
-- Rückgabetyp und werden dafür neu angelegt; Rechte wie bisher.

drop function public.public_settings();

create function public.public_settings()
returns table (
  free_application_limit    integer,
  pass_reminder_days        integer,
  confirmation_resend_limit integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select (select value::integer from public.app_settings where key = 'free_application_limit'),
         (select value::integer from public.app_settings where key = 'pass_reminder_days'),
         (select value::integer from public.app_settings where key = 'confirmation_resend_limit')
  where public.is_active_user();
$$;

grant execute on function public.public_settings() to authenticated;

drop function public.registration_info();

create function public.registration_info()
returns table (
  registration_mode         public.registration_mode,
  sales_enabled             boolean,
  pilot_plan                public.plan_level,
  pilot_until               date,
  confirmation_resend_limit integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.registration_mode,
         l.sales_enabled,
         case when pilot.active then l.new_account_grant::text::public.plan_level end,
         case when pilot.active then l.grant_until end,
         (select value::integer from public.app_settings where key = 'confirmation_resend_limit')
  from public.launch_settings l,
       lateral (select l.new_account_grant <> 'none'
                       and coalesce(l.grant_until >= public.portal_today(), false) as active) pilot;
$$;

grant execute on function public.registration_info() to anon, authenticated;
