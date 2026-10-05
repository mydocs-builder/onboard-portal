-- Tägliche Funktion: vorgemerkte Pässe starten, abgelaufene Zugänge beenden, Jobs archivieren,
-- fällige Mails ableiten und vermerken. Nur der Server darf sie aufrufen.
begin;
set search_path = public, extensions, tests;
select plan(43);
select tests.fixtures();

create temp table d as select portal_today() as today;
grant select on d to public;

-- Der letzte Lauf liegt drei Tage zurück: die Funktion muss nachholen.
insert into app_settings (key, value) values ('daily_last_run', (portal_today() - 3)::text)
on conflict (key) do update set value = excluded.value;

-- alice: Starter-Pass gestern zu Ende, Plus-Pass für heute vorgemerkt
update plan_access set plan = 'starter', source = 'pass', pass_length = 'month', valid_until = portal_today() - 1
 where user_id = tests.uid('alice');
insert into plan_periods (id, user_id, plan, source, pass_length, starts_on, ends_on, granted_by, created_at) values
  (tests.uid('period-alice-old'), tests.uid('alice'), 'starter', 'pass', 'month', portal_today() - 30, portal_today() - 1, 'stripe', now() - interval '30 days'),
  (tests.uid('period-alice-new'), tests.uid('alice'), 'plus', 'pass', 'month', portal_today(), portal_today() + 29, 'stripe', now() - interval '5 days');

-- zoe: vorgemerkter Pass hätte vorgestern starten sollen (Lauf ausgefallen)
select tests.create_user('zoe');
update plan_access set plan = 'starter', source = 'pass', pass_length = 'month', valid_until = portal_today() - 3
 where user_id = tests.uid('zoe');
insert into plan_periods (id, user_id, plan, source, pass_length, starts_on, ends_on, granted_by, created_at) values
  (tests.uid('period-zoe'), tests.uid('zoe'), 'starter', 'pass', 'month', portal_today() - 2, portal_today() + 27, 'stripe', now() - interval '10 days');

-- rosa: Plus nach Upgrade; der ersetzte Starter-Pass hätte heute begonnen
select tests.create_user('rosa');
update plan_access set plan = 'plus', source = 'pass', pass_length = 'month', valid_until = portal_today() + 50
 where user_id = tests.uid('rosa');
insert into plan_periods (id, user_id, plan, source, pass_length, starts_on, ends_on, granted_by, created_at) values
  (tests.uid('period-rosa-upgrade'), tests.uid('rosa'), 'plus', 'pass', 'month', portal_today() - 5, portal_today() + 50, 'stripe', now() - interval '5 days');
insert into plan_periods (user_id, plan, source, pass_length, starts_on, ends_on, granted_by, created_at, superseded_by) values
  (tests.uid('rosa'), 'starter', 'pass', 'quarter', portal_today(), portal_today() + 89, 'stripe', now() - interval '20 days', tests.uid('period-rosa-upgrade'));

-- ralf: nach Erstattung vom Admin auf Free gesetzt; die bezahlte Planphase läuft rechnerisch noch
select tests.create_user('ralf');
insert into plan_periods (user_id, plan, source, pass_length, starts_on, ends_on, granted_by, created_at) values
  (tests.uid('ralf'), 'plus', 'pass', 'month', portal_today() - 10, portal_today() + 19, 'stripe', now() - interval '10 days');

-- quinn: kostenlose Freischaltung endet in 3 Tagen, ein Pass ist schon vorgemerkt
select tests.create_user('quinn');
update plan_access set plan = 'plus', source = 'manual', manual_reason = 'Pilotphase', valid_until = portal_today() + 3
 where user_id = tests.uid('quinn');
insert into plan_periods (user_id, plan, source, pass_length, starts_on, ends_on, granted_by, created_at) values
  (tests.uid('quinn'), 'plus', 'pass', 'month', portal_today() + 4, portal_today() + 33, 'stripe', now() - interval '1 day');

-- rita: Starter läuft noch 20 Tage; ein für heute vorgemerkter Plus-Pass wurde vollständig erstattet
select tests.create_user('rita');
update plan_access set plan = 'starter', source = 'pass', pass_length = 'quarter', valid_until = portal_today() + 20
 where user_id = tests.uid('rita');
