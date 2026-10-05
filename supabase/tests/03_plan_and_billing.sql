-- Zugang und Bezahlung: Plan und Pass schreibt nie der Kandidat. Stufenlogik, Preise,
-- Startphase, Protokolle, Einstellungen, Kontolöschung.
begin;
set search_path = public, extensions, tests;
select plan(63);
select tests.fixtures();
update launch_settings set invite_code = 'TOP-SECRET';

-- ---------------------------------------------------------------------------------------------
-- Stufenlogik
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select is(effective_plan(tests.uid('alice'))::text, 'free', 'no pass: Free');
select is(effective_plan(tests.uid('paula')), null, 'a candidate cannot look up another user''s plan');
select tests.login('stella');
select is(effective_plan(tests.uid('stella'))::text, 'starter', 'a pass still counts on its last day');
select tests.login('paula');
select is(effective_plan(tests.uid('paula'))::text, 'plus', 'running pass: Plus');
select tests.login('eve');
select is(effective_plan(tests.uid('eve'))::text, 'free', 'expired pass: Free, although the row still says Plus');
select tests.login('bianca');
select is(effective_plan(tests.uid('bianca')), null, 'blocked account: no access at all');
select tests.as_service();
select is(effective_plan(tests.uid('paula'))::text, 'plus', 'the server can look up any user''s plan');
select tests.as_anon();
select throws_ok($$ select effective_plan(tests.uid('paula')) $$, '42501', null, 'visitors cannot call effective_plan()');

-- ---------------------------------------------------------------------------------------------
-- Kandidat: lesen ja, schreiben nie
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select results_eq($$ select user_id from plan_access $$, $$ values (tests.uid('alice')) $$,
  'a candidate reads only their own access');
select is_empty($$
  update plan_access set plan = 'plus', source = 'manual', valid_until = '2099-12-31'
   where user_id = tests.uid('alice') returning 1
$$, 'a candidate cannot upgrade their own plan');
select is(effective_plan(tests.uid('alice'))::text, 'free', 'and stays on Free');
select throws_ok($$ insert into plan_access (user_id, plan, valid_until) values (tests.uid('alice'), 'plus', '2099-12-31') $$,
  '42501', null, 'a candidate cannot insert an access row');
select throws_ok($$ delete from plan_access where user_id = tests.uid('alice') $$, '42501', null,
  'a candidate cannot delete an access row');

select tests.login('paula');
select is((select count(*) from plan_periods), 2::bigint, 'a candidate reads their own plan periods');
select is_empty($$ select 1 from plan_periods where user_id is distinct from tests.uid('paula') $$,
  'and no one else''s');
select throws_ok($$
  insert into plan_periods (user_id, plan, source, starts_on, ends_on, granted_by)
  values (tests.uid('paula'), 'plus', 'manual', portal_today(), '2099-12-31', 'me')
$$, '42501', null, 'a candidate cannot add a plan period');
select throws_ok($$ update plan_periods set ends_on = '2099-12-31' $$, '42501', null,
  'a candidate cannot extend a plan period');
select throws_ok($$ delete from plan_periods $$, '42501', null, 'a candidate cannot delete plan periods');

-- Preise
select tests.login('alice');
select results_eq($$ select stripe_price_id from prices $$, $$ values ('price_test_active') $$,
  'a candidate reads active prices only');
select throws_ok($$ insert into prices (plan, pass_length, amount_cents) values ('plus', 'quarter', 1) $$, '42501', null,
  'a candidate cannot add prices');
select is_empty($$ update prices set amount_cents = 1 returning 1 $$, 'a candidate cannot change prices');
select is_empty($$ delete from prices returning 1 $$, 'a candidate cannot delete prices');

-- Startphase
select is_empty($$ select 1 from launch_settings $$, 'a candidate cannot read launch settings, including the invite code');
select is_empty($$ update launch_settings set sales_enabled = true returning 1 $$, 'a candidate cannot change launch settings');
select results_eq($$ select registration_mode::text, sales_enabled, pilot_plan::text, pilot_until from registration_info() $$,
  $$ values ('open', false, null::text, null::date) $$, 'registration_info() tells what the registration needs');
select is((select to_jsonb(r) ? 'invite_code' from registration_info() r), false,
  'registration_info() does not carry the invite code');
select is((select confirmation_resend_limit from registration_info()), 3,
  'registration_info() carries the resend limit for the page shown before sign-in');

-- Protokolle und Einstellungen
select is_empty($$ select 1 from stripe_events $$, 'a candidate cannot read Stripe events');
select is_empty($$ select 1 from email_log $$, 'a candidate cannot read the email log, not even own entries');
select is_empty($$ select 1 from audit_log $$, 'a candidate cannot read the audit log, not even own entries');
select throws_ok($$ insert into audit_log (user_id, actor, text) values (tests.uid('alice'), 'alice', 'x') $$, '42501', null,
  'a candidate cannot write to the audit log');
select throws_ok($$ insert into stripe_events (id, type) values ('evt_fake', 'checkout.session.completed') $$, '42501', null,
  'a candidate cannot fake a Stripe event');
