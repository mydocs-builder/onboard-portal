-- Konten: Trigger für profiles und Startphase, Zugriff auf profiles, gesperrte Konten, Admin.
begin;
set search_path = public, extensions, tests;
select plan(41);
select tests.fixtures();

-- ---------------------------------------------------------------------------------------------
-- Registrierung
-- ---------------------------------------------------------------------------------------------

select tests.create_user('mallory',
  '{"role":"admin","invited_by_admin":true,"blocked_at":null,"field":"it","registration_source":"navigator"}');

select is((select role::text from profiles where user_id = tests.uid('mallory')), 'candidate',
  'signup metadata cannot make an account admin');
select is((select invited_by_admin from profiles where user_id = tests.uid('mallory')), false,
  'signup metadata cannot fake an admin invitation');
select is((select field::text || '/' || registration_source from profiles where user_id = tests.uid('mallory')),
  'it/navigator', 'field and registration source come from the registration');
select results_eq(
  $$ select plan::text, source::text, valid_until from plan_access where user_id = tests.uid('mallory') $$,
  $$ values ('free', 'none', null::date) $$,
  'a new account starts on Free outside the launch phase');

select throws_ok($$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  values (tests.uid('noname'), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'noname@test.local', '{"last_name":"Only"}')
$$, '23502', null, 'an account without first name is rejected');

-- Startphase
update launch_settings set new_account_grant = 'plus', grant_until = portal_today();
select tests.create_user('pilot');
select results_eq(
  $$ select plan::text, source::text, manual_reason, valid_until from plan_access where user_id = tests.uid('pilot') $$,
  $$ values ('plus', 'manual', 'Pilotphase', portal_today()) $$,
  'launch phase: a new account gets Plus until the cutoff date, cutoff day included');
select results_eq(
  $$ select plan::text, source::text, granted_by, ends_on from plan_periods where user_id = tests.uid('pilot') $$,
  $$ values ('plus', 'pilot', 'system', portal_today()) $$,
  'launch phase: the grant is recorded as a plan period with source pilot');
select is((select count(*) from audit_log where user_id = tests.uid('pilot') and actor = 'system'), 1::bigint,
  'launch phase: the grant appears in the audit log');

update launch_settings set grant_until = portal_today() - 1;
select tests.create_user('late');
select is((select plan::text from plan_access where user_id = tests.uid('late')), 'free',
  'after the cutoff date new accounts start on Free');
select is_empty($$ select 1 from plan_periods where user_id = tests.uid('late') $$,
  'after the cutoff date no plan period is created');

-- Einladungscode
update launch_settings set registration_mode = 'invite', invite_code = 'OPEN-SESAME';
select throws_ok($$ select tests.create_user('nocode') $$, 'P0001', 'invite_code_invalid',
  'invite mode: registration without code is rejected');
select throws_ok($$ select tests.create_user('wrongcode', '{"invite_code":"guess"}') $$, 'P0001', 'invite_code_invalid',
  'invite mode: registration with a wrong code is rejected');
select throws_ok($$ select tests.create_user('faker', '{"invited_by_admin":true}') $$, 'P0001', 'invite_code_invalid',
  'invite mode: claiming an admin invitation in the signup data does not help');
select lives_ok($$ select tests.create_user('rightcode', '{"invite_code":"OPEN-SESAME"}') $$,
  'invite mode: registration with the right code works');
select lives_ok($$ select tests.create_user('invitee', '{}', '{"invited_by_admin":true}') $$,
  'invite mode: accounts created by the admin need no code');
select results_eq(
  $$ select invited_by_admin, registration_source from profiles where user_id = tests.uid('invitee') $$,
  $$ values (true, 'admin') $$, 'admin-created accounts are marked as invited');
update launch_settings set invite_code = null;
select throws_ok($$ select tests.create_user('emptycode', '{"invite_code":""}') $$, 'P0001', 'invite_code_invalid',
  'invite mode without a configured code lets nobody in');