insert into plan_periods (id, user_id, plan, source, pass_length, starts_on, ends_on, amount_cents, granted_by, created_at, refunded_at, refunded_cents) values
  (tests.uid('period-rita-refunded'), tests.uid('rita'), 'plus', 'pass', 'month', portal_today(), portal_today() + 29, 2900, 'stripe', now() - interval '5 days', now() - interval '1 day', 2900);

-- pia: Pass gestern zu Ende; der für heute vorgemerkte Pass wurde nur teilweise erstattet
select tests.create_user('pia');
update plan_access set plan = 'starter', source = 'pass', pass_length = 'month', valid_until = portal_today() - 1
 where user_id = tests.uid('pia');
insert into plan_periods (id, user_id, plan, source, pass_length, starts_on, ends_on, amount_cents, granted_by, created_at, refunded_at, refunded_cents) values
  (tests.uid('period-pia-partial'), tests.uid('pia'), 'starter', 'pass', 'month', portal_today(), portal_today() + 29, 1400, 'stripe', now() - interval '5 days', now() - interval '1 day', 400);

-- stella: Starter-Pass endet in genau 7 Tagen; Erinnerungen an Bewerbungen abgeschaltet
update plan_access set valid_until = portal_today() + 7 where user_id = tests.uid('stella');
update profiles set reminders_enabled = false where user_id = tests.uid('stella');
-- bianca (gesperrt): Freischaltung endet in 5 Tagen
update plan_access set valid_until = portal_today() + 5 where user_id = tests.uid('bianca');

-- Jobs
insert into jobs (id, title, company_name, status, posted_on, expires_on) values
  (tests.uid('job-old'), 'Job old', 'X', 'published', portal_today() - 31, null),
  (tests.uid('job-expired'), 'Job expired', 'X', 'published', portal_today() - 5, portal_today() - 1),
  (tests.uid('job-last-day'), 'Job last day', 'X', 'published', portal_today() - 5, portal_today()),
  (tests.uid('job-extended'), 'Job extended', 'X', 'published', portal_today() - 31, portal_today() + 5),
  (tests.uid('job-day-30'), 'Job day 30', 'X', 'published', portal_today() - 30, null);

-- Bewerbungen
update applications set status = 'applied', next_type = 'follow_up', next_on = portal_today() where id = tests.uid('app-bob');
update applications set status = 'applied', next_type = 'follow_up', next_on = portal_today() where id = tests.uid('app-bianca');
insert into applications (id, user_id, company, position, status, next_type, next_on) values
  (tests.uid('app-bob-2'), tests.uid('bob'), 'Alpha Co', 'Engineer', 'planned', 'apply', portal_today()),
  (tests.uid('app-bob-closed'), tests.uid('bob'), 'Closed Co', null, 'rejected', 'follow_up', portal_today()),
  (tests.uid('app-bob-later'), tests.uid('bob'), 'Later Co', null, 'applied', 'follow_up', portal_today() + 2),
  (tests.uid('app-alice-interview'), tests.uid('alice'), 'Interview Co', 'Nurse', 'interview', 'interview', portal_today() + 1),
  (tests.uid('app-stella'), tests.uid('stella'), 'Stella Co', null, 'applied', 'follow_up', portal_today());

-- ---------------------------------------------------------------------------------------------
-- Wer darf die tägliche Funktion aufrufen? Nur der Server.
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select throws_ok($$ select daily_run() $$, '42501', null, 'a candidate cannot run the daily job');
select throws_ok($$ select * from daily_mails() $$, '42501', null, 'a candidate cannot read the mail list');
select throws_ok($$ select daily_mail_sent('pass_ended', tests.uid('alice')) $$, '42501', null, 'a candidate cannot mark mails as sent');
select tests.login('patrick', 'aal2');
select throws_ok($$ select daily_run() $$, '42501', null, 'an admin cannot run the daily job through the API');
select throws_ok($$ select * from daily_mails() $$, '42501', null, 'an admin cannot read the mail list, which names applications');
select tests.as_anon();
select throws_ok($$ select daily_run() $$, '42501', null, 'visitors cannot run the daily job');

