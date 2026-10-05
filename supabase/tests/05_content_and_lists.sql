-- Inhalte und Listen: Kandidaten lesen Veröffentlichtes ab ihrer Stufe, der Admin pflegt.
-- Gesperrte Inhalte, Listenregeln, Import, Vorlagendateien.
begin;
set search_path = public, extensions, tests;
select plan(161);
select tests.fixtures();

insert into storage.objects (bucket_id, name) values
  ('templates', 'T/free.docx'), ('templates', 'T/starter.docx'), ('templates', 'T/plus.pdf'),
  ('templates', 'T/inactive.docx'), ('templates', 'T/orphan.docx');

-- Eine Bewerbung von bob verweist auf einen archivierten Job und ein archiviertes Unternehmen.
insert into jobs (id, title, company_name, company_id, status, min_plan)
values (tests.uid('job-archived'), 'Purge job', 'T archived', tests.uid('company-archived'), 'archived', 'free');
update applications set position = 'Nurse', company_id = tests.uid('company-archived'), job_id = tests.uid('job-archived')
 where id = tests.uid('app-bob');

create temp table content_tables (t text);
insert into content_tables values
  ('checklist_items'), ('articles'), ('templates'), ('phrases'), ('glossary_terms'),
  ('companies'), ('jobs'), ('agencies'), ('job_boards');
create temp table list_tables (t text);
insert into list_tables values ('companies'), ('jobs'), ('agencies'), ('job_boards');
grant select on content_tables, list_tables to public;

-- ---------------------------------------------------------------------------------------------
-- Sichtbarkeit nach Stufe: je Tabelle drei sichtbare Zeilen (free, starter, plus), dazu
-- inaktive, unveröffentlichte, Entwürfe und Archiviertes, die kein Kandidat sieht
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select is(tests.visible(t), 1::bigint, format('Free sees only Free rows in %s', t)) from content_tables;
select tests.login('stella');
select is(tests.visible(t), 2::bigint, format('Starter sees Free and Starter rows in %s', t)) from content_tables;
select tests.login('paula');
select is(tests.visible(t), 3::bigint, format('Plus sees all published rows in %s, no drafts or inactive ones', t)) from content_tables;
select tests.login('eve');
select is(tests.visible(t), 1::bigint, format('an expired pass sees only Free rows in %s', t)) from content_tables;
select tests.login('bianca');
select is(tests.visible(t), 0::bigint, format('a blocked account sees nothing in %s', t)) from content_tables;
select is_empty($$ select 1 from checklists $$, 'a blocked account sees no checklists');
select tests.login('patrick', 'aal1');
select is(tests.visible(t), 1::bigint, format('an admin without second factor sees only Free rows in %s', t)) from content_tables;

-- ---------------------------------------------------------------------------------------------
-- Gesperrte Inhalte: Titel und Mindeststufe, nie der Inhalt
-- ---------------------------------------------------------------------------------------------

select tests.login('alice');
select is_empty($$ select body from articles where slug = 't-starter' $$, 'Free cannot read the body of a Starter article');
select results_eq(
  $$ select kind, area, min_plan::text from locked_content() where title = 'T starter article' $$,
  $$ values ('article', 'cv', 'starter') $$, 'locked_content() names the locked article with its minimum plan');
select is((select count(*) from locked_content() where title like 'T %'), 6::bigint,
  'locked_content() lists locked checklist items, articles and templates by title');
select is_empty($$ select 1 from locked_content() where title like 'T inactive%' or title like 'T unpublished%' $$,
  'locked_content() does not reveal inactive or unpublished entries');
select results_eq($$ select distinct jsonb_object_keys(to_jsonb(l)) from locked_content() l order by 1 $$,
  $$ values ('area'), ('entries'), ('kind'), ('min_plan'), ('title') $$,
  'locked_content() carries no content fields');
select tests.login('paula');
select is_empty($$ select 1 from locked_content() $$, 'Plus has nothing locked');
select tests.login('bianca');
select is_empty($$ select 1 from locked_content() $$, 'a blocked account gets nothing from locked_content()');
select tests.as_anon();
select throws_ok($$ select 1 from locked_content() $$, '42501', null, 'visitors cannot call locked_content()');
select throws_ok($$ select 1 from articles $$, '42501', null, 'visitors cannot read content');

