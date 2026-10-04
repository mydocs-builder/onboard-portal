-- Bewerbungstracker und Checklisten-Fortschritt: die Arbeitsdaten des Kandidaten.
-- Quelle: docs/datenmodell.md, Abschnitte "Bewerbungen", "Checklisten".

create table public.applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (user_id) on delete cascade,
  company      text not null check (btrim(company) <> ''),
  position     text,
  location     text,
  job_url      text,
  contact      text,                                 -- Name und Funktion
  status       public.application_status not null default 'planned',
  applied_on   date,                                 -- leer bei planned
  next_type    public.next_step_type not null default 'none',
  next_on      date,
  notes        text,
  source       public.application_source,
  job_id       uuid references public.jobs (id) on delete set null,
  company_id   uuid references public.companies (id) on delete set null,
  reminded_for date,                                 -- Termin, für den zuletzt erinnert wurde
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id)                               -- Ziel für application_events
);
create index applications_user_id_idx on public.applications (user_id);
create index applications_next_on_idx on public.applications (next_on) where next_on is not null;

-- Verlauf einer Bewerbung. Der zusammengesetzte Verweis stellt sicher, dass ein Eintrag
-- nur an einer eigenen Bewerbung hängen kann.
create table public.application_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  user_id        uuid not null default auth.uid(),
  happened_on    date not null default public.portal_today(),
  text           text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (application_id, user_id) references public.applications (id, user_id) on delete cascade
);
create index application_events_application_idx on public.application_events (application_id, user_id);

-- Ein Eintrag je abgehaktem Punkt; Entfernen des Hakens löscht ihn.
-- Punkte mit Fortschritt lassen sich nicht löschen, nur deaktivieren.
create table public.checklist_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (user_id) on delete cascade,
  item_id    uuid not null references public.checklist_items (id) on delete restrict,
  done_at    timestamptz not null default now(),
  unique (user_id, item_id)
);
create index checklist_progress_item_id_idx on public.checklist_progress (item_id);

-- "Mark as done" auf der Übersicht; "Reopen" löscht den Eintrag.
create table public.dismissed_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (user_id) on delete cascade,
  task_key     public.task_key not null,
  dismissed_at timestamptz not null default now(),
  unique (user_id, task_key)
);

create trigger set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.application_events
  for each row execute function public.set_updated_at();