-- ---------------------------------------------------------------------------------------------
-- Zustandsänderungen
-- ---------------------------------------------------------------------------------------------

select tests.as_service();
select is(daily_run(), jsonb_build_object('date', (select today from d), 'passes_started', 3, 'access_expired', 1, 'jobs_archived', 2, 'consents_deleted', 0),
  'the run starts three queued passes, ends one access and archives two jobs');

select results_eq(
  $$ select plan::text, source::text, pass_length::text, valid_until from plan_access where user_id = tests.uid('alice') $$,
  $$ select 'plus', 'pass', 'month', today + 29 from d $$, 'a queued pass starts on its first day');
select results_eq(
  $$ select plan::text, valid_until from plan_access where user_id = tests.uid('zoe') $$,
  $$ select 'starter', today + 27 from d $$, 'a pass whose start was missed is caught up, with its original end');
select results_eq(
  $$ select plan::text, valid_until from plan_access where user_id = tests.uid('rosa') $$,
  $$ select 'plus', today + 50 from d $$, 'a superseded pass never starts');
select results_eq(
  $$ select plan::text, valid_until from plan_access where user_id = tests.uid('rita') $$,
  $$ select 'starter', today + 20 from d $$, 'a fully refunded queued pass does not start');
select results_eq(
  $$ select plan::text, refunded_cents, superseded_by from plan_periods where id = tests.uid('period-rita-refunded') $$,
  $$ values ('plus', 2900, null::uuid) $$, 'it stays as a plan period marked as refunded');
select is((select valid_until from plan_access where user_id = tests.uid('pia')), (select today + 29 from d),
  'a partly refunded queued pass starts as usual');
select is((select plan::text from plan_access where user_id = tests.uid('ralf')), 'free',
  'an account set to Free after a refund is not granted again');
select results_eq(
  $$ select plan::text, source::text, pass_length::text, valid_until from plan_access where user_id = tests.uid('eve') $$,
  $$ select 'free', 'none', null::text, today - 1 from d $$, 'an expired access falls back to Free and keeps its end date');
select is((select plan::text from plan_access where user_id = tests.uid('stella')), 'starter',
  'a running pass is left alone');
select is((select count(*) from audit_log where actor = 'system' and user_id = tests.uid('eve') and text like 'Plus-Zugang am % abgelaufen, zurück auf Free'), 1::bigint,
  'the expiry is recorded in the audit log');
select is((select count(*) from audit_log where actor = 'system' and user_id = tests.uid('alice') and text like 'Vorgemerkter Plus-Zugang gestartet%'), 1::bigint,
  'the start is recorded in the audit log');

select results_eq(
  $$ select title, status::text from jobs where title like 'Job %' order by title $$,
  $$ values ('Job day 30', 'published'), ('Job expired', 'archived'), ('Job extended', 'published'),
            ('Job last day', 'published'), ('Job old', 'archived') $$,
  'jobs are archived the day after expires_on, or 30 days after posting without one');

select is(daily_run() - 'date', jsonb_build_object('passes_started', 0, 'access_expired', 0, 'jobs_archived', 0, 'consents_deleted', 0),
  'a second run on the same day changes nothing');
select is((select count(*) from audit_log where actor = 'system' and user_id = tests.uid('alice') and text like 'Vorgemerkter%'), 1::bigint,
  'and writes no second audit entry');

-- ---------------------------------------------------------------------------------------------
-- Fällige Mails
-- ---------------------------------------------------------------------------------------------

select results_eq(
  $$ select kind::text, split_part(email, '@', 1) from daily_mails() order by 1, 2 $$,
  $$ values ('interview_tomorrow', 'alice'), ('pass_ended', 'eve'), ('pass_ending', 'stella'),
            ('pass_started', 'alice'), ('pass_started', 'pia'), ('pass_started', 'zoe'), ('reminder_next_step', 'bob') $$,
  'exactly the due mails are listed');
select is_empty($$ select 1 from daily_mails() where user_id = tests.uid('rita') $$,
  'no mail announces a refunded pass as started');
select is_empty($$ select 1 from daily_mails() where user_id = tests.uid('bianca') $$,
  'a blocked account gets no mails');