-- ---------------------------------------------------------------------------------------------
-- Kandidaten schreiben keine Inhalte, auch nicht mit Plus
-- ---------------------------------------------------------------------------------------------

select tests.login('paula');
select throws_ok($$ insert into articles (slug, area, title, published, min_plan) values ('x', 'cv', 'X', true, 'free') $$,
  '42501', null, 'a candidate cannot add articles');
select is_empty($$ update articles set min_plan = 'free' returning 1 $$, 'a candidate cannot lower the minimum plan of articles');
select is_empty($$ update checklist_items set min_plan = 'free' returning 1 $$, 'a candidate cannot lower the minimum plan of checklist items');
select is_empty($$ delete from glossary_terms returning 1 $$, 'a candidate cannot delete content');
select throws_ok($$ insert into companies (name, status, min_plan) values ('X', 'published', 'free') $$, '42501', null,
  'a candidate cannot add list entries');
select is_empty($$ update companies set status = 'published' returning 1 $$, 'a candidate cannot publish list entries');
select is_empty($$ delete from jobs returning 1 $$, 'a candidate cannot delete list entries');
select is_empty($$ select 1 from import_batches $$, 'a candidate cannot read imports');
select throws_ok($$ insert into import_batches (list, file_name) values ('companies', 'x.csv') $$, '42501', null,
  'a candidate cannot create imports');

-- ---------------------------------------------------------------------------------------------
-- Admin pflegt Inhalte und Listen
-- ---------------------------------------------------------------------------------------------

select tests.login('patrick', 'aal2');
select is(tests.visible('articles'), 4::bigint, 'the admin also sees unpublished articles');
select is(tests.visible(t), 5::bigint, format('the admin also sees drafts and archived rows in %s', t)) from list_tables;
select lives_ok($$ insert into articles (slug, area, title, published) values ('t-new', 'guide', 'T new', false) $$, 'the admin adds an article');
select lives_ok($$ update articles set published = true where slug = 't-new' $$, 'the admin publishes it');
select isnt_empty($$ delete from articles where slug = 't-new' returning 1 $$, 'the admin deletes it');

-- Listen: Veröffentlichtes wird archiviert, gelöscht wird nur im Entwurf
select is_empty(format($$ delete from %I where status = 'published' returning 1 $$, t),
  format('the admin cannot delete published rows in %s', t)) from list_tables;
select is_empty(format($$ delete from %I where status = 'archived' returning 1 $$, t),
  format('the admin cannot delete archived rows in %s', t)) from list_tables;
select throws_ok(format($$ update %I set status = 'draft' where status = 'published' $$, t), '42501', null,
  format('the admin cannot turn published rows in %s back into drafts', t)) from list_tables;
select throws_ok(format($$ update %I set status = 'draft' where status = 'archived' $$, t), '42501', null,
  format('the admin cannot turn archived rows in %s back into drafts', t)) from list_tables;
select lives_ok(format($$ update %I set status = 'archived' where status = 'published' and min_plan = 'plus' $$, t),
  format('the admin archives a published row in %s', t)) from list_tables;
select isnt_empty(format($$ delete from %I where status = 'draft' returning 1 $$, t),
  format('the admin deletes drafts in %s', t)) from list_tables;
select throws_ok($$ insert into companies (name, domain) values ('Duplicate', 't-free.test') $$, '23505', null,
  'a second company with the same domain is rejected');

select lives_ok(format($$ update %I set status = 'published' where status = 'archived' and min_plan = 'plus' $$, t),
  format('the admin publishes an archived row in %s again', t)) from list_tables;

-- Endgültig löschen: nur Archiviertes, nur über purge_list_entry()
select throws_ok($$ select purge_list_entry('companies', tests.uid('company-free')) $$, 'P0001', 'list_entry_not_archived',
  'a published entry cannot be purged');
