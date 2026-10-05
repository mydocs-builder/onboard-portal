-- Vorschau für die Bestellübersicht: preview_pass() zeigt dem Kandidaten genau das, was grant_pass()
-- danach freischaltet, ändert selbst nichts und ist nur für das eigene Konto erreichbar.
begin;
set search_path = public, extensions, tests;
select plan(29);
select tests.fixtures();

delete from prices;
insert into prices (plan, pass_length, amount_cents) values
  ('starter', 'month', 1400), ('starter', 'quarter', 3600), ('plus', 'month', 2900), ('plus', 'quarter', 7500);

create temp table d as select portal_today() as today;
grant select on d to public;

-- Was der Kandidat vor dem Kauf sieht; verglichen wird mit dem Ergebnis von grant_pass().
create temp table previews (
  who text, starts_on date, ends_on date, upgrade boolean, credit_days integer,
  current_plan text, current_source text, amount_cents integer
);
grant select, insert on previews to public;

-- bob: Starter-Pass für 1 Monat, vor 3 Tagen gekauft (Beispiel aus dem Umfang)
update plan_access set plan = 'starter', source = 'pass', pass_length = 'month', valid_until = portal_today() + 26
 where user_id = tests.uid('bob');
-- eve: kostenlose Plus-Freischaltung, noch 10 Tage
update plan_access set plan = 'plus', source = 'manual', pass_length = null, manual_reason = 'Pilotphase',
       valid_until = portal_today() + 10 where user_id = tests.uid('eve');
-- stella: kostenlose Starter-Freischaltung, noch 10 Tage
update plan_access set plan = 'starter', source = 'manual', pass_length = null, manual_reason = 'Test',
       valid_until = portal_today() + 10 where user_id = tests.uid('stella');
-- quinn: Free, kauft unten Pässe auf Vorrat
select tests.create_user('quinn');

-- ---------------------------------------------------------------------------------------------
-- Wer darf was aufrufen?
-- ---------------------------------------------------------------------------------------------

select tests.as_anon();
select throws_ok($$ select * from preview_pass('plus', 'month') $$, '42501', null, 'visitors cannot preview a pass');

select tests.login('alice');
select throws_ok($$ select * from pass_terms(tests.uid('bob'), 'plus', 'month') $$, '42501', null,
  'a candidate cannot run the calculation for another account');
select throws_ok($$ select * from pass_terms(tests.uid('alice'), 'plus', 'month') $$, '42501', null,
  'a candidate reaches the calculation only through the preview');
select is_empty($$ select * from preview_pass('free', 'month') $$, 'there is no Free pass to preview');

select tests.login('patrick', 'aal2');
select throws_ok($$ select * from pass_terms(tests.uid('alice'), 'plus', 'month') $$, '42501', null,
  'an admin cannot run the calculation directly either');

select tests.login('bianca');
select is_empty($$ select * from preview_pass('plus', 'month') $$, 'a blocked account gets no preview');

-- ---------------------------------------------------------------------------------------------
-- Kauf ohne laufenden Zugang
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
insert into previews select 'alice-1', * from preview_pass('starter', 'month');
select results_eq(
  $$ select starts_on, ends_on, upgrade, credit_days, current_plan, current_source, amount_cents from previews where who = 'alice-1' $$,
  $$ select today, today + 29, false, 0, null::text, null::text, 1400 from d $$,
  'no access: the pass starts today, runs 30 days and shows the active price');

select tests.logout();
select is((select count(*) from plan_periods where user_id = tests.uid('alice')), 0::bigint, 'the preview records no plan period');
select is((select plan::text from plan_access where user_id = tests.uid('alice')), 'free', 'the preview does not change the access');

select tests.as_service();
select is(grant_pass(tests.uid('alice'), 'starter', 'month', 'cs_alice_1', 1400) - 'already_processed' - 'plan',
  (select jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'credit_days', credit_days) from previews where who = 'alice-1'),
  'no access: the purchase grants exactly what the preview showed');

-- ---------------------------------------------------------------------------------------------
-- Verlängerung: gleiche Stufe schließt an
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
insert into previews select 'alice-2', * from preview_pass('starter', 'quarter');
select results_eq(
  $$ select starts_on, ends_on, upgrade, current_plan, current_source, amount_cents from previews where who = 'alice-2' $$,
  $$ select today + 30, today + 119, false, 'starter', 'pass', 3600 from d $$,
  'renewal: the preview starts the day after the running pass ends');
select tests.as_service();
select is(grant_pass(tests.uid('alice'), 'starter', 'quarter', 'cs_alice_2', 3600) - 'already_processed' - 'plan',
  (select jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'credit_days', credit_days) from previews where who = 'alice-2'),
  'renewal: the purchase matches the preview');

-- Niedrigere Stufe während eines laufenden Passes
select tests.login('paula');
insert into previews select 'paula', * from preview_pass('starter', 'month');
select is((select upgrade from previews where who = 'paula'), false, 'a lower plan is not an upgrade');
select tests.as_service();
select is(grant_pass(tests.uid('paula'), 'starter', 'month', 'cs_paula_1', 1400) - 'already_processed' - 'plan',
  (select jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'credit_days', credit_days) from previews where who = 'paula'),
  'lower plan: the purchase matches the preview and starts after the running pass');

