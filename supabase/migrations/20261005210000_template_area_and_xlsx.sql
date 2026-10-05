-- Vorlagen bekommen einen Bereich wie die Leitfäden und erscheinen auf der Seite dieses Bereichs.
-- Dazu das Format xlsx. Quelle: docs/datenmodell.md, Abschnitt "Inhalte".

-- Erlaubte Formate: docx, pdf und neu xlsx; keine weiteren.
alter type public.template_format add value 'xlsx';

-- Dieselben Bereiche wie bei articles. Die bisherigen Vorlagen gehören zu "CV and cover letter".
alter table public.templates add column area public.article_area not null default 'cv';

-- Gesperrte Vorlagen nennt locked_content() jetzt mit ihrem Bereich, damit jede Seite den
-- Stufen-Hinweis für ihre eigenen Vorlagen zeigen kann. Sonst unverändert.
create or replace function public.locked_content()
returns table (
  kind     text,
  area     text,
  title    text,
  min_plan public.plan_level,
  entries  integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.effective_plan(auth.uid()) as plan)
  select x.kind, x.area, x.title, x.min_plan, x.entries
  from me, lateral (
    select 'checklist_item', c.key, i.title, i.min_plan, 1
      from public.checklist_items i join public.checklists c on c.id = i.checklist_id
     where i.active and c.active and i.min_plan > me.plan
    union all
    select 'article', a.area::text, a.title, a.min_plan, 1
      from public.articles a where a.published and a.min_plan > me.plan
    union all
    select 'template', t.area::text, t.title, t.min_plan, 1
      from public.templates t where t.active and t.min_plan > me.plan
    union all
    select 'phrase', p.category::text, null, p.min_plan, count(*)::integer
      from public.phrases p where p.min_plan > me.plan group by p.category, p.min_plan
    union all
    select 'glossary_term', null, null, g.min_plan, count(*)::integer
      from public.glossary_terms g where g.min_plan > me.plan group by g.min_plan
    union all
    select 'company', null, null, co.min_plan, count(*)::integer
      from public.companies co where co.status = 'published' and co.min_plan > me.plan group by co.min_plan
    union all
    select 'job', null, null, j.min_plan, count(*)::integer
      from public.jobs j where j.status = 'published' and j.min_plan > me.plan group by j.min_plan
    union all
    select 'agency', null, null, ag.min_plan, count(*)::integer
      from public.agencies ag where ag.status = 'published' and ag.min_plan > me.plan group by ag.min_plan
    union all
    select 'job_board', b.category, null, b.min_plan, count(*)::integer
      from public.job_boards b where b.status = 'published' and b.min_plan > me.plan group by b.category, b.min_plan
  ) as x (kind, area, title, min_plan, entries)
  where me.plan is not null;
$$;
