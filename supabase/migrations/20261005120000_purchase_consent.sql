-- Zustimmung beim Kauf: sofortiger Beginn und Erlöschen des Widerrufsrechts.
-- Ohne bestätigte Zustimmung zum aktuell gültigen Wortlaut gibt es keine Bezahlseite. Pro Kauf
-- werden Zeitpunkt, Fassung des Textes und die Planphase festgehalten.
-- Quelle: docs/datenmodell.md, "Zustimmung beim Kauf".

-- Wortlaute der Zustimmung, versioniert. Eine Fassung wird nie geändert oder gelöscht; ein neuer
-- Wortlaut ist ein neuer Eintrag. Je Sprache ist genau eine Fassung aktiv.
create table public.consent_texts (
  id         uuid primary key default gen_random_uuid(),
  version    text not null check (btrim(version) <> ''),   -- Versionskennung, z. B. 2026-10-05
  language   public.portal_language not null default 'en',
  body       text not null check (btrim(body) <> ''),
  active     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version, language)
);
create unique index consent_texts_one_active_per_language on public.consent_texts (language) where active;

create trigger set_updated_at before update on public.consent_texts
  for each row execute function public.set_updated_at();

-- Nur "active" darf sich ändern, für jede Rolle. So bleibt nachvollziehbar, welcher Wortlaut galt.
create function public.guard_consent_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'consent_text_is_permanent' using errcode = '42501';
  end if;
  if (to_jsonb(new) - array['active', 'updated_at']) is distinct from (to_jsonb(old) - array['active', 'updated_at']) then
    raise exception 'consent_text_is_permanent' using errcode = '42501',
      hint = 'Add a new version instead of changing an existing one.';
  end if;
  return new;
end;
$$;

create trigger guard_consent_text before update or delete on public.consent_texts
  for each row execute function public.guard_consent_text();

-- Eine Zustimmung je begonnenem Kauf. plan_period_id wird gesetzt, sobald die Zahlung den Pass
-- freischaltet; bleibt es leer, wurde der Kauf nicht abgeschlossen.
create table public.purchase_consents (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (user_id) on delete cascade,
  consent_text_id   uuid not null references public.consent_texts (id) on delete restrict,
  consented_at      timestamptz not null default now(),
  plan              public.plan_level not null check (plan <> 'free'),
  pass_length       public.pass_length not null,
  stripe_session_id text unique,
  plan_period_id    uuid references public.plan_periods (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index purchase_consents_user_id_idx on public.purchase_consents (user_id);
create index purchase_consents_plan_period_id_idx on public.purchase_consents (plan_period_id);

-- Bezug zur Planphase: entsteht eine Planphase aus einer Stripe-Session, wird sie an der
-- Zustimmung dieser Session vermerkt.
create function public.link_purchase_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.purchase_consents
     set plan_period_id = new.id
   where stripe_session_id = new.stripe_session_id;
  return new;
end;
$$;

create trigger link_purchase_consent after insert on public.plan_periods
  for each row when (new.stripe_session_id is not null)
  execute function public.link_purchase_consent();

-- Erster Schritt eines Kaufs, aufgerufen von create-checkout vor dem Aufruf bei Stripe: prüft
-- Verkauf, Konto, Preis und die Zustimmung und hält die Zustimmung fest. Ohne Zustimmung zur
-- aktiven Fassung scheitert der Kauf hier, bevor eine Bezahlseite entsteht.
create function public.begin_checkout(
  p_user_id         uuid,
  p_plan            public.plan_level,
  p_length          public.pass_length,
  p_consent_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent  public.consent_texts;
  price_id text;
  customer text;
  new_id   uuid;
begin
  if not exists (select 1 from public.profiles where user_id = p_user_id and blocked_at is null) then
    raise exception 'account_blocked' using errcode = 'P0001';
  end if;
  -- Solange der Verkauf aus ist (Pilotphase), gibt es keine Bezahlseite.
  if not (select sales_enabled from public.launch_settings) then
    raise exception 'sales_disabled' using errcode = 'P0001';
  end if;
  -- Preise und Stripe-Kennungen kommen aus der Tabelle prices, nicht aus dem Code.
  select stripe_price_id into price_id from public.prices
   where plan = p_plan and pass_length = p_length and active;
  if price_id is null then
    raise exception 'pass_not_available' using errcode = 'P0001';
  end if;

  -- Die Zustimmung muss sich auf die aktive Fassung beziehen: fehlt die Angabe, ist sie veraltet
  -- oder gibt es keinen aktiven Text, entsteht keine Bezahlseite.
  select * into consent from public.consent_texts where version = p_consent_version and active
   order by language limit 1;
  if not found then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  insert into public.purchase_consents (user_id, consent_text_id, plan, pass_length)
  values (p_user_id, consent.id, p_plan, p_length)
  returning id into new_id;

  select stripe_customer_id into customer from public.plan_access where user_id = p_user_id;
  return jsonb_build_object('consent_id', new_id, 'stripe_price_id', price_id, 'stripe_customer_id', customer);
end;
$$;

-- Zweiter Schritt: die bei Stripe erzeugte Session an der Zustimmung vermerken.
create function public.attach_checkout_session(p_consent_id uuid, p_session_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.purchase_consents set stripe_session_id = p_session_id
   where id = p_consent_id and stripe_session_id is null;
  if not found then
    raise exception 'unknown_consent' using errcode = 'P0002';
  end if;
end;
$$;

-- Zugriffsregeln
alter table public.consent_texts     enable row level security;
alter table public.purchase_consents enable row level security;

grant all on public.consent_texts, public.purchase_consents to service_role;
grant select, insert on public.consent_texts to authenticated;
grant update (active) on public.consent_texts to authenticated;
grant select on public.purchase_consents to authenticated;
grant execute on function public.begin_checkout(uuid, public.plan_level, public.pass_length, text) to service_role;
grant execute on function public.attach_checkout_session(uuid, text) to service_role;

-- Kandidaten lesen die aktive Fassung, um sie vor dem Kauf anzuzeigen.
create policy "candidate reads active consent text" on public.consent_texts
  for select to authenticated
  using (active and (select public.is_active_user()));

create policy "admin reads consent texts" on public.consent_texts
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin adds consent versions" on public.consent_texts
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "admin activates consent versions" on public.consent_texts
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Zustimmungen schreibt nur der Server. Der Kandidat liest seine eigenen, der Admin alle
-- (Nachweis zum Kauf, wie die Planphasen).
create policy "candidate reads own purchase consents" on public.purchase_consents
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "admin reads purchase consents" on public.purchase_consents
  for select to authenticated
  using ((select public.is_admin()));
