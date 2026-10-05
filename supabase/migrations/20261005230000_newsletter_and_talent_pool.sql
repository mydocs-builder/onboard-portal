-- Freiwillige Einwilligungen: Newsletter (mit Double-Opt-in) und Interesse am Talentpool.
-- Quelle: docs/datenmodell.md, Abschnitt "Newsletter und Talentpool".
--
-- Wie bei der Zustimmung zum Kauf stehen die Wortlaute versioniert in der Datenbank, und jede
-- Einwilligung und jeder Widerruf wird mit Zeitpunkt, Art und Fassung festgehalten. Das Portal
-- verschickt selbst keinen Newsletter; es hält nur fest, wer ihn bestellt hat.

create type public.newsletter_status as enum ('none', 'pending', 'active');
create type public.marketing_kind as enum ('newsletter', 'talent_pool');
-- given:     Häkchen gesetzt. Beim Newsletter ist das noch keine wirksame Einwilligung.
-- confirmed: Link aus der Bestätigungsmail geklickt (nur Newsletter); erst damit gilt die Einwilligung.
-- withdrawn: Widerruf.
create type public.marketing_action as enum ('given', 'confirmed', 'withdrawn');

-- ---------------------------------------------------------------------------------------------
-- Wortlaute, versioniert. Eine Fassung wird nie geändert oder gelöscht; je Art und Sprache ist
-- genau eine aktiv. Ohne aktive Fassung bietet das Portal die Einwilligung nicht an.
-- ---------------------------------------------------------------------------------------------
create table public.marketing_consent_texts (
  id         uuid primary key default gen_random_uuid(),
  kind       public.marketing_kind not null,
  version    text not null check (btrim(version) <> ''),
  language   public.portal_language not null default 'en',
  body       text not null check (btrim(body) <> ''),
  active     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, version, language)
);
create unique index marketing_consent_texts_one_active on public.marketing_consent_texts (kind, language) where active;

create trigger set_updated_at before update on public.marketing_consent_texts
  for each row execute function public.set_updated_at();
-- Nur "active" darf sich ändern, für jede Rolle (dieselbe Sperre wie bei consent_texts).
create trigger guard_consent_text before update or delete on public.marketing_consent_texts
  for each row execute function public.guard_consent_text();

-- ---------------------------------------------------------------------------------------------
-- Stand je Konto. Der Kandidat schreibt die beiden Felder nicht direkt (guard_profile_update),
-- nur über set_newsletter() und set_talent_pool(); so entsteht zu jeder Änderung ein Nachweis.
-- ---------------------------------------------------------------------------------------------
alter table public.profiles
  add column newsletter_status public.newsletter_status not null default 'none',
  add column talent_pool boolean not null default false;

-- Nachweis: ein Eintrag je Einwilligung, Bestätigung und Widerruf. Einträge werden nie geändert.
-- Mit dem Konto verschwinden sie; ohne Bezug zur Person hätten sie keinen Beweiswert.
create table public.marketing_consents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (user_id) on delete cascade,
  kind            public.marketing_kind not null,
  action          public.marketing_action not null,
  -- Die Fassung, der zugestimmt wurde; bei Bestätigung und Widerruf die Fassung der betroffenen Einwilligung.
  consent_text_id uuid references public.marketing_consent_texts (id) on delete restrict,
  source          text not null check (source in ('registration', 'account', 'email_link')),
  created_at      timestamptz not null default now()
);
create index marketing_consents_user_id_idx on public.marketing_consents (user_id, created_at);

create trigger marketing_consents_no_update before update on public.marketing_consents
  for each row execute function public.reject_change();