insert into companies (id, name) values (tests.uid('company-draft2'), 'Draft 2');
select throws_ok($$ select purge_list_entry('companies', tests.uid('company-draft2')) $$, 'P0001', 'list_entry_not_archived',
  'a draft cannot be purged');
select throws_ok($$ select purge_list_entry('companies', tests.uid('no-such-entry')) $$, 'P0002', 'list_entry_not_found',
  'purging an unknown entry fails');
select lives_ok($$ select purge_list_entry('jobs', tests.uid('job-archived')) $$, 'the admin purges an archived job');
select lives_ok($$ select purge_list_entry('companies', tests.uid('company-archived')) $$, 'the admin purges an archived company');
select is_empty($$ select 1 from companies where id = tests.uid('company-archived') $$, 'the purged entry is gone');
select results_eq(
  $$ select actor, user_id from audit_log where text like 'Listeneintrag endgültig gelöscht: companies%' $$,
  $$ values ('Patrick Test', null::uuid) $$, 'the purge is recorded in the audit log under the admin''s name');

-- Checklistenpunkte mit Fortschritt
select throws_ok($$ delete from checklist_items where id = tests.uid('item-free') $$, '23503', null,
  'a checklist item with progress cannot be deleted');
select lives_ok($$ update checklist_items set active = false where id = tests.uid('item-free') $$, 'but deactivated');

-- Import
select lives_ok($$ insert into import_batches (id, list, file_name) values (tests.uid('batch'), 'companies', 'companies.csv') $$,
  'the admin creates an import');
select is((select created_by from import_batches where id = tests.uid('batch')), tests.uid('patrick'), 'the import records who created it');
select throws_ok($$ update import_batches set rows_ok = 99 $$, '42501', null, 'the admin cannot rewrite an import');

-- ---------------------------------------------------------------------------------------------
-- Vorlagendateien im Speicherbereich
-- ---------------------------------------------------------------------------------------------

select is((select count(*) from storage.objects where bucket_id = 'templates' and name like 'T/%'), 5::bigint,
  'the admin reaches every template file');
select tests.login('alice');
select results_eq($$ select name from storage.objects where bucket_id = 'templates' and name like 'T/%' $$,
  $$ values ('T/free.docx') $$, 'Free reaches only the Free template file');
select tests.login('stella');
select is((select count(*) from storage.objects where bucket_id = 'templates' and name like 'T/%'), 2::bigint,
  'Starter reaches Free and Starter template files');
select tests.login('paula');
select is((select count(*) from storage.objects where bucket_id = 'templates' and name like 'T/%'), 3::bigint,
  'Plus reaches all active template files, but no inactive or unlisted ones');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('templates', 'T/upload.docx') $$, '42501', null,
  'a candidate cannot upload template files');
select is_empty($$ update storage.objects set name = 'T/renamed.docx' where bucket_id = 'templates' returning 1 $$,
  'a candidate cannot replace or rename template files');
select tests.login('bianca');
select is_empty($$ select 1 from storage.objects where bucket_id = 'templates' $$, 'a blocked account reaches no template file');
select tests.as_anon();
select is_empty($$ select 1 from storage.objects where bucket_id = 'templates' $$, 'visitors reach no template file');

-- ---------------------------------------------------------------------------------------------
-- Listenregeln gelten für jede Rolle, auch für den Server
-- ---------------------------------------------------------------------------------------------

select tests.login('paula');
select throws_ok($$ select purge_list_entry('companies', tests.uid('company-free')) $$, '42501', null,
  'a candidate cannot purge list entries');
select tests.login('patrick', 'aal1');
select throws_ok($$ select purge_list_entry('companies', tests.uid('company-free')) $$, '42501', null,
  'an admin without second factor cannot purge list entries');
select tests.as_anon();
select throws_ok($$ select purge_list_entry('companies', tests.uid('company-free')) $$, '42501', null,
  'visitors cannot purge list entries');

select tests.as_service();
select throws_ok(format($$ delete from %I where status <> 'draft' $$, t), '42501', 'list_entry_not_deletable',
  format('the server cannot delete published or archived rows in %s', t)) from list_tables;
