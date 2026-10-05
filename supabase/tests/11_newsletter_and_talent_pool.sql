-- Freiwillige Einwilligungen: Newsletter mit Double-Opt-in und Interesse am Talentpool.
-- Wortlaute sind versioniert und unveränderlich, jede Einwilligung und jeder Widerruf wird
-- festgehalten, und der Kandidat ändert den Stand nur über die dafür vorgesehenen Funktionen.
begin;
set search_path = public, extensions, tests;
select plan(58);
select tests.fixtures();

-- Lokal bringen die Seed-Daten schon Fassungen mit; die Tests arbeiten mit ihren eigenen.
update marketing_consent_texts set active = false;

insert into marketing_consent_texts (id, kind, version, body, active) values
  (tests.uid('nl-v1'), 'newsletter', 'v1', 'Send me the newsletter.', true),
  (tests.uid('nl-old'), 'newsletter', 'v0', 'Old newsletter text.', false),
  (tests.uid('tp-v1'), 'talent_pool', 'v1', 'Let me know when the talent pool opens.', true);

-- Der Server liest den ausgestellten Link in den Tests aus dieser Tabelle.
create temp table issued (who text, token text);
grant select, insert on issued to public;

-- ---------------------------------------------------------------------------------------------
-- Wortlaute: versioniert, unveränderlich, je Art eine aktive Fassung
-- ---------------------------------------------------------------------------------------------

select throws_ok($$ update marketing_consent_texts set body = 'changed' where id = tests.uid('nl-v1') $$, '42501', null,
  'a consent text cannot be changed, not even by the database owner');
select throws_ok($$ delete from marketing_consent_texts where id = tests.uid('nl-old') $$, '42501', null,
  'a consent text cannot be deleted');
select throws_ok($$ insert into marketing_consent_texts (kind, version, body, active) values ('newsletter', 'v2', 'Second active.', true) $$,
  '23505', null, 'only one version per kind can be active');
select lives_ok($$ insert into marketing_consent_texts (kind, version, body) values ('newsletter', 'v2', 'Next version.') $$,
  'a new wording is a new version');

select tests.login('alice');
select results_eq($$ select kind::text, version from marketing_consent_texts order by kind $$,
  $$ values ('newsletter', 'v1'), ('talent_pool', 'v1') $$, 'a candidate reads only the active versions');
select throws_ok($$ insert into marketing_consent_texts (kind, version, body) values ('newsletter', 'x', 'Mine.') $$, '42501', null,
  'a candidate cannot add consent texts');
select tests.login('bianca');
select is_empty($$ select 1 from marketing_consent_texts $$, 'a blocked account reads no consent texts');
select tests.login('patrick', 'aal2');
select is((select count(*) from marketing_consent_texts where version in ('v0', 'v1', 'v2')), 4::bigint, 'the admin reads every version');
select lives_ok($$ insert into marketing_consent_texts (kind, version, body) values ('talent_pool', 'v2', 'Reviewed text.') $$,
  'the admin adds a new version');

select tests.as_anon();
select results_eq(
  $$ select c ->> 'kind', c ->> 'version', c ->> 'body' from registration_info() r, jsonb_array_elements(r.optional_consents) c order by 1 $$,
  $$ values ('newsletter', 'v1', 'Send me the newsletter.'), ('talent_pool', 'v1', 'Let me know when the talent pool opens.') $$,
  'the registration page gets the active optional consent texts');

-- ---------------------------------------------------------------------------------------------
-- Registrierung: beide Häkchen sind freiwillig
-- ---------------------------------------------------------------------------------------------

select tests.logout();
select tests.create_user('nora', '{"newsletter_consent": "v1", "talent_pool_consent": "v1"}');
select tests.create_user('otto');
select tests.create_user('olga', '{"newsletter_consent": "v0", "talent_pool_consent": "made-up"}');

select results_eq($$ select newsletter_status::text, talent_pool from profiles where user_id = tests.uid('nora') $$,
  $$ values ('pending', true) $$, 'registration with both boxes: newsletter pending, talent pool noted');
select results_eq(
  $$ select kind::text, action::text, consent_text_id, source from marketing_consents where user_id = tests.uid('nora') order by kind $$,
  $$ values ('newsletter', 'given', tests.uid('nl-v1'), 'registration'), ('talent_pool', 'given', tests.uid('tp-v1'), 'registration') $$,
  'each box is recorded with kind, text version and source');
