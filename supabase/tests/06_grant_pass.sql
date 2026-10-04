-- Freischaltung eines bezahlten Passes: Kauf, Verlängerung, Upgrade mit Umrechnung,
-- Kauf während einer Freischaltung, doppelte Meldung, und wer die Funktion aufrufen darf.
begin;
set search_path = public, extensions, tests;
select plan(33);
select tests.fixtures();

delete from prices;
insert into prices (plan, pass_length, amount_cents) values
  ('starter', 'month', 1400), ('starter', 'quarter', 3600), ('plus', 'month', 2900), ('plus', 'quarter', 7500);

create temp table d as select portal_today() as today;
grant select on d to public;

-- bob: Starter-Pass für 1 Monat, vor 3 Tagen gekauft (Beispiel aus dem Umfang)
update plan_access set plan = 'starter', source = 'pass', pass_length = 'month', valid_until = portal_today() + 26
 where user_id = tests.uid('bob');
-- eve: kostenlose Plus-Freischaltung, noch 10 Tage
update plan_access set plan = 'plus', source = 'manual', pass_length = null, manual_reason = 'Pilotphase',
       valid_until = portal_today() + 10 where user_id = tests.uid('eve');
-- stella: kostenlose Starter-Freischaltung, noch 10 Tage
update plan_access set plan = 'starter', source = 'manual', pass_length = null, manual_reason = 'Test',
       valid_until = portal_today() + 10 where user_id = tests.uid('stella');
-- zoe: Pass gestern abgelaufen
select tests.create_user('zoe');
update plan_access set plan = 'plus', source = 'pass', pass_length = 'month', valid_until = portal_today() - 1
 where user_id = tests.uid('zoe');

-- ---------------------------------------------------------------------------------------------
-- Wer darf freischalten? Nur der Server.
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select throws_ok($$ select grant_pass(tests.uid('alice'), 'plus', 'quarter', 'cs_self', 0) $$, '42501', null,
  'a candidate cannot grant themselves a pass');
select tests.login('patrick', 'aal2');
select throws_ok($$ select grant_pass(tests.uid('alice'), 'plus', 'quarter', 'cs_admin', 0) $$, '42501', null,
  'an admin cannot enter a paid pass');
select tests.as_anon();
select throws_ok($$ select grant_pass(tests.uid('alice'), 'plus', 'quarter', 'cs_anon', 0) $$, '42501', null,
  'visitors cannot grant passes');

select tests.as_service();

-- ---------------------------------------------------------------------------------------------
-- Kauf ohne laufenden Zugang
-- ---------------------------------------------------------------------------------------------

select is(grant_pass(tests.uid('alice'), 'starter', 'month', 'cs_alice_1', 1400, null, 'cus_alice'),
  jsonb_build_object('already_processed', false, 'plan', 'starter', 'starts_on', (select today from d),
                     'ends_on', (select today + 29 from d), 'credit_days', 0),
  'purchase: a 1-month pass starts today and runs 30 days');
select results_eq(
  $$ select plan::text, source::text, pass_length::text, valid_until, stripe_customer_id from plan_access where user_id = tests.uid('alice') $$,
  $$ select 'starter', 'pass', 'month', today + 29, 'cus_alice' from d $$,
  'purchase: the access row carries plan, pass and end date');
select results_eq(
  $$ select source::text, amount_cents, granted_by, stripe_session_id from plan_periods where user_id = tests.uid('alice') $$,
  $$ values ('pass', 1400, 'stripe', 'cs_alice_1') $$, 'purchase: the plan period is recorded');
select is((select count(*) from audit_log where user_id = tests.uid('alice') and actor = 'stripe'), 1::bigint,
  'purchase: the audit log has an entry');

select is((grant_pass(tests.uid('zoe'), 'starter', 'quarter', 'cs_zoe_1', 3600) ->> 'starts_on')::date, (select today from d),
  'after an expired pass a new one starts today');
select is((select valid_until from plan_access where user_id = tests.uid('zoe')), (select today + 89 from d),
  'a 3-month pass runs 90 days');

-- ---------------------------------------------------------------------------------------------
-- Doppelte Meldung
-- ---------------------------------------------------------------------------------------------

select is(grant_pass(tests.uid('alice'), 'starter', 'month', 'cs_alice_1', 1400) ->> 'already_processed', 'true',
  'duplicate: the same Stripe session is recognised');
select is((select count(*) from plan_periods where user_id = tests.uid('alice')), 1::bigint,
  'duplicate: no second plan period');
select is((select valid_until from plan_access where user_id = tests.uid('alice')), (select today + 29 from d),
  'duplicate: the end date does not move');
select is((select count(*) from audit_log where user_id = tests.uid('alice') and actor = 'stripe'), 1::bigint,
  'duplicate: no second audit entry');

-- ---------------------------------------------------------------------------------------------
-- Verlängerung: gleiche Stufe schließt an das bisherige Ende an
-- ---------------------------------------------------------------------------------------------