-- Offene Bestätigung des Newsletters. Gespeichert wird nur der Hash des Links aus der Mail.
create table public.newsletter_confirmations (
  user_id    uuid primary key references public.profiles (user_id) on delete cascade,
  token_hash text not null unique,
  sends      integer not null default 1,
  sent_at    timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('newsletter_confirmation_sends', '5');   -- so oft geht die Bestätigungsmail je Bestellung höchstens hinaus

-- ---------------------------------------------------------------------------------------------
-- Hilfsfunktionen (nur intern)
-- ---------------------------------------------------------------------------------------------

-- Aktive Fassung einer Art in der Sprache des Nutzers, sonst Englisch.
create function public.active_marketing_text(p_kind public.marketing_kind, p_language public.portal_language)
returns public.marketing_consent_texts
language sql
stable
security definer
set search_path = ''
as $$
  select t.*
    from public.marketing_consent_texts t
   where t.kind = p_kind and t.active and t.language in (p_language, 'en')
   order by (t.language = p_language) desc
   limit 1;
$$;

-- Fassung der zuletzt gegebenen Einwilligung eines Nutzers, für Bestätigung und Widerruf.
create function public.last_given_marketing_text(p_user_id uuid, p_kind public.marketing_kind)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.consent_text_id
    from public.marketing_consents c
   where c.user_id = p_user_id and c.kind = p_kind and c.action = 'given'
   order by c.created_at desc, c.id desc
   limit 1;
$$;

-- ---------------------------------------------------------------------------------------------
-- Newsletter bestellen oder abbestellen, für das eigene Konto.
-- Bestellen: p_version ist die Fassung, die das Portal angezeigt hat; sie muss die aktive sein.
--            Der Stand wird "pending", bis der Link aus der Bestätigungsmail geklickt ist.
-- Abbestellen: gilt sofort, ohne Bestätigung.
-- ---------------------------------------------------------------------------------------------
create function public.set_newsletter(p_on boolean, p_version text default null)
returns public.newsletter_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  me     public.profiles;
  wanted public.marketing_consent_texts;
begin
  select * into me from public.profiles where user_id = auth.uid() and blocked_at is null for update;
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_on then
    if me.newsletter_status <> 'none' then
      return me.newsletter_status;
    end if;
    wanted := public.active_marketing_text('newsletter', me.language);
    if wanted.id is null or p_version is distinct from wanted.version then
      raise exception 'consent_required' using errcode = 'P0001',
        hint = 'The consent text shown is not the active version.';
    end if;
    update public.profiles set newsletter_status = 'pending' where user_id = me.user_id;
    insert into public.marketing_consents (user_id, kind, action, consent_text_id, source)
    values (me.user_id, 'newsletter', 'given', wanted.id, 'account');
    return 'pending';
  end if;

  if me.newsletter_status = 'none' then
    return 'none';
  end if;
  insert into public.marketing_consents (user_id, kind, action, consent_text_id, source)
  values (me.user_id, 'newsletter', 'withdrawn', public.last_given_marketing_text(me.user_id, 'newsletter'), 'account');
  delete from public.newsletter_confirmations where user_id = me.user_id;
  update public.profiles set newsletter_status = 'none' where user_id = me.user_id;
  return 'none';
end;
$$;

-- Interesse am Talentpool setzen oder zurücknehmen, für das eigene Konto. Gespeichert wird nur das
-- Häkchen; es werden keine weiteren Daten erhoben oder weitergegeben.
create function public.set_talent_pool(p_on boolean, p_version text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me     public.profiles;
  wanted public.marketing_consent_texts;
begin
  select * into me from public.profiles where user_id = auth.uid() and blocked_at is null for update;
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if me.talent_pool = p_on then
    return me.talent_pool;
  end if;

  if p_on then
    wanted := public.active_marketing_text('talent_pool', me.language);
    if wanted.id is null or p_version is distinct from wanted.version then
      raise exception 'consent_required' using errcode = 'P0001',
        hint = 'The consent text shown is not the active version.';
    end if;
    insert into public.marketing_consents (user_id, kind, action, consent_text_id, source)
    values (me.user_id, 'talent_pool', 'given', wanted.id, 'account');
  else
    insert into public.marketing_consents (user_id, kind, action, consent_text_id, source)
    values (me.user_id, 'talent_pool', 'withdrawn', public.last_given_marketing_text(me.user_id, 'talent_pool'), 'account');
  end if;
  update public.profiles set talent_pool = p_on where user_id = me.user_id;
  return p_on;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Double-Opt-in. Beide Funktionen ruft nur der Server auf (Edge Function "newsletter").
-- ---------------------------------------------------------------------------------------------

-- Stellt den Link für die Bestätigungsmail aus. Liefert nichts, wenn keine Mail hinausgehen soll:
-- der Newsletter ist nicht (mehr) bestellt, oder die Mail ging schon hinaus und p_resend ist nicht gesetzt.
-- Erneut senden geht frühestens nach einer Minute und insgesamt newsletter_confirmation_sends Mal.
create function public.newsletter_issue_token(p_user_id uuid, p_resend boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me        public.profiles;
  open_row  public.newsletter_confirmations;
  max_sends integer;
  token     text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  select * into me from public.profiles where user_id = p_user_id and blocked_at is null for update;
  if not found or me.newsletter_status <> 'pending' then
    return null;
  end if;

  select * into open_row from public.newsletter_confirmations where user_id = p_user_id;
  if found then
    if not p_resend then
      return null;
    end if;
    select value::integer into max_sends from public.app_settings where key = 'newsletter_confirmation_sends';
    if open_row.sends >= coalesce(max_sends, 5) then
      raise exception 'send_limit_reached' using errcode = 'P0001';
    end if;
    if open_row.sent_at > now() - interval '1 minute' then
      raise exception 'too_soon' using errcode = 'P0001';
    end if;
    -- Der neue Link ersetzt den alten.
    update public.newsletter_confirmations
       set token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex'), sends = sends + 1, sent_at = now()
     where user_id = p_user_id;
  else
    insert into public.newsletter_confirmations (user_id, token_hash)
    values (p_user_id, encode(sha256(convert_to(token, 'UTF8')), 'hex'));
  end if;

  return jsonb_build_object('token', token, 'first_name', me.first_name);
end;
$$;

-- Löst den Link aus der Bestätigungsmail ein: Erst damit ist der Newsletter bestellt.
create function public.confirm_newsletter(p_token text)
returns public.newsletter_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  delete from public.newsletter_confirmations
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
  returning user_id into owner;
  if owner is null then
    return null;   -- unbekannt, schon eingelöst oder inzwischen abbestellt
  end if;

  update public.profiles set newsletter_status = 'active'
   where user_id = owner and newsletter_status = 'pending' and blocked_at is null;
  if not found then
    return null;
  end if;
  insert into public.marketing_consents (user_id, kind, action, consent_text_id, source)
  values (owner, 'newsletter', 'confirmed', public.last_given_marketing_text(owner, 'newsletter'), 'email_link');
  return 'active';
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Registrierung: Die beiden Häkchen kommen mit den Angaben des Nutzers an, als Versionskennung der
-- angezeigten Fassung (newsletter_consent, talent_pool_consent). Nur die aktive Fassung zählt; alles
-- andere wird übergangen, die Registrierung hängt von keinem der beiden ab.
-- Sonst unverändert.
-- ---------------------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta    jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  invited boolean := coalesce(new.raw_app_meta_data ->> 'invited_by_admin', '') = 'true';
  launch  public.launch_settings;
  lang    public.portal_language;
  wanted  public.marketing_consent_texts;
begin
  select * into launch from public.launch_settings;

  if launch.registration_mode = 'invite' and not invited
     and (launch.invite_code is null or meta ->> 'invite_code' is distinct from launch.invite_code) then
    raise exception 'invite_code_invalid' using errcode = 'P0001',
      hint = 'Registration currently requires a valid invite code.';
  end if;

  lang := case when meta ->> 'language' = any (enum_range(null::public.portal_language)::text[])
               then (meta ->> 'language')::public.portal_language else 'en' end;

  insert into public.profiles (user_id, first_name, last_name, field, language, invited_by_admin, registration_source)
  values (
    new.id,
    btrim(meta ->> 'first_name'),
    btrim(meta ->> 'last_name'),
    case when meta ->> 'field' = any (enum_range(null::public.industry)::text[])
         then (meta ->> 'field')::public.industry end,
    lang,
    invited,
    case when invited then 'admin' else coalesce(nullif(btrim(meta ->> 'registration_source'), ''), 'website') end
  );

  if meta ->> 'newsletter_consent' is not null then
    wanted := public.active_marketing_text('newsletter', lang);
    if wanted.id is not null and wanted.version = meta ->> 'newsletter_consent' then
      update public.profiles set newsletter_status = 'pending' where user_id = new.id;
      insert into public.marketing_consents (user_id, kind, action, consent_text_id, source)
      values (new.id, 'newsletter', 'given', wanted.id, 'registration');
    end if;
  end if;

  if meta ->> 'talent_pool_consent' is not null then
    wanted := public.active_marketing_text('talent_pool', lang);
    if wanted.id is not null and wanted.version = meta ->> 'talent_pool_consent' then
      update public.profiles set talent_pool = true where user_id = new.id;
      insert into public.marketing_consents (user_id, kind, action, consent_text_id, source)
      values (new.id, 'talent_pool', 'given', wanted.id, 'registration');
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- registration_info() nennt zusätzlich die aktiven Wortlaute der freiwilligen Einwilligungen, damit
-- die Registrierung sie anzeigen kann (Besucher dürfen nur diese Funktion aufrufen).
-- Der Rückgabetyp ändert sich, deshalb wird die Funktion neu angelegt; Rechte wie bisher.
-- ---------------------------------------------------------------------------------------------
drop function public.registration_info();

create function public.registration_info()
returns table (
  registration_mode         public.registration_mode,
  sales_enabled             boolean,
  pilot_plan                public.plan_level,
  pilot_until               date,
  confirmation_resend_limit integer,
  optional_consents         jsonb   -- [{ "kind": "newsletter", "version": "...", "body": "..." }, ...]
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.registration_mode,
         l.sales_enabled,
         case when pilot.active then l.new_account_grant::text::public.plan_level end,
         case when pilot.active then l.grant_until end,
         (select value::integer from public.app_settings where key = 'confirmation_resend_limit'),
         coalesce((select jsonb_agg(jsonb_build_object('kind', t.kind, 'version', t.version, 'body', t.body) order by t.kind)
                     from public.marketing_consent_texts t
                    where t.active and t.language = 'en'), '[]'::jsonb)
  from public.launch_settings l,
       lateral (select l.new_account_grant <> 'none'
                       and coalesce(l.grant_until >= public.portal_today(), false) as active) pilot;
$$;

grant execute on function public.registration_info() to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Zugriffsregeln
-- ---------------------------------------------------------------------------------------------
alter table public.marketing_consent_texts  enable row level security;
alter table public.marketing_consents       enable row level security;
alter table public.newsletter_confirmations enable row level security;

grant all on public.marketing_consent_texts, public.marketing_consents, public.newsletter_confirmations to service_role;
grant select, insert on public.marketing_consent_texts to authenticated;
grant update (active) on public.marketing_consent_texts to authenticated;
grant select on public.marketing_consents to authenticated;
-- newsletter_confirmations: kein Recht für Kandidat oder Admin; nur der Server kennt offene Links.

grant execute on function public.set_newsletter(boolean, text) to authenticated;
grant execute on function public.set_talent_pool(boolean, text) to authenticated;
grant execute on function public.newsletter_issue_token(uuid, boolean) to service_role;
grant execute on function public.confirm_newsletter(text) to service_role;
grant execute on function public.active_marketing_text(public.marketing_kind, public.portal_language) to service_role;
grant execute on function public.last_given_marketing_text(uuid, public.marketing_kind) to service_role;

-- Kandidaten lesen die aktiven Fassungen, um sie in den Einstellungen anzuzeigen.
create policy "candidate reads active marketing texts" on public.marketing_consent_texts
  for select to authenticated
  using (active and (select public.is_active_user()));

create policy "admin reads marketing texts" on public.marketing_consent_texts
  for select to authenticated
  using ((select public.is_admin()));

create policy "admin adds marketing text versions" on public.marketing_consent_texts
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "admin activates marketing text versions" on public.marketing_consent_texts
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Den Nachweis schreiben nur die Funktionen oben. Der Kandidat liest seinen eigenen, der Admin alle.
create policy "candidate reads own marketing consents" on public.marketing_consents
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "admin reads marketing consents" on public.marketing_consents
  for select to authenticated
  using ((select public.is_admin()));

-- Offene Bestätigungslinks sieht niemand über die Schnittstelle, auch der Admin nicht; ausdrücklich
-- als Regel, damit keine Tabelle ohne Regel bleibt.
create policy "nobody reads open newsletter confirmations" on public.newsletter_confirmations
  for select to authenticated
  using (false);