select is_empty($$ select 1 from daily_mails() where user_id = tests.uid('quinn') $$,
  'no reminder about an ending grant when a pass is already queued');
select is_empty($$ select 1 from daily_mails() where user_id = tests.uid('stella') and kind = 'reminder_next_step' $$,
  'no application reminders when the candidate switched them off');
select is((select ref_id from daily_mails() where kind = 'pass_started' and user_id = tests.uid('alice')), tests.uid('period-alice-new'),
  'the pass mail refers to its plan period');
select is((select data from daily_mails() where kind = 'pass_ending'),
  jsonb_build_object('plan', 'starter', 'source', 'pass', 'valid_until', (select today + 7 from d), 'sales_enabled', false),
  'the ending reminder carries plan, source, end date and whether sales are on');
select is((select data -> 'applications' from daily_mails() where kind = 'reminder_next_step'),
  jsonb_build_array(
    jsonb_build_object('company', 'Alpha Co', 'position', 'Engineer', 'next_type', 'apply'),
    jsonb_build_object('company', 'Bob Co', 'position', null, 'next_type', 'follow_up')),
  'one collected mail per user: all steps due today, without closed or later ones');
select is((select data from daily_mails() where kind = 'pass_ended'),
  jsonb_build_object('ended_on', (select today - 1 from d), 'sales_enabled', false, 'plan', null, 'source', null),
  'the ended mail stays general when no plan period ended on that day');
select tests.logout();
insert into plan_periods (user_id, plan, source, starts_on, ends_on, reason, granted_by, created_at)
values (tests.uid('eve'), 'plus', 'pilot', portal_today() - 30, portal_today() - 1, 'Pilotphase', 'system', now() - interval '30 days');
select tests.as_service();
select is((select data - 'ended_on' - 'sales_enabled' from daily_mails() where kind = 'pass_ended'),
  jsonb_build_object('plan', 'plus', 'source', 'pilot'),
  'the ended mail names the plan and source of the period that ended');
select is((select data ->> 'company' from daily_mails() where kind = 'interview_tomorrow'), 'Interview Co',
  'the interview reminder names the company');

-- Verschickte Mails vermerken
select lives_ok($$ select daily_mail_sent(kind, user_id, ref_id) from daily_mails() $$, 'sent mails are recorded');
select is_empty($$ select 1 from daily_mails() $$, 'afterwards nothing is due any more');
select is((select count(*) from email_log where kind <> 'pass_ending' or user_id <> tests.uid('alice')), 7::bigint,
  'the email log holds one entry per mail');
select results_eq(
  $$ select reminded_for from applications where id in (tests.uid('app-bob'), tests.uid('app-bob-2')) $$,
  $$ select today from d union all select today from d $$, 'reminded applications remember the date they were reminded for');
select is((select reminded_for from applications where id = tests.uid('app-bob-later')), null,
  'applications due later are not marked');
select lives_ok($$ select daily_mail_sent('reminder_next_step', tests.uid('bob')) $$, 'recording the same mail twice does not fail');
select is((select count(*) from email_log where user_id = tests.uid('bob') and kind = 'reminder_next_step'), 1::bigint,
  'and does not create a second entry');

-- Ein neuer Termin an derselben Bewerbung wird wieder erinnert, aber erst am nächsten Tag ein zweites Mal verschickt
select tests.logout();
update applications set next_on = portal_today() + 1, next_type = 'interview', status = 'interview' where id = tests.uid('app-bob');
select tests.as_service();
select results_eq($$ select kind::text, ref_id from daily_mails() $$,
  $$ values ('interview_tomorrow', tests.uid('app-bob')) $$,
  'a step moved to tomorrow as an interview produces the interview reminder');

-- Der Kandidat sieht davon nur das Ergebnis
select tests.login('eve');
select is(effective_plan(tests.uid('eve'))::text, 'free', 'the expired candidate is on Free');
select is_empty($$ select 1 from email_log $$, 'and cannot read the email log');
select tests.login('alice');
select is(effective_plan(tests.uid('alice'))::text, 'plus', 'the candidate with the started pass has Plus');

select * from finish();
rollback;
