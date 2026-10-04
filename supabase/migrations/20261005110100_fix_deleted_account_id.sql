-- Korrektur: Beim Löschen eines Kontos bekamen dessen Planphasen je nach Ausführungsplan der
-- Datenbank unterschiedliche zufällige Kennungen statt einer gemeinsamen. Die Kennung wird jetzt
-- einmal erzeugt und dann für alle Phasen des Kontos verwendet.
create or replace function public.handle_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_ref constant uuid := gen_random_uuid();
begin
  update public.plan_periods
     set user_id = null, deleted_account_id = account_ref, stripe_session_id = null
   where user_id = old.user_id;
  return old;
end;
$$;
