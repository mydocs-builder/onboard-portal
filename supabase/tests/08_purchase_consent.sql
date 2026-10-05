-- Zustimmung beim Kauf: ohne Zustimmung zur aktiven Fassung keine Bezahlseite; mit Zustimmung
-- werden Zeitpunkt, Fassung und Planphase festgehalten. Der Wortlaut ist unveränderlich.
begin;
set search_path = public, extensions, tests;
select plan(41);
select tests.fixtures();

update launch_settings set sales_enabled = true;
delete from prices;
insert into prices (plan, pass_length, amount_cents, stripe_price_id, active) values
  ('starter', 'month', 1400, 'price_test_starter_month', true),
  ('plus', 'month', 2900, 'price_test_plus_month', true),
  ('plus', 'quarter', 7500, 'price_test_plus_quarter', false);

update consent_texts set active = false;
insert into consent_texts (id, version, body, active) values
  (tests.uid('consent-old'), 'T-2026-01', 'Old wording.', false),
  (tests.uid('consent-new'), 'T-2026-02', 'I want access to start immediately.', true);

-- ---------------------------------------------------------------------------------------------
-- Kauf ohne Zustimmung scheitert
-- ---------------------------------------------------------------------------------------------

select tests.as_service();
select throws_ok($$ select begin_checkout(tests.uid('alice'), 'starter', 'month', null) $$, 'P0001', 'consent_required',
  'a purchase without consent fails');
select throws_ok($$ select begin_checkout(tests.uid('alice'), 'starter', 'month', '') $$, 'P0001', 'consent_required',
  'an empty consent version fails');
select throws_ok($$ select begin_checkout(tests.uid('alice'), 'starter', 'month', 'T-2026-01') $$, 'P0001', 'consent_required',
  'consent to an outdated wording fails');
select throws_ok($$ select begin_checkout(tests.uid('alice'), 'starter', 'month', 'made-up') $$, 'P0001', 'consent_required',
  'consent to an unknown version fails');
select is_empty($$ select 1 from purchase_consents $$, 'a failed purchase leaves no consent behind');

-- ---------------------------------------------------------------------------------------------
-- Kauf mit Zustimmung speichert Zeitpunkt und Version
-- ---------------------------------------------------------------------------------------------

select is(begin_checkout(tests.uid('alice'), 'starter', 'month', 'T-2026-02') - 'consent_id',
  jsonb_build_object('stripe_price_id', 'price_test_starter_month', 'stripe_customer_id', null),
  'a purchase with consent returns what the payment page needs');
select results_eq(
  $$ select c.user_id, t.version, c.consented_at, c.plan::text, c.pass_length::text, c.stripe_session_id, c.plan_period_id
       from purchase_consents c join consent_texts t on t.id = c.consent_text_id $$,
  $$ values (tests.uid('alice'), 'T-2026-02', now(), 'starter', 'month', null::text, null::uuid) $$,
  'the consent records user, version, time and pass');

select lives_ok($$ select attach_checkout_session((select id from purchase_consents), 'cs_consent_1') $$,
  'the Stripe session is attached to the consent');
select throws_ok($$ select attach_checkout_session((select id from purchase_consents), 'cs_other') $$, 'P0002', 'unknown_consent',
  'a consent takes one session only');
select throws_ok($$ select attach_checkout_session(tests.uid('no-consent'), 'cs_x') $$, 'P0002', 'unknown_consent',
  'a session cannot be attached to an unknown consent');

-- Bezug zur Planphase entsteht mit der Freischaltung
select lives_ok($$ select grant_pass(tests.uid('alice'), 'starter', 'month', 'cs_consent_1', 1400) $$, 'the payment grants the pass');
select is((select plan_period_id from purchase_consents where stripe_session_id = 'cs_consent_1'),
          (select id from plan_periods where stripe_session_id = 'cs_consent_1'),
  'the consent now refers to its plan period');
select results_eq(
  $$ select t.version, t.body from plan_periods p
       join purchase_consents c on c.plan_period_id = p.id join consent_texts t on t.id = c.consent_text_id
      where p.stripe_session_id = 'cs_consent_1' $$,
  $$ values ('T-2026-02', 'I want access to start immediately.') $$,
  'from a plan period the wording that applied can be looked up');

-- Abgebrochener Kauf: Zustimmung ohne Planphase
select lives_ok($$ select begin_checkout(tests.uid('alice'), 'plus', 'month', 'T-2026-02') $$, 'a second purchase records its own consent');
select is((select count(*) from purchase_consents where plan_period_id is null), 1::bigint,
  'a purchase that was not completed keeps its consent without a plan period');
select is((begin_checkout(tests.uid('paula'), 'plus', 'month', 'T-2026-02') ->> 'stripe_customer_id'), 'cus_test_paula',
  'a returning customer gets their Stripe customer id');