-- ---------------------------------------------------------------------------------------------
-- Upgrade mit Umrechnung: 27 Resttage Starter ergeben 13 Tage Plus
-- ---------------------------------------------------------------------------------------------

select tests.login('bob');
insert into previews select 'bob', * from preview_pass('plus', 'month');
select results_eq(
  $$ select starts_on, ends_on, upgrade, credit_days, current_plan, current_source from previews where who = 'bob' $$,
  $$ select today, today + 42, true, 13, 'starter', 'pass' from d $$,
  'upgrade: the preview shows the start today and the 13 converted days');
select tests.as_service();
select is(grant_pass(tests.uid('bob'), 'plus', 'month', 'cs_bob_1', 2900) - 'already_processed' - 'plan',
  (select jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'credit_days', credit_days) from previews where who = 'bob'),
  'upgrade: the purchase matches the preview');

-- ---------------------------------------------------------------------------------------------
-- Kauf während einer kostenlosen Freischaltung
-- ---------------------------------------------------------------------------------------------

select tests.login('eve');
insert into previews select 'eve', * from preview_pass('plus', 'month');
select results_eq(
  $$ select starts_on, upgrade, credit_days, current_plan, current_source from previews where who = 'eve' $$,
  $$ select today + 11, false, 0, 'plus', 'manual' from d $$,
  'free grant, same plan: the preview starts the day after the grant ends');
select tests.as_service();
select is(grant_pass(tests.uid('eve'), 'plus', 'month', 'cs_eve_1', 2900) - 'already_processed' - 'plan',
  (select jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'credit_days', credit_days) from previews where who = 'eve'),
  'free grant, same plan: the purchase matches the preview');

select tests.login('stella');
insert into previews select 'stella', * from preview_pass('plus', 'quarter');
select results_eq(
  $$ select starts_on, ends_on, upgrade, credit_days, current_source from previews where who = 'stella' $$,
  $$ select today, today + 89, true, 0, 'manual' from d $$,
  'free grant, upgrade: the preview starts today and converts nothing');
select tests.as_service();
select is(grant_pass(tests.uid('stella'), 'plus', 'quarter', 'cs_stella_1', 7500) - 'already_processed' - 'plan',
  (select jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'credit_days', credit_days) from previews where who = 'stella'),
  'free grant, upgrade: the purchase matches the preview');

-- ---------------------------------------------------------------------------------------------
-- Vorgemerkte und erstattete Pässe
-- quinn: Starter läuft, zwei weitere Starter-Pässe sind vorgemerkt, einer davon voll erstattet.
-- ---------------------------------------------------------------------------------------------

select grant_pass(tests.uid('quinn'), 'starter', 'month', 'cs_q1', 1400);
select grant_pass(tests.uid('quinn'), 'starter', 'month', 'cs_q2', 1400);
select grant_pass(tests.uid('quinn'), 'starter', 'month', 'cs_q3', 1400);
select record_refund('cs_q3', 1400, now());

select tests.login('quinn');
insert into previews select 'quinn-same', * from preview_pass('starter', 'month');
select is((select starts_on from previews where who = 'quinn-same'), (select today + 60 from d),
  'queued passes: the preview attaches behind the queued pass, not behind the refunded one');

insert into previews select 'quinn-up', * from preview_pass('plus', 'month');
-- 30 Tage laufend und 30 Tage vorgemerkt zu je 14 € / 30 Tage = 28 €; bei 29 € / 30 Tage sind das 28 Tage Plus.
select results_eq(
  $$ select starts_on, ends_on, upgrade, credit_days from previews where who = 'quinn-up' $$,
  $$ select today, today + 57, true, 28 from d $$,
  'queued passes: the preview converts the running and the queued pass, not the refunded one');
select is((select count(*) from plan_periods where user_id = tests.uid('quinn') and superseded_by is not null), 0::bigint,
  'the preview marks no queued pass as replaced');
select tests.as_service();
select is(grant_pass(tests.uid('quinn'), 'plus', 'month', 'cs_q4', 2900) - 'already_processed' - 'plan',
  (select jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'credit_days', credit_days) from previews where who = 'quinn-up'),
  'queued passes: the purchase matches the preview');

-- ---------------------------------------------------------------------------------------------
-- Preise
-- ---------------------------------------------------------------------------------------------

select tests.logout();
update prices set active = false where plan = 'plus' and pass_length = 'quarter';
select tests.login('alice');
select is_empty($$ select * from preview_pass('plus', 'quarter') $$, 'a pass without an active price has no preview');
select is((select amount_cents from preview_pass('plus', 'month')), 2900, 'the preview carries the active price of the pass');

-- Ein Kandidat sieht nur die eigene Vorschau: Die Funktion nimmt kein fremdes Konto entgegen.
select hasnt_function('public', 'preview_pass', array['uuid', 'plan_level', 'pass_length'], 'the preview takes no user id');
select is((select current_plan::text from preview_pass('plus', 'month')), 'starter', 'alice sees her own running Starter pass');
select tests.login('bob');
select is((select current_plan::text from preview_pass('plus', 'month')), 'plus', 'bob sees his own running Plus pass');

select * from finish();
rollback;