select throws_ok(format($$ update %I set status = 'draft' where status <> 'draft' $$, t), '42501', null,
  format('the server cannot turn rows in %s back into drafts', t)) from list_tables;
select throws_ok($$ select purge_list_entry('companies', tests.uid('company-free')) $$, '42501', null,
  'the server cannot purge list entries; that takes an admin');
insert into job_boards (id, name) values (tests.uid('board-draft'), 'Server draft');
select lives_ok($$ delete from job_boards where id = tests.uid('board-draft') $$, 'the server deletes drafts');

select tests.logout();
select results_eq(
  $$ select company, position, company_id, job_id from applications where id = tests.uid('app-bob') $$,
  $$ values ('Bob Co', 'Nurse', null::uuid, null::uuid) $$,
  'a purge clears the links in applications and keeps company and position as text');

-- ---------------------------------------------------------------------------------------------
-- Vorlagen: Bereich wie bei den Leitfäden, Formate docx, pdf und xlsx
-- ---------------------------------------------------------------------------------------------

select is((select count(*) from templates where title like 'T %' and area = 'cv'), 4::bigint,
  'templates without a stated area belong to the CV page');
select col_not_null('public', 'templates', 'area', 'every template has an area');
select col_type_is('public', 'templates', 'area', 'article_area', 'templates use the same areas as articles');
select is(enum_range(null::template_format)::text[], array['docx', 'pdf', 'xlsx'],
  'template formats are docx, pdf and xlsx, nothing else');

select lives_ok($$ insert into templates (title, format, file_path, area, min_plan)
                   values ('T contract sheet', 'xlsx', 'T/contract.xlsx', 'contract', 'starter') $$,
  'a template can be an xlsx file in another area');
select throws_ok($$ insert into templates (title, format, file_path) values ('T slides', 'pptx', 'T/slides.pptx') $$,
  '22P02', null, 'other file formats are refused');
select throws_ok($$ insert into templates (title, format, file_path, area) values ('T stray', 'pdf', 'T/stray.pdf', 'somewhere') $$,
  '22P02', null, 'a template cannot be put into an unknown area');

select tests.login('stella');
select results_eq($$ select format::text, area::text from templates where title = 'T contract sheet' $$,
  $$ values ('xlsx', 'contract') $$, 'Starter reads the template with its area and format');
select tests.login('alice');
select is_empty($$ select 1 from templates where title = 'T contract sheet' $$, 'Free does not see the Starter template');
select results_eq(
  $$ select kind, area, min_plan::text from locked_content() where title in ('T contract sheet', 'T starter template') order by title $$,
  $$ values ('template', 'contract', 'starter'), ('template', 'cv', 'starter') $$,
  'locked_content() names locked templates with their area');
select is_empty($$ update templates set area = 'contract' where title = 'T free template' returning 1 $$,
  'a candidate cannot move a template to another area');
select tests.logout();

-- ---------------------------------------------------------------------------------------------
-- Checklisten: der Bereich ist eine feste Werteliste
-- ---------------------------------------------------------------------------------------------

select col_type_is('public', 'checklists', 'area', 'checklist_area', 'the area of a checklist is a fixed list of values');
select is(enum_range(null::checklist_area)::text[],
  array['cv', 'linkedin', 'checklist', 'arrival', 'applications', 'jobs', 'companies', 'boards', 'agencies', 'german',
        'knowledge', 'contract', 'start', 'search', 'preparation', 'found'],
  'a checklist belongs to a checklist page, sits behind a menu entry or at the end of a menu group');
select lives_ok($$ insert into checklists (key, title, area) values ('t_family', 'T family', 'found') $$,
  'a checklist can be placed in a menu group');
select throws_ok($$ insert into checklists (key, title, area) values ('t_stray', 'T stray', 'somewhere') $$, '22P02', null,
  'a checklist cannot be put into an unknown area');
select throws_ok($$ insert into checklists (key, title, area) values ('t_account', 'T account', 'plan') $$, '22P02', null,
  'nor into the account pages');
select throws_ok($$ update checklists set area = 'test' where key = 't_checklist' $$, '22P02', null,
  'and an existing checklist cannot be moved to an unknown area');

select * from finish();
rollback;
