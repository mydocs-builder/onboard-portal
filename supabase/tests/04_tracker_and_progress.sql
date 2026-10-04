-- Arbeitsdaten des Kandidaten: Bewerbungen, Verlauf, Checklisten-Fortschritt, erledigte Aufgaben.
-- Nur die eigenen; der Admin sieht nichts davon. Free-Grenze im Tracker.
begin;
set search_path = public, extensions, tests;
select plan(47);
select tests.fixtures();

-- ---------------------------------------------------------------------------------------------
-- Bewerbungen und Verlauf
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select is_empty($$ select 1 from applications $$, 'a candidate cannot read other users'' applications');
select is_empty($$ select 1 from application_events $$, 'a candidate cannot read other users'' application history');

select lives_ok($$ insert into applications (id, company, position) values (tests.uid('app-alice'), 'Alice Co', 'Engineer') $$,
  'a candidate adds an application');
select is((select user_id from applications), tests.uid('alice'), 'the application belongs to the candidate');
select lives_ok($$ insert into application_events (application_id, text) values (tests.uid('app-alice'), 'Applied via StepStone') $$,
  'a candidate adds a history entry');
select lives_ok($$ update applications set status = 'applied', next_type = 'follow_up', next_on = portal_today() + 7 $$,
  'a candidate updates their application');

select throws_ok($$ insert into applications (user_id, company) values (tests.uid('bob'), 'Planted') $$, '42501', null,
  'a candidate cannot add an application for someone else');
select throws_ok($$ update applications set user_id = tests.uid('bob') where id = tests.uid('app-alice') $$, '42501', null,
  'a candidate cannot hand an application to someone else');
select is_empty($$ update applications set notes = 'read by alice' where id = tests.uid('app-bob') returning 1 $$,
  'a candidate cannot change someone else''s application');
select is_empty($$ delete from applications where id = tests.uid('app-bob') returning 1 $$,
  'a candidate cannot delete someone else''s application');
select throws_ok($$ insert into application_events (application_id, text) values (tests.uid('app-bob'), 'Planted') $$,
  '23503', null, 'a candidate cannot attach history to someone else''s application');
select throws_ok($$ insert into application_events (application_id, user_id, text) values (tests.uid('app-bob'), tests.uid('bob'), 'Planted') $$,
  '42501', null, 'not even by posing as the owner');
select throws_ok($$ insert into applications (company) values (' ') $$, '23514', null, 'company is required');

-- Free-Grenze: alice hat eine Bewerbung
select lives_ok($$ insert into applications (company) select 'Co ' || g from generate_series(2, 10) g $$,
  'Free: ten applications are possible');
select throws_ok($$ insert into applications (company) values ('Co 11') $$, 'P0001', 'free_application_limit_reached',
  'Free: the eleventh application is rejected by the database');
select lives_ok($$ update applications set notes = 'still editable' $$, 'Free at the limit: existing applications stay editable');
select lives_ok($$ delete from applications where company = 'Co 10' $$, 'Free at the limit: deleting works');
select lives_ok($$ insert into applications (company) values ('Co 10 again') $$, 'Free: after deleting one, a new one fits again');

-- Die Grenze ist eine Einstellung
select tests.logout();
update app_settings set value = '12' where key = 'free_application_limit';
select tests.login('alice');
select lives_ok($$ insert into applications (company) values ('Co 11') $$, 'the limit follows app_settings, not the code');

-- Starter: unbegrenzt; nach Rückfall auf Free bleibt alles sichtbar und bearbeitbar
select tests.login('stella');
select lives_ok($$ insert into applications (company) select 'S ' || g from generate_series(1, 15) g $$,
  'Starter: more applications than the Free limit');
select tests.logout();
update plan_access set valid_until = portal_today() - 1 where user_id = tests.uid('stella');
select tests.login('stella');
select is((select count(*) from applications), 15::bigint, 'after falling back to Free all applications stay visible');
select lives_ok($$ update applications set status = 'applied' $$, 'and editable');
select throws_ok($$ insert into applications (company) values ('S 16') $$, 'P0001', 'free_application_limit_reached',
  'but new ones need a pass');

-- ---------------------------------------------------------------------------------------------
-- Checklisten-Fortschritt und erledigte Aufgaben
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select is_empty($$ select 1 from checklist_progress $$, 'a candidate cannot read other users'' progress');
select is_empty($$ select 1 from dismissed_tasks $$, 'a candidate cannot read other users'' dismissed tasks');
select lives_ok($$ insert into checklist_progress (item_id) values (tests.uid('item-free')) $$, 'a candidate ticks an item');
select throws_ok($$ insert into checklist_progress (item_id) values (tests.uid('item-free')) $$, '23505', null,
  'an item is ticked once');
select throws_ok($$ insert into checklist_progress (item_id) values (tests.uid('item-starter')) $$, '42501', null,
  'Free cannot tick an item above its plan');
select throws_ok($$ insert into checklist_progress (item_id) values (tests.uid('item-inactive')) $$, '42501', null,
  'an inactive item cannot be ticked');
select throws_ok($$ insert into checklist_progress (user_id, item_id) values (tests.uid('bob'), tests.uid('item-free')) $$,
  '42501', null, 'a candidate cannot tick items for someone else');
select throws_ok($$ update checklist_progress set done_at = now() - interval '1 year' $$, '42501', null,
  'progress entries cannot be rewritten');
select is_empty($$ delete from checklist_progress where user_id = tests.uid('bob') returning 1 $$,
  'a candidate cannot untick someone else''s items');
select isnt_empty($$ delete from checklist_progress where item_id = tests.uid('item-free') returning 1 $$,
  'a candidate unticks their own item');

select lives_ok($$ insert into dismissed_tasks (task_key) values ('cv') $$, 'a candidate marks a task as done');
select throws_ok($$ insert into dismissed_tasks (user_id, task_key) values (tests.uid('bob'), 'linkedin') $$, '42501', null,
  'a candidate cannot dismiss tasks for someone else');
select is_empty($$ delete from dismissed_tasks where user_id = tests.uid('bob') returning 1 $$,
  'a candidate cannot reopen someone else''s tasks');
select isnt_empty($$ delete from dismissed_tasks where task_key = 'cv' returning 1 $$, 'a candidate reopens their own task');

-- ---------------------------------------------------------------------------------------------
-- Gesperrtes Konto, Admin, Besucher
-- ---------------------------------------------------------------------------------------------

select tests.login('bianca');
select is_empty($$ select 1 from applications $$, 'a blocked account cannot read its own applications');
select is_empty($$ select 1 from checklist_progress $$, 'a blocked account cannot read its own progress');
select throws_ok($$ insert into applications (company) values ('Blocked Co') $$, '42501', null,
  'a blocked account cannot add applications');

select tests.login('patrick', 'aal2');
select is_empty($$ select 1 from applications $$, 'the admin sees no applications');
select is_empty($$ select 1 from application_events $$, 'the admin sees no application history');
select is_empty($$ select 1 from checklist_progress $$, 'the admin sees no checklist progress');
select is_empty($$ select 1 from dismissed_tasks $$, 'the admin sees no dismissed tasks');
select is_empty($$ update applications set notes = 'admin was here' returning 1 $$, 'the admin cannot change applications');
select is_empty($$ delete from applications returning 1 $$, 'the admin cannot delete applications');

select tests.as_anon();
select throws_ok($$ select 1 from applications $$, '42501', null, 'visitors cannot read applications');

select * from finish();
rollback;