select ok((select bool_and(created_at is not null) from marketing_consents where user_id = tests.uid('nora')), 'and with its time');
select results_eq($$ select newsletter_status::text, talent_pool from profiles where user_id = tests.uid('otto') $$,
  $$ values ('none', false) $$, 'registration without the boxes: nothing is preselected');
select is_empty($$ select 1 from marketing_consents where user_id = tests.uid('otto') $$, 'and nothing is recorded');
select results_eq($$ select newsletter_status::text, talent_pool from profiles where user_id = tests.uid('olga') $$,
  $$ values ('none', false) $$, 'a box for an outdated or unknown text version does not count, the registration still succeeds');
select is_empty($$ select 1 from marketing_consents where user_id = tests.uid('olga') $$, 'no consent is recorded for it');

-- ---------------------------------------------------------------------------------------------
-- Der Kandidat ändert den Stand nur über die Funktionen
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select throws_ok($$ update profiles set newsletter_status = 'active' where user_id = tests.uid('alice') $$, '42501', null,
  'a candidate cannot set the newsletter status directly');
select throws_ok($$ update profiles set talent_pool = true where user_id = tests.uid('alice') $$, '42501', null,
  'nor the talent pool flag');
select throws_ok($$ insert into marketing_consents (user_id, kind, action, source) values (tests.uid('alice'), 'newsletter', 'confirmed', 'account') $$,
  '42501', null, 'a candidate cannot write the consent record');
select throws_ok($$ select confirm_newsletter('anything') $$, '42501', null, 'a candidate cannot confirm a subscription without the link');
select throws_ok($$ select newsletter_issue_token(tests.uid('alice'), false) $$, '42501', null, 'a candidate cannot issue a confirmation link');
select throws_ok($$ select 1 from newsletter_confirmations $$, '42501', null, 'open confirmation links are not readable');

-- ---------------------------------------------------------------------------------------------
-- Newsletter: bestellen, bestätigen, abbestellen
-- ---------------------------------------------------------------------------------------------

select throws_ok($$ select set_newsletter(true, 'v0') $$, 'P0001', 'consent_required', 'subscribing needs the active text version');
select throws_ok($$ select set_newsletter(true) $$, 'P0001', 'consent_required', 'and cannot be done without naming the version');
select is(set_newsletter(true, 'v1')::text, 'pending', 'subscribing sets the status to pending');
select is(set_newsletter(true, 'v1')::text, 'pending', 'subscribing twice changes nothing');
select is((select count(*) from marketing_consents where user_id = tests.uid('alice') and kind = 'newsletter'), 1::bigint,
  'and records the consent once');

select tests.as_service();
insert into issued select 'alice', newsletter_issue_token(tests.uid('alice')) ->> 'token';
select ok((select length(token) = 64 from issued where who = 'alice'), 'the server issues a confirmation link for a pending subscription');
select is(newsletter_issue_token(tests.uid('alice')), null, 'the first mail goes out once; a second automatic send issues nothing');
select throws_ok($$ select newsletter_issue_token(tests.uid('alice'), true) $$, 'P0001', 'too_soon', 'sending again is refused within a minute');
select is(newsletter_issue_token(tests.uid('bob')), null, 'no link without a pending subscription');
select tests.logout();
select is_empty($$ select 1 from newsletter_confirmations c join issued i on i.token = c.token_hash $$,
  'only the hash of the link is stored');

select tests.as_service();
select is(confirm_newsletter('wrong-token'), null, 'an unknown link confirms nothing');
select is((select newsletter_status::text from profiles where user_id = tests.uid('alice')), 'pending', 'pending is not yet a consent');
select is(confirm_newsletter((select token from issued where who = 'alice'))::text, 'active', 'the link from the mail activates the subscription');
select is(confirm_newsletter((select token from issued where who = 'alice')), null, 'the link works only once');
select tests.logout();
select results_eq(
  $$ select action::text, consent_text_id, source from marketing_consents where user_id = tests.uid('alice') and kind = 'newsletter' order by created_at, marketing_consents.action $$,
  $$ values ('given', tests.uid('nl-v1'), 'account'), ('confirmed', tests.uid('nl-v1'), 'email_link') $$,
  'consent and confirmation are both on record, with the text version');