select is(grant_pass(tests.uid('alice'), 'starter', 'month', 'cs_alice_2', 1400) - 'already_processed' - 'plan' - 'credit_days',
  jsonb_build_object('starts_on', (select today + 30 from d), 'ends_on', (select today + 59 from d)),
  'renewal: the new pass starts the day after the current one ends');
select is((select valid_until from plan_access where user_id = tests.uid('alice')), (select today + 29 from d),
  'renewal: the running pass stays as it is until the new one starts');
select is((grant_pass(tests.uid('alice'), 'starter', 'quarter', 'cs_alice_3', 3600) ->> 'starts_on')::date, (select today + 60 from d),
  'renewal: a further pass queues behind the one already booked');

select is((grant_pass(tests.uid('paula'), 'starter', 'month', 'cs_paula_2', 1400) ->> 'starts_on')::date, (select today + 31 from d),
  'a lower plan bought during a running pass starts after it');
select is((select plan::text from plan_access where user_id = tests.uid('paula')), 'plus',
  'and the higher plan stays until then');

-- ---------------------------------------------------------------------------------------------
-- Upgrade mit Umrechnung: Starter 1 Monat, nach 3 Tagen Plus 1 Monat.
-- 27 Resttage Starter (12,60 €) ergeben 13 Tage Plus, also Plus ab sofort für 43 Tage.
-- ---------------------------------------------------------------------------------------------

select is(grant_pass(tests.uid('bob'), 'plus', 'month', 'cs_bob_1', 2900),
  jsonb_build_object('already_processed', false, 'plan', 'plus', 'starts_on', (select today from d),
                     'ends_on', (select today + 42 from d), 'credit_days', 13),
  'upgrade: 27 remaining Starter days convert into 13 Plus days, 43 days in total');
select results_eq(
  $$ select plan::text, source::text, valid_until from plan_access where user_id = tests.uid('bob') $$,
  $$ select 'plus', 'pass', today + 42 from d $$, 'upgrade: the higher plan applies at once');
select is((select credit_days from plan_periods where stripe_session_id = 'cs_bob_1'), 13,
  'upgrade: the converted days are recorded with the plan period');
select ok((select text like '%13 Tage aus dem bisherigen Pass umgerechnet%' from audit_log
            where user_id = tests.uid('bob') and actor = 'stripe'), 'upgrade: the audit log mentions the conversion');

-- ---------------------------------------------------------------------------------------------
-- Kauf während einer kostenlosen Freischaltung
-- ---------------------------------------------------------------------------------------------

select is(grant_pass(tests.uid('eve'), 'plus', 'month', 'cs_eve_1', 2900, 'WELCOME10') - 'already_processed' - 'plan',
  jsonb_build_object('starts_on', (select today + 11 from d), 'ends_on', (select today + 40 from d), 'credit_days', 0),
  'during a free grant: a pass of the same plan starts the day after the grant ends');
select results_eq(
  $$ select plan::text, source::text, valid_until, manual_reason from plan_access where user_id = tests.uid('eve') $$,
  $$ select 'plus', 'manual', today + 10, 'Pilotphase' from d $$,
  'during a free grant: the grant keeps running unchanged');
select is((select promo_code from plan_periods where stripe_session_id = 'cs_eve_1'), 'WELCOME10',
  'the promotion code is stored with the plan period');

select is(grant_pass(tests.uid('stella'), 'plus', 'quarter', 'cs_stella_1', 7500) - 'already_processed' - 'plan',
  jsonb_build_object('starts_on', (select today from d), 'ends_on', (select today + 89 from d), 'credit_days', 0),
  'upgrade from a free grant: applies at once, free days are not converted');
select results_eq(
  $$ select plan::text, source::text, manual_reason from plan_access where user_id = tests.uid('stella') $$,
  $$ values ('plus', 'pass', null::text) $$, 'upgrade from a free grant: the access becomes a paid pass');

-- ---------------------------------------------------------------------------------------------
-- Fehlerfälle
-- ---------------------------------------------------------------------------------------------

select throws_ok($$ select grant_pass(tests.uid('nobody'), 'plus', 'month', 'cs_nobody', 2900) $$, 'P0002', 'unknown_user',
  'an unknown user is rejected');
select throws_ok($$ select grant_pass(tests.uid('alice'), 'free', 'month', 'cs_free', 0) $$, '22023', 'invalid_pass',
  'there is no Free pass');
select throws_ok($$ select grant_pass(tests.uid('alice'), 'plus', 'month', null, 2900) $$, '22023', 'invalid_pass',
  'a grant needs its Stripe session');

-- Der Kandidat sieht das Ergebnis, kann es aber nicht verändern.
select tests.login('alice');
select is((select count(*) from plan_periods), 3::bigint, 'the candidate sees their purchases, including queued passes');
select is(effective_plan(tests.uid('alice'))::text, 'starter', 'and has the purchased plan');
select is_empty($$ update plan_access set valid_until = '2099-12-31' returning 1 $$, 'but still cannot extend it');

select * from finish();
rollback;
