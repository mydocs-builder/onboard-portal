-- 001_billing.sql
-- Zugang ueber Paesse (Einmalzahlung) und manuelle Freischaltungen, Verlauf fuer Auswertungen,
-- verarbeitete Stripe-Ereignisse und Aenderungsprotokoll.
-- Entwurf fuer Phase 1, vor dem Einsatz in der Testumgebung pruefen.

-- Aktueller Zugang pro Nutzer. Ohne Eintrag oder nach Ablauf gilt Free.
create table public.plan_access (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  plan               text not null default 'free' check (plan in ('free', 'starter', 'plus')),
  source             text not null default 'none' check (source in ('none', 'pass', 'manual')),
  pass_length        text check (pass_length in ('month', 'quarter')),
  valid_until        date,                     -- letzter Tag des Zugangs
  manual_reason      text,                     -- z. B. Pilotphase, Komplett-Begleitung
  stripe_customer_id text unique,
  updated_at         timestamptz not null default now()
);

-- Jede Phase mit Zugang als eigener Eintrag. Grundlage der Auswertungen, wird nie ueberschrieben.
create table public.plan_periods (
  id                 bigserial primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  plan               text not null check (plan in ('starter', 'plus')),
  source             text not null check (source in ('pass', 'manual', 'pilot')),
  pass_length        text check (pass_length in ('month', 'quarter')),
  reason             text,
  promo_code         text,
  amount_cents       integer,                  -- tatsaechlich bezahlter Betrag, brutto
  starts_on          date not null,
  ends_on            date not null,
  stripe_session_id  text unique,              -- verhindert doppelte Eintraege
  created_at         timestamptz not null default now()
);

-- Jedes Stripe-Ereignis wird genau einmal verarbeitet.
create table public.stripe_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

-- Aenderungsprotokoll pro Nutzer, sichtbar im Admin-Bereich.
create table public.audit_log (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  actor      text not null,                    -- 'stripe', 'system' oder Name des Admins
  text       text not null,
  created_at timestamptz not null default now()
);

-- Zugriffsregeln: Nutzer lesen nur ihren eigenen Zugang und schreiben nichts.
-- Geschrieben wird ausschliesslich von den Edge Functions mit dem Service-Role-Schluessel.
alter table public.plan_access   enable row level security;
alter table public.plan_periods  enable row level security;
alter table public.stripe_events enable row level security;
alter table public.audit_log     enable row level security;

create policy "own access readable"
  on public.plan_access for select using (auth.uid() = user_id);

-- Wirksamer Plan eines Nutzers fuer die Zugriffsregeln der Inhalte.
create or replace function public.effective_plan(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case when a.valid_until >= current_date then a.plan else 'free' end
       from public.plan_access a where a.user_id = uid),
    'free');
$$;

-- Beispiel: Inhalte mit Mindeststufe.
-- create policy "content by plan" on public.content_items for select
--   using (
--     case min_plan
--       when 'free'    then true
--       when 'starter' then public.effective_plan(auth.uid()) in ('starter', 'plus')
--       when 'plus'    then public.effective_plan(auth.uid()) = 'plus'
--     end
--   );