select tests.login('alice');
select is(set_newsletter(false)::text, 'none', 'unsubscribing takes effect at once, without confirmation');
select results_eq(
  $$ select action::text, consent_text_id from marketing_consents where user_id = tests.uid('alice') and kind = 'newsletter' and action = 'withdrawn' $$,
  $$ values ('withdrawn', tests.uid('nl-v1')) $$, 'the withdrawal is recorded with the version it withdraws');
select is(set_newsletter(false)::text, 'none', 'unsubscribing twice changes nothing');
select is((select count(*) from marketing_consents where user_id = tests.uid('alice') and action = 'withdrawn'), 1::bigint,
  'and is recorded once');
select throws_ok($$ update marketing_consents set action = 'given' where user_id = tests.uid('alice') $$, '42501', null,
  'the record cannot be rewritten');
select results_eq($$ select count(*) from marketing_consents $$, $$ values (3::bigint) $$, 'a candidate sees only the own record');

-- Erneut senden: nach einer Minute, mit neuem Link, höchstens so oft wie eingestellt.
select is(set_newsletter(true, 'v1')::text, 'pending', 'subscribing again starts a new confirmation');
select tests.as_service();
insert into issued select 'alice-2', newsletter_issue_token(tests.uid('alice')) ->> 'token';
select tests.logout();
update newsletter_confirmations set sent_at = now() - interval '2 minutes' where user_id = tests.uid('alice');
select tests.as_service();
insert into issued select 'alice-3', newsletter_issue_token(tests.uid('alice'), true) ->> 'token';
select is(confirm_newsletter((select token from issued where who = 'alice-2')), null, 'sending again replaces the earlier link');
select tests.logout();
update newsletter_confirmations set sends = 5, sent_at = now() - interval '2 minutes' where user_id = tests.uid('alice');
select tests.as_service();
select throws_ok($$ select newsletter_issue_token(tests.uid('alice'), true) $$, 'P0001', 'send_limit_reached',
  'the confirmation mail goes out at most five times');

-- Abbestellen vor der Bestätigung macht den Link wertlos.
select tests.login('alice');
select set_newsletter(false);
select tests.as_service();
select is(confirm_newsletter((select token from issued where who = 'alice-3')), null, 'after unsubscribing, the pending link no longer confirms');
select is((select newsletter_status::text from profiles where user_id = tests.uid('alice')), 'none', 'the status stays none');

-- ---------------------------------------------------------------------------------------------
-- Talentpool: nur das Häkchen
-- ---------------------------------------------------------------------------------------------

select tests.login('bob');
select throws_ok($$ select set_talent_pool(true, 'nope') $$, 'P0001', 'consent_required', 'the talent pool box needs the active text version');
select is(set_talent_pool(true, 'v1'), true, 'a candidate registers interest in the talent pool');
select is(set_talent_pool(false), false, 'and takes it back');
select results_eq(
  $$ select action::text, consent_text_id from marketing_consents where user_id = tests.uid('bob') order by created_at, action $$,
  $$ values ('given', tests.uid('tp-v1')), ('withdrawn', tests.uid('tp-v1')) $$, 'both steps are recorded with the text version');

select tests.login('bianca');
select throws_ok($$ select set_newsletter(true, 'v1') $$, '42501', null, 'a blocked account cannot subscribe');

-- ---------------------------------------------------------------------------------------------
-- Admin und Kontolöschung
-- ---------------------------------------------------------------------------------------------

select tests.login('patrick', 'aal2');
select ok((select count(*) from marketing_consents) >= 7, 'the admin reads the consent record as proof');
select throws_ok($$ select 1 from newsletter_confirmations $$, '42501', null, 'but not the open confirmation links');
select tests.login('patrick');
select is_empty($$ select 1 from marketing_consents where user_id <> tests.uid('patrick') $$,
  'without the second factor an admin account sees no other record');

select tests.logout();
delete from auth.users where id = tests.uid('nora');
select is_empty($$ select 1 from marketing_consents where user_id = tests.uid('nora') $$,
  'deleting the account removes its consent record');

select * from finish();
rollback;
