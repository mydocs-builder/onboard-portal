-- Konten, Zugang und Bezahlung, Betrieb.
-- Quelle: docs/datenmodell.md, Abschnitte "Konten und Rollen", "Zugang, Pässe und Startphase",
-- "Geplante Funktionen und Mails".

-- Portal-Angaben zu jedem Konto in auth.users. Alle Nutzerdaten hängen an profiles und
-- verschwinden mit dem Konto.
create table public.profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  first_name          text not null check (btrim(first_name) <> ''),
  last_name           text not null check (btrim(last_name) <> ''),
  role                public.user_role not null default 'candidate',   -- admin nur per Hand in der Datenbank
  field               public.industry,
  language            public.portal_language not null default 'en',
  first_login_at      timestamptz,                                     -- leer bis zum ersten Login
  reminders_enabled   boolean not null default true,
  invited_by_admin    boolean not null default false,
  blocked_at          timestamptz,
  registration_source text not null default 'website',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Was ein Nutzer heute darf. Ein Eintrag je Nutzer, angelegt mit dem Profil.
create table public.plan_access (
  user_id            uuid primary key references public.profiles (user_id) on delete cascade,
  plan               public.plan_level not null default 'free',
  source             public.access_source not null default 'none',
  pass_length        public.pass_length,
  valid_until        date,                                             -- letzter Tag des Zugangs
  manual_reason      text,
  stripe_customer_id text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (pass_length is null or source = 'pass')
);

-- Wie es dazu kam: jede Phase mit Zugang als eigener Eintrag, auch künftige.
-- Nach dem Löschen des Kontos bleiben alle Phasen für die Auswertung erhalten: user_id wird geleert
-- und durch eine zufällige Kennung je gelöschtem Konto ersetzt, die sich nicht zurückführen lässt.
create table public.plan_periods (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles (user_id) on delete set null,
  deleted_account_id uuid,                                             -- zufällig, ohne Zuordnungstabelle
  plan              public.plan_level not null check (plan <> 'free'),
  source            public.period_source not null,
  pass_length       public.pass_length,
  starts_on         date not null,
  ends_on           date not null,
  reason            text,
  promo_code        text,
  amount_cents      integer check (amount_cents >= 0),                 -- tatsächlich bezahlter Betrag, brutto
  credit_days       integer check (credit_days >= 0),                  -- umgerechnete Tage beim Upgrade
  stripe_session_id text unique,                                       -- verhindert doppelte Freischaltung
  granted_by        text not null,                                     -- stripe, system oder Admin-Name
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (pass_length is null or source = 'pass'),
  check (user_id is null or deleted_account_id is null)
);
create index plan_periods_user_id_idx on public.plan_periods (user_id);
create index plan_periods_starts_on_idx on public.plan_periods (starts_on);

-- Preise der Pässe. Bei einer Preisänderung wird der alte Eintrag inaktiv und ein neuer angelegt.
create table public.prices (
  id              uuid primary key default gen_random_uuid(),
  plan            public.plan_level not null check (plan <> 'free'),
  pass_length     public.pass_length not null,
  amount_cents    integer not null check (amount_cents >= 0),
  stripe_price_id text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index prices_one_active_per_pass on public.prices (plan, pass_length) where active;

-- Startphase, genau ein Eintrag.
create table public.launch_settings (
  id                boolean primary key default true check (id),
  registration_mode public.registration_mode not null default 'open',
  invite_code       text,
  new_account_grant public.account_grant not null default 'plus',
  grant_until       date,                                              -- Stichtag, legt Patrick fest
  sales_enabled     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
insert into public.launch_settings default values;

-- Jede Meldung von Stripe wird genau einmal verarbeitet.
create table public.stripe_events (
  id          text primary key,                                        -- Ereignis-ID von Stripe
  type        text not null,
  received_at timestamptz not null default now()
);

-- Änderungsprotokoll im Admin-Bereich. Einträge werden nie geändert.
-- user_id ist leer bei Einträgen, die kein Nutzerkonto betreffen (z. B. gelöschte Listeneinträge).
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (user_id) on delete cascade,
  actor      text not null,                                            -- stripe, system oder Admin-Name
  text       text not null,
  created_at timestamptz not null default now()
);
create index audit_log_user_id_idx on public.audit_log (user_id, created_at desc);

-- Verschickte Mails der täglichen Funktion. Eindeutig je Art, Bezug und Tag.
create table public.email_log (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  kind    public.email_kind not null,
  ref_id  uuid,                                                        -- z. B. Bewerbung oder Planphase
  sent_at timestamptz not null default now(),
  sent_on date not null default public.portal_today(),
  unique nulls not distinct (user_id, kind, ref_id, sent_on)
);

-- Grenzwerte und Texteinstellungen.
create table public.app_settings (
  key        text primary key,
  value      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values
  ('free_application_limit', '10'),
  ('pass_reminder_days', '7'),
  ('job_default_days', '30');

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.plan_access
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.plan_periods
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.prices
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.launch_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
