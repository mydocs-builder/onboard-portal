-- Unbestätigte Konten: Die tägliche Funktion löscht selbst registrierte Konten, deren E-Mail-Adresse
-- nach Ablauf der Frist nicht bestätigt ist; eingeladene Konten bleiben. Der Bestätigungslink lässt
-- sich je Konto nur begrenzt oft erneut senden.
begin;
set search_path = public, extensions, tests;
select plan(31);
select tests.fixtures();

create temp table d as select portal_today() as today;
grant select on d to public;

-- In der Startphase bekommt pia beim Anlegen Plus kostenlos (Planphase mit Quelle pilot).
update launch_settings set new_account_grant = 'plus', grant_until = portal_today() + 60;
select tests.create_user('pia');
update launch_settings set new_account_grant = 'none', grant_until = null;

select tests.create_user('una');
select tests.create_user('uwe');
select tests.create_user('ute');
select tests.create_user('carl');
select tests.create_user('vera');
select tests.create_user('ines', '{}', '{"invited_by_admin": "true"}');

-- Registriert vor so vielen Tagen, mittags deutscher Zeit; der Bestätigungslink ging dabei einmal hinaus.
create function pg_temp.registered(name text, days_ago integer) returns void language sql as $$
  update auth.users
     set created_at = ((public.portal_today() - days_ago)::timestamp + interval '12 hours') at time zone 'Europe/Berlin',
         confirmation_sent_at = ((public.portal_today() - days_ago)::timestamp + interval '12 hours') at time zone 'Europe/Berlin'
   where id = tests.uid(name);
$$;
select pg_temp.registered('una', 8);
select pg_temp.registered('uwe', 7);
select pg_temp.registered('ute', 6);
select pg_temp.registered('pia', 10);
select pg_temp.registered('carl', 30);
select pg_temp.registered('vera', 1);
select pg_temp.registered('ines', 30);
update auth.users set email_confirmed_at = now() - interval '29 days' where id = tests.uid('carl');
update auth.users set invited_at = created_at where id = tests.uid('ines');

-- ---------------------------------------------------------------------------------------------
-- Einstellungen
-- ---------------------------------------------------------------------------------------------

select is((select value from app_settings where key = 'unconfirmed_account_days'), '7', 'unconfirmed accounts are kept for 7 days');
select is((select value from app_settings where key = 'confirmation_resend_limit'), '3', 'the confirmation link can be sent again 3 times');

-- ---------------------------------------------------------------------------------------------
-- Löschen nach Ablauf der Frist
-- ---------------------------------------------------------------------------------------------

select is((select count(*) from plan_periods where user_id = tests.uid('pia') and source = 'pilot'), 1::bigint,
  'setup: the unconfirmed pilot account has its free plan period');
create temp table before_run as select count(*) as periods from plan_periods;

select tests.as_service();
select is((daily_run() ->> 'unconfirmed_accounts_deleted')::integer, 3, 'the daily run reports three deleted accounts');
select tests.logout();

select is_empty($$ select 1 from auth.users where id in (tests.uid('una'), tests.uid('uwe'), tests.uid('pia')) $$,
  'unconfirmed accounts are deleted on the 7th day after registration and later');
select is_empty($$ select 1 from profiles where user_id in (tests.uid('una'), tests.uid('uwe'), tests.uid('pia')) $$,
  'their profiles are gone with them');
select is_empty($$ select 1 from plan_access where user_id in (tests.uid('una'), tests.uid('uwe'), tests.uid('pia')) $$,
  'and so is their access row');

select ok(exists (select 1 from auth.users where id = tests.uid('ute')), 'an account registered 6 days ago stays');
select ok(exists (select 1 from auth.users where id = tests.uid('carl')), 'a confirmed account stays, however old');
select ok(exists (select 1 from auth.users where id = tests.uid('ines')), 'an account invited by the admin stays, even unconfirmed');
select ok(exists (select 1 from profiles where user_id = tests.uid('ines') and invited_by_admin), 'and keeps its status "invited"');
select ok(exists (select 1 from auth.users where id = tests.uid('alice')), 'other accounts are not touched');
select is((select count(*) from applications where user_id = tests.uid('bob')), 1::bigint, 'nor is their data');

