-- checklists.area wird eine feste Werteliste, wie templates.area es mit article_area schon ist.
-- Quelle: docs/datenmodell.md, Abschnitt "Checklisten".
--
-- Der Wert bestimmt, wo eine Checkliste im Portal erscheint:
--   cv, linkedin, checklist, arrival                      auf dieser Seite (bei mehreren als Reiter)
--   applications, jobs, companies, boards, agencies,
--   german, knowledge, contract                           eigener Menüeintrag direkt hinter diesem Eintrag
--   start, search, preparation, found                     eigener Menüeintrag am Ende dieser Menügruppe
-- Die Kennungen sind die der Menüeinträge und Gruppen im Frontend (src/portal/nav.ts). Ein weiterer
-- Wert ist eine kleine Migration, zusammen mit der Stelle im Menü.

create type public.checklist_area as enum (
  'cv', 'linkedin', 'checklist', 'arrival',
  'applications', 'jobs', 'companies', 'boards', 'agencies', 'german', 'knowledge', 'contract',
  'start', 'search', 'preparation', 'found'
);

alter table public.checklists
  alter column area type public.checklist_area using area::public.checklist_area;
