-- Checklisten, redaktionelle Inhalte, Listen und Import, Speicherbereich für Vorlagendateien.
-- Quelle: docs/datenmodell.md, Abschnitte "Checklisten", "Inhalte", "Listen und Import".

-- Checklisten: ein Modell für alle. Eine neue Checkliste ist nur ein neuer Eintrag.
-- Texte in Phase 1 nur Englisch; Übersetzungen kommen später als eigene Tabelle je Punkt,
-- der Fortschritt bleibt an der ID des Punkts.
create table public.checklists (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,                   -- cv, linkedin, xing, visa_chancenkarte, after_offer
  title      text not null,
  area       text not null,                          -- Menüpunkt, in dem sie erscheint
  legal_note text,                                   -- Fundstellenzeile
  sort       integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fortschritt hängt an der ID des Punkts, nie an seiner Position.
create table public.checklist_items (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  section      text,
  title        text not null,
  description  text,
  example      text,                                 -- Ausfüllhilfe mit "Copy text"
  link_label   text,
  link_target  text,
  min_plan     public.plan_level not null default 'free',
  sort         integer not null default 0,
  active       boolean not null default true,        -- inaktive Punkte bleiben für bestehenden Fortschritt erhalten
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index checklist_items_checklist_id_idx on public.checklist_items (checklist_id, sort);

-- Leitfäden und Guide-Kapitel.
create table public.articles (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null,
  area       public.article_area not null,
  title      text not null,
  lead       text,
  body       text not null default '',               -- Markdown
  min_plan   public.plan_level not null default 'starter',
  language   public.portal_language not null default 'en',
  sort       integer not null default 0,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, language)
);

-- Vorlagen zum Download; die Dateien liegen im Speicherbereich "templates".
create table public.templates (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  format      public.template_format not null,
  file_path   text not null unique,                  -- Pfad im Speicherbereich
  min_plan    public.plan_level not null default 'starter',
  language    public.portal_language not null default 'en',
  sort        integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- German for the job.
create table public.phrases (
  id         uuid primary key default gen_random_uuid(),
  category   public.phrase_category not null,
  field      public.industry,                        -- leer = für alle Berufsfelder
  german     text not null,
  english    text not null,
  usage      text,
  min_plan   public.plan_level not null default 'starter',
  language   public.portal_language not null default 'en',
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Arbeitsvertrag erklärt.
create table public.glossary_terms (
  id         uuid primary key default gen_random_uuid(),
  term_de    text not null,
  term_en    text not null,
  what       text not null,
  look_for   text,
  min_plan   public.plan_level not null default 'starter',
  language   public.portal_language not null default 'en',
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jeder CSV-Import; seine Zeilen landen als draft und werden über die Batch-ID gemeinsam
-- veröffentlicht oder verworfen.
create table public.import_batches (
  id          uuid primary key default gen_random_uuid(),
  list        public.import_list not null,
  file_name   text not null,
  rows_total  integer not null default 0,
  rows_ok     integer not null default 0,
  rows_failed integer not null default 0,
  errors      jsonb not null default '[]'::jsonb,    -- Liste mit Zeile und Grund
  created_by  uuid default auth.uid() references public.profiles (user_id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Die vier Listen. Gemeinsame Felder: status, source, checked_at, import_batch_id, min_plan.
create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  website         text,
  domain          text unique,                       -- Dublettenerkennung
  industry        public.industry,
  employer_type   public.employer_type,
  region          text,
  signals         public.company_signal[] not null default '{}',
  status          public.list_status not null default 'draft',
  source          text,
  checked_at      date,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  min_plan        public.plan_level not null default 'plus',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (employer_type is null or industry = 'nursing_care')
);
create index companies_import_batch_id_idx on public.companies (import_batch_id);

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  company_name    text not null,
  company_id      uuid references public.companies (id) on delete set null,
  location        text,
  industry        public.industry,
  employer_type   public.employer_type,
  signals         public.company_signal[] not null default '{}',
  url             text,
  posted_on       date not null default public.portal_today(),
  expires_on      date,                              -- ohne Angabe gilt posted_on plus job_default_days
  status          public.list_status not null default 'draft',
  source          text,
  checked_at      date,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  min_plan        public.plan_level not null default 'plus',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (employer_type is null or industry = 'nursing_care')
);
create index jobs_company_id_idx on public.jobs (company_id);
create index jobs_import_batch_id_idx on public.jobs (import_batch_id);

create table public.agencies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  website         text,
  field           public.industry,
  model           public.agency_model,
  recruits_abroad boolean not null default false,
  region          text,
  specialised     boolean not null default false,    -- steuert Starter gegenüber Plus
  status          public.list_status not null default 'draft',
  source          text,
  checked_at      date,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  min_plan        public.plan_level not null default 'starter',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index agencies_import_batch_id_idx on public.agencies (import_batch_id);

create table public.job_boards (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  website         text,
  category        text,
  focus           text,
  status          public.list_status not null default 'draft',
  source          text,
  checked_at      date,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  min_plan        public.plan_level not null default 'starter',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index job_boards_import_batch_id_idx on public.job_boards (import_batch_id);

create trigger set_updated_at before update on public.checklists
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.checklist_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.templates
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.phrases
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.glossary_terms
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.import_batches
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.agencies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.job_boards
  for each row execute function public.set_updated_at();

-- Speicherbereich für Vorlagendateien (DOCX, PDF), nicht öffentlich.
insert into storage.buckets (id, name, public) values ('templates', 'templates', false);
