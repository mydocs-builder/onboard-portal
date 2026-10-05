-- confirmation_resend_limit wieder aus public_settings() herausnehmen: Gelesen wird der Wert nur auf
-- der Seite "Check your inbox", vor der Anmeldung, und dafür reicht registration_info().
-- Quelle: docs/datenmodell.md, Abschnitt "Zugriffsregeln".
-- Der Rückgabetyp ändert sich, deshalb wird die Funktion neu angelegt; Rechte wie bisher.

drop function public.public_settings();

create function public.public_settings()
returns table (
  free_application_limit integer,
  pass_reminder_days     integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select (select value::integer from public.app_settings where key = 'free_application_limit'),
         (select value::integer from public.app_settings where key = 'pass_reminder_days')
  where public.is_active_user();
$$;

grant execute on function public.public_settings() to authenticated;