select is_empty($$ select 1 from app_settings $$, 'a candidate cannot read app_settings');
select is_empty($$ update app_settings set value = '1000' where key = 'free_application_limit' returning 1 $$,
  'a candidate cannot raise the Free limit');
select results_eq($$ select * from public_settings() $$, $$ values (10, 7, 3) $$,
  'public_settings() returns just the three limits');

select tests.login('bianca');
select is_empty($$ select 1 from plan_access $$, 'a blocked account cannot read its access');
select is_empty($$ select 1 from prices $$, 'a blocked account cannot read prices');
select is_empty($$ select * from public_settings() $$, 'a blocked account gets nothing from public_settings()');

-- ---------------------------------------------------------------------------------------------
-- Besucher
-- ---------------------------------------------------------------------------------------------

select tests.as_anon();
select lives_ok($$ select * from registration_info() $$, 'visitors can call registration_info()');
select throws_ok($$ select 1 from launch_settings $$, '42501', null, 'visitors cannot read launch settings');
select throws_ok($$ select 1 from prices $$, '42501', null, 'visitors cannot read prices');
select throws_ok($$ select 1 from plan_access $$, '42501', null, 'visitors cannot read access rows');
select throws_ok($$ select * from public_settings() $$, '42501', null, 'visitors cannot call public_settings()');

-- ---------------------------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------------------------

select tests.login('patrick', 'aal1');
select is((select count(*) from plan_access), 1::bigint, 'an admin without second factor reads only their own access');
select is_empty($$ select 1 from launch_settings $$, 'an admin without second factor cannot read launch settings');
select is_empty($$ select 1 from audit_log $$, 'an admin without second factor cannot read the audit log');

select tests.login('patrick', 'aal2');
select ok((select count(*) from plan_access) >= 7, 'an admin reads all access rows');
select ok((select count(*) from plan_periods) >= 3, 'an admin reads all plan periods');
select ok((select count(*) from audit_log) >= 1 and (select count(*) from stripe_events) >= 1
          and (select count(*) from email_log) >= 1, 'an admin reads audit log, Stripe events and email log');
select lives_ok($$
  update plan_access set plan = 'plus', source = 'manual', manual_reason = 'Komplett-Begleitung',
         valid_until = portal_today() + 14 where user_id = tests.uid('alice')
$$, 'an admin grants access manually');
select throws_ok($$ update plan_access set source = 'pass', pass_length = 'month' where user_id = tests.uid('alice') $$,
  '42501', null, 'an admin cannot enter a paid pass; only the webhook does');
select lives_ok($$
  insert into plan_periods (user_id, plan, source, starts_on, ends_on, reason, granted_by)
  values (tests.uid('alice'), 'plus', 'manual', portal_today(), portal_today() + 14, 'Komplett-Begleitung', 'Patrick')
$$, 'an admin adds a manual plan period');
select throws_ok($$
  insert into plan_periods (user_id, plan, source, pass_length, starts_on, ends_on, granted_by)
  values (tests.uid('alice'), 'plus', 'pass', 'month', portal_today(), portal_today() + 29, 'Patrick')
$$, '42501', null, 'an admin cannot add a paid plan period');
select throws_ok($$
  insert into plan_periods (user_id, plan, source, starts_on, ends_on, amount_cents, granted_by)
  values (tests.uid('alice'), 'plus', 'manual', portal_today(), portal_today() + 29, 2900, 'Patrick')
$$, '42501', null, 'an admin cannot book revenue on a manual period');
select throws_ok($$ delete from plan_periods $$, '42501', null, 'an admin cannot delete plan periods: history is never overwritten');
select throws_ok($$ insert into audit_log (user_id, actor, text) values (tests.uid('alice'), 'Patrick', 'x') $$, '42501', null,
  'an admin cannot write audit entries directly');
select lives_ok($$ update launch_settings set sales_enabled = true, invite_code = 'NEW' $$, 'an admin changes launch settings');
select throws_ok($$ insert into launch_settings (id) values (false) $$, '42501', null, 'launch settings stay a single row');
select lives_ok($$ update app_settings set value = '12' where key = 'free_application_limit' $$, 'an admin changes app settings');
select lives_ok($$ update prices set active = false $$, 'an admin manages prices');

select tests.login('alice');
select is(effective_plan(tests.uid('alice'))::text, 'plus', 'the manual grant takes effect for the candidate');

-- ---------------------------------------------------------------------------------------------
-- Server und Kontolöschung
-- ---------------------------------------------------------------------------------------------

select tests.as_service();
select throws_ok($$ update audit_log set text = 'rewritten' $$, '42501', null,
  'audit entries are never changed, not even by the server');

select tests.logout();
delete from auth.users where id = tests.uid('paula');
select results_eq($$
  select source::text, user_id, stripe_session_id, reason,
         (select count(distinct deleted_account_id) from plan_periods)
    from plan_periods where deleted_account_id is not null order by source
$$, $$ values ('manual', null::uuid, null::text, 'Komplett-Begleitung', 1::bigint),
              ('pass', null, null, null, 1) $$,
  'deleting an account keeps all its plan periods under one random id, without user id and Stripe session');

select * from finish();
rollback;