-- ---------------------------------------------------------------------------------------------
-- Kandidat
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');

select results_eq($$ select user_id from profiles $$, $$ values (tests.uid('alice')) $$,
  'a candidate reads only their own profile');
select lives_ok($$
  update profiles set first_name = 'Alicia', last_name = 'Tester', field = 'engineering',
         language = 'de', reminders_enabled = false where user_id = tests.uid('alice')
$$, 'a candidate changes name, field, language and reminders');
select is((select first_name from profiles), 'Alicia', 'the change is stored');

select throws_ok($$ update profiles set role = 'admin' where user_id = tests.uid('alice') $$, '42501', null,
  'a candidate cannot make themselves admin');
select throws_ok($$ update profiles set blocked_at = now() where user_id = tests.uid('alice') $$, '42501', null,
  'a candidate cannot write blocked_at');
select throws_ok($$ update profiles set first_login_at = now() where user_id = tests.uid('alice') $$, '42501', null,
  'a candidate cannot write first_login_at directly');
select throws_ok($$ update profiles set invited_by_admin = true where user_id = tests.uid('alice') $$, '42501', null,
  'a candidate cannot write invited_by_admin');
select throws_ok($$ update profiles set user_id = tests.uid('bob') where user_id = tests.uid('alice') $$, '42501', null,
  'a candidate cannot take over another profile');
select is_empty($$ update profiles set first_name = 'Hacked' where user_id = tests.uid('bob') returning 1 $$,
  'a candidate cannot change another profile');
select throws_ok($$ insert into profiles (user_id, first_name, last_name) values (gen_random_uuid(), 'X', 'Y') $$,
  '42501', null, 'a candidate cannot create profiles');
select throws_ok($$ delete from profiles where user_id = tests.uid('bob') $$, '42501', null,
  'a candidate cannot delete profiles');
select throws_ok($$ update profiles set first_name = ' ' where user_id = tests.uid('alice') $$, '23514', null,
  'the first name cannot be emptied');

select mark_first_login();
select isnt((select first_login_at from profiles), null, 'mark_first_login() records the first login');
create temp table first_login as select first_login_at from profiles;
grant select on first_login to public;
select mark_first_login();
select is((select first_login_at from profiles), (select first_login_at from first_login),
  'mark_first_login() does not overwrite the first login');

-- ---------------------------------------------------------------------------------------------
-- Gesperrtes Konto
-- ---------------------------------------------------------------------------------------------

select tests.login('bianca');
select is_empty($$ select 1 from profiles $$, 'a blocked account cannot read its own profile');
select is_empty($$ update profiles set blocked_at = null, first_name = 'Free' where user_id = tests.uid('bianca') returning 1 $$,
  'a blocked account cannot lift its own block');
select is(is_active_user(), false, 'a blocked account does not count as active');

-- ---------------------------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------------------------

select tests.login('patrick', 'aal1');
select results_eq($$ select user_id from profiles $$, $$ values (tests.uid('patrick')) $$,
  'an admin without second factor reads only their own profile');
select is_empty($$ update profiles set blocked_at = now() where user_id = tests.uid('bob') returning 1 $$,
  'an admin without second factor cannot block accounts');

select tests.login('patrick', 'aal2');
select ok((select count(*) from profiles) >= 7, 'an admin with second factor reads all profiles');
select lives_ok($$ update profiles set blocked_at = now() where user_id = tests.uid('bob') $$,
  'an admin blocks an account');
select throws_ok($$ update profiles set first_name = 'Renamed' where user_id = tests.uid('bob') $$, '42501', null,
  'an admin cannot change another user''s name');
select throws_ok($$ update profiles set role = 'admin' where user_id = tests.uid('bob') $$, '42501', null,
  'an admin cannot grant the admin role through the API');

select tests.login('bob');
select is_empty($$ select 1 from profiles $$, 'the freshly blocked account loses read access at once');

select * from finish();
rollback;