-- Die übrigen Ablehnungen
select throws_ok($$ select begin_checkout(tests.uid('alice'), 'plus', 'quarter', 'T-2026-02') $$, 'P0001', 'pass_not_available',
  'a pass without an active price is not for sale');
select throws_ok($$ select begin_checkout(tests.uid('bianca'), 'plus', 'month', 'T-2026-02') $$, 'P0001', 'account_blocked',
  'a blocked account cannot buy');
select tests.logout();
update launch_settings set sales_enabled = false;
select tests.as_service();
select throws_ok($$ select begin_checkout(tests.uid('alice'), 'plus', 'month', 'T-2026-02') $$, 'P0001', 'sales_disabled',
  'nothing is sold while sales are switched off');
select tests.logout();
update launch_settings set sales_enabled = true;
update consent_texts set active = false;
select tests.as_service();
select throws_ok($$ select begin_checkout(tests.uid('alice'), 'plus', 'month', 'T-2026-02') $$, 'P0001', 'consent_required',
  'without an active wording nothing can be bought');
select tests.logout();
update consent_texts set active = true where id = tests.uid('consent-new');

-- ---------------------------------------------------------------------------------------------
-- Der Wortlaut ist unveränderlich, für jede Rolle
-- ---------------------------------------------------------------------------------------------

select tests.as_service();
select throws_ok($$ update consent_texts set body = 'Rewritten.' where id = tests.uid('consent-new') $$, '42501', 'consent_text_is_permanent',
  'the server cannot rewrite a wording');
select throws_ok($$ update consent_texts set version = 'T-2099' where id = tests.uid('consent-old') $$, '42501', 'consent_text_is_permanent',
  'the server cannot relabel a version');
select throws_ok($$ delete from consent_texts where id = tests.uid('consent-old') $$, '42501', 'consent_text_is_permanent',
  'the server cannot delete a wording');
select throws_ok($$ insert into consent_texts (version, body, active) values ('T-2026-03', 'Second active.', true) $$, '23505', null,
  'only one version per language is active');

-- ---------------------------------------------------------------------------------------------
-- Zugriff
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select throws_ok($$ select begin_checkout(tests.uid('alice'), 'plus', 'month', 'T-2026-02') $$, '42501', null,
  'a candidate cannot call begin_checkout directly');
select throws_ok($$ select attach_checkout_session(tests.uid('x'), 'cs_x') $$, '42501', null,
  'a candidate cannot attach sessions');
select results_eq($$ select version from consent_texts $$, $$ values ('T-2026-02') $$,
  'a candidate reads the active wording only');
select is((select count(*) from purchase_consents), 2::bigint, 'a candidate reads their own consents');
select is_empty($$ select 1 from purchase_consents where user_id <> tests.uid('alice') $$, 'and no one else''s');
select throws_ok($$ insert into purchase_consents (user_id, consent_text_id, plan, pass_length)
                    values (tests.uid('alice'), tests.uid('consent-new'), 'plus', 'month') $$, '42501', null,
  'a candidate cannot fabricate a consent');
select throws_ok($$ update purchase_consents set consented_at = now() - interval '1 year' $$, '42501', null,
  'a candidate cannot change a consent');
select throws_ok($$ insert into consent_texts (version, body) values ('T-mine', 'My terms.') $$, '42501', null,
  'a candidate cannot add a wording');
select is_empty($$ update consent_texts set active = false returning 1 $$, 'a candidate cannot deactivate the wording');

select tests.login('bianca');
select is_empty($$ select 1 from consent_texts $$, 'a blocked account reads no wording');

select tests.as_anon();
select throws_ok($$ select 1 from consent_texts $$, '42501', null, 'visitors cannot read the wording');
select throws_ok($$ select 1 from purchase_consents $$, '42501', null, 'visitors cannot read consents');

select tests.login('patrick', 'aal1');
select is((select count(*) from purchase_consents), 0::bigint, 'an admin without second factor reads no consents');

select tests.login('patrick', 'aal2');
select is((select count(*) from purchase_consents), 3::bigint, 'an admin reads all consents');
select ok((select count(*) from consent_texts where version like 'T-%') = 2, 'an admin reads all versions, including inactive ones');
select lives_ok($$
  update consent_texts set active = false where id = tests.uid('consent-new');
  insert into consent_texts (version, body, active) values ('T-2026-03', 'New wording.', true);
$$, 'an admin replaces the wording by adding a new version');
select throws_ok($$ update consent_texts set body = 'Changed afterwards.' where id = tests.uid('consent-new') $$, '42501', null,
  'an admin cannot change an existing wording');

select * from finish();
rollback;