select is((select count(*) from plan_periods), (select periods - 1 from before_run),
  'the pilot period of the never-confirmed account is removed');
select is_empty($$ select 1 from plan_periods where deleted_account_id is not null $$,
  'and is not kept as an anonymous period for the reports');

select is((select count(*) from audit_log where user_id is null and actor = 'system' and text like 'Unbestätigtes Konto gelöscht%'), 3::bigint,
  'each deletion leaves one audit entry without a user');
select is_empty($$ select 1 from audit_log where text like 'Unbestätigtes Konto gelöscht%' and (text like '%@%' or text ilike '%una%' or text ilike '%pia%') $$,
  'the audit entries carry no name and no email address');

select tests.as_service();
select is((daily_run() ->> 'unconfirmed_accounts_deleted')::integer, 0, 'a second run on the same day deletes nothing more');
select tests.logout();

-- Die Frist ist eine Einstellung.
update app_settings set value = '3' where key = 'unconfirmed_account_days';
select tests.as_service();
select is((daily_run() ->> 'unconfirmed_accounts_deleted')::integer, 1, 'with a shorter period the 6-day-old account is deleted too');
select tests.logout();
select is_empty($$ select 1 from auth.users where id = tests.uid('ute') $$, 'it is gone');
select ok(exists (select 1 from auth.users where id = tests.uid('vera')), 'the account registered yesterday stays');

-- ---------------------------------------------------------------------------------------------
-- Bestätigungslink erneut senden: höchstens drei Mal je Konto
-- ---------------------------------------------------------------------------------------------

select is((select confirmation_resends from profiles where user_id = tests.uid('vera')), 0,
  'the first link sent with the registration does not count');

update auth.users set confirmation_sent_at = now() + interval '1 minute' where id = tests.uid('vera');
update auth.users set confirmation_sent_at = now() + interval '2 minutes' where id = tests.uid('vera');
select lives_ok($$ update auth.users set confirmation_sent_at = now() + interval '3 minutes' where id = tests.uid('vera') $$,
  'the link can be sent again a third time');
select is((select confirmation_resends from profiles where user_id = tests.uid('vera')), 3, 'each resend is counted');

select throws_ok($$ update auth.users set confirmation_sent_at = now() + interval '4 minutes' where id = tests.uid('vera') $$,
  'P0001', 'confirmation_resend_limit_reached', 'the fourth resend is refused');
select is((select confirmation_resends from profiles where user_id = tests.uid('vera')), 3, 'the counter stays at the limit');

-- Der Kandidat kann den Zähler nicht selbst zurücksetzen.
select tests.login('alice');
select throws_ok($$ update profiles set confirmation_resends = 5 where user_id = tests.uid('alice') $$, '42501', null,
  'a candidate cannot write the resend counter');
select tests.logout();

-- Andere Änderungen am Konto zählen nicht, bestätigte und eingeladene Konten sind nicht begrenzt.
select lives_ok($$ update auth.users set raw_user_meta_data = raw_user_meta_data || '{"x": 1}' where id = tests.uid('vera') $$,
  'other changes to the account are not affected by the limit');
update auth.users set confirmation_sent_at = now() + interval '1 minute' where id = tests.uid('carl');
select is((select confirmation_resends from profiles where user_id = tests.uid('carl')), 0, 'a confirmed account is not counted');
do $$ begin for i in 1..5 loop
  update auth.users set confirmation_sent_at = now() + i * interval '1 minute' where id = tests.uid('ines');
end loop; end $$;
select is((select confirmation_resends from profiles where user_id = tests.uid('ines')), 0,
  'an invitation by the admin can be sent again without limit');

-- Die Grenze ist eine Einstellung.
update app_settings set value = '4' where key = 'confirmation_resend_limit';
select lives_ok($$ update auth.users set confirmation_sent_at = now() + interval '5 minutes' where id = tests.uid('vera') $$,
  'with a higher limit one more resend is possible');

select * from finish();
rollback;
