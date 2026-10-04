-- Zeitplan der täglichen Funktion: jeden Morgen um 04:00 UTC (05:00 bzw. 06:00 Uhr deutscher Zeit)
-- ruft die Datenbank die Edge Function "daily" auf.
--
-- Adresse und Schlüssel stehen nicht in der Migration, sondern je Umgebung im Vault:
--   select vault.create_secret('https://<host>/functions/v1/daily', 'daily_function_url');
--   select vault.create_secret('<Service-Role-Schlüssel>', 'daily_function_key');
-- Fehlt einer der beiden Einträge, passiert nichts. Lokal ist das der Normalfall; dort wird die
-- Funktion von Hand aufgerufen (siehe README).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create function public.call_daily_function()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
  secret text;
begin
  select decrypted_secret into target from vault.decrypted_secrets where name = 'daily_function_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'daily_function_key';
  if target is null or secret is null then
    raise notice 'daily function not configured, skipping';
    return;
  end if;

  perform net.http_post(
    url := target,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
end;
$$;

select cron.schedule('portal-daily', '0 4 * * *', $$select public.call_daily_function()$$);
