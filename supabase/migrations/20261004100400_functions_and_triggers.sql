-- Stufenlogik, Rollenprüfung und Trigger für profiles, Startphase und Tracker.
-- Quelle: docs/datenmodell.md, Abschnitte "Konten und Rollen", "Zugriffsregeln", "Stufenlogik".

-- ---------------------------------------------------------------------------------------------
-- Rollenprüfung für die Zugriffsregeln
-- ---------------------------------------------------------------------------------------------

-- Angemeldet und nicht gesperrt. Gesperrte Konten verlieren jeden Lesezugriff.
create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.blocked_at is null
  );
$$;

-- Admin: Rolle admin, nicht gesperrt und mit Zwei-Faktor-Anmeldung (aal2) angemeldet.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (
       select 1 from public.profiles p
       where p.user_id = auth.uid() and p.role = 'admin' and p.blocked_at is null
     );
$$;

-- Gültige Stufe eines Nutzers; alle Zugriffsregeln auf Inhalte und Listen fragen nur sie.
-- Ist valid_until heute oder später, gilt plan, sonst free. Gesperrte oder unbekannte Konten
-- haben keinen Zugang (NULL). Die Stufe eines anderen Nutzers erfährt nur Admin oder Server.
create function public.effective_plan(uid uuid)
returns public.plan_level
language sql
stable
security definer
set search_path = ''
as $$
  select case when a.valid_until >= public.portal_today() then a.plan
              else 'free'::public.plan_level end
  from public.profiles p
  left join public.plan_access a on a.user_id = p.user_id
  where p.user_id = uid
    and p.blocked_at is null
    and (uid = auth.uid()
         or coalesce(auth.jwt() ->> 'role', 'service_role') = 'service_role'
         or public.is_admin());
$$;

-- ---------------------------------------------------------------------------------------------
-- Trigger für profiles und Startphase
-- ---------------------------------------------------------------------------------------------

-- Jedes Konto in auth.users bekommt genau einen Eintrag in profiles.
-- Angaben der Registrierung kommen aus raw_user_meta_data (vom Nutzer gesetzt),
-- die Admin-Einladung aus raw_app_meta_data (nur vom Server setzbar).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta    jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  invited boolean := coalesce(new.raw_app_meta_data ->> 'invited_by_admin', '') = 'true';
  launch  public.launch_settings;
begin
  select * into launch from public.launch_settings;

  if launch.registration_mode = 'invite' and not invited
     and (launch.invite_code is null or meta ->> 'invite_code' is distinct from launch.invite_code) then
    raise exception 'invite_code_invalid' using errcode = 'P0001',
      hint = 'Registration currently requires a valid invite code.';
  end if;

  insert into public.profiles (user_id, first_name, last_name, field, language, invited_by_admin, registration_source)
  values (
    new.id,
    btrim(meta ->> 'first_name'),
    btrim(meta ->> 'last_name'),
    case when meta ->> 'field' = any (enum_range(null::public.industry)::text[])
         then (meta ->> 'field')::public.industry end,
    case when meta ->> 'language' = any (enum_range(null::public.portal_language)::text[])
         then (meta ->> 'language')::public.portal_language else 'en' end,
    invited,
    case when invited then 'admin' else coalesce(nullif(btrim(meta ->> 'registration_source'), ''), 'website') end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Jedes Profil bekommt seinen Zugang. In der Startphase (new_account_grant gesetzt, Stichtag
-- nicht vorbei) entsteht der Zugang als manuelle Freischaltung mit Grund "Pilotphase",
-- dazu die Planphase mit Quelle pilot und ein Eintrag im Änderungsprotokoll.
create function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  launch public.launch_settings;
  today  date := public.portal_today();
  grant_plan public.plan_level;
begin
  select * into launch from public.launch_settings;

  if launch.new_account_grant <> 'none' and launch.grant_until >= today then
    grant_plan := launch.new_account_grant::text::public.plan_level;

    insert into public.plan_access (user_id, plan, source, valid_until, manual_reason)
    values (new.user_id, grant_plan, 'manual', launch.grant_until, 'Pilotphase');

    insert into public.plan_periods (user_id, plan, source, starts_on, ends_on, reason, granted_by)
    values (new.user_id, grant_plan, 'pilot', today, launch.grant_until, 'Pilotphase', 'system');

    insert into public.audit_log (user_id, actor, text)
    values (new.user_id, 'system',
            format('Pilotphase: %s kostenlos bis %s', initcap(grant_plan::text), launch.grant_until));
  else
    insert into public.plan_access (user_id) values (new.user_id);
  end if;
  return new;
end;
$$;

create trigger on_profile_created after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- Über die Schnittstelle darf der Kandidat im eigenen Profil nur Name, Berufsfeld, Sprache und
-- Erinnerungen ändern, der Admin bei anderen nur die Sperre. Server und Datenbankfunktionen
-- sind nicht eingeschränkt.
create function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed text[];
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if old.user_id = auth.uid() then
    allowed := array['first_name', 'last_name', 'field', 'language', 'reminders_enabled', 'updated_at'];
  else
    allowed := array['blocked_at', 'updated_at'];
  end if;

  if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
    raise exception 'profile_field_not_writable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Erster Login: steuert "Welcome aboard". Der Kandidat kann das Feld nicht direkt schreiben.
create function public.mark_first_login()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set first_login_at = now()
   where user_id = auth.uid() and first_login_at is null and blocked_at is null;
$$;

-- Konto löschen: alle Planphasen bleiben ohne Personenbezug für die Auswertung. Die Nutzer-ID
-- wird durch eine zufällige Kennung je gelöschtem Konto ersetzt (keine Zuordnungstabelle), die
-- Stripe-Session-ID entfernt, weil sie über Stripe zur Person zurückführt. Der Grund bleibt.
create function public.handle_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.plan_periods
     set user_id = null, deleted_account_id = fresh.id, stripe_session_id = null
    from (select gen_random_uuid() as id) as fresh
   where user_id = old.user_id;
  return old;
end;
$$;

create trigger on_profile_delete before delete on public.profiles
  for each row execute function public.handle_profile_delete();


-- Einträge im Änderungsprotokoll werden nie geändert, auch nicht vom Server.
create function public.reject_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

create trigger audit_log_no_update before update on public.audit_log
  for each row execute function public.reject_change();

-- Listen: Veröffentlichte Einträge werden nur archiviert, gelöscht wird nur im Entwurf.
-- Beides gilt für jede Rolle, auch für den Server. Kein Weg führt zurück auf draft;
-- archived -> published bleibt möglich. Endgültig löschen kann nur purge_list_entry().
create function public.guard_list_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' and new.status = 'draft' then
    raise exception 'published_entry_cannot_return_to_draft' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_list_status before update of status on public.companies
  for each row execute function public.guard_list_status();
create trigger guard_list_status before update of status on public.jobs
  for each row execute function public.guard_list_status();
create trigger guard_list_status before update of status on public.agencies
  for each row execute function public.guard_list_status();
create trigger guard_list_status before update of status on public.job_boards
  for each row execute function public.guard_list_status();

create function public.guard_list_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'draft' then
    return old;
  end if;
  -- Nur purge_list_entry() setzt dieses Kennzeichen, für die Dauer seiner Transaktion.
  if old.status = 'archived' and current_setting('portal.purge_list_entry', true) = old.id::text then
    return old;
  end if;
  raise exception 'list_entry_not_deletable' using errcode = '42501',
    hint = 'Only drafts can be deleted. Archive published entries instead.';
end;
$$;

create trigger guard_list_delete before delete on public.companies
  for each row execute function public.guard_list_delete();
create trigger guard_list_delete before delete on public.jobs
  for each row execute function public.guard_list_delete();
create trigger guard_list_delete before delete on public.agencies
  for each row execute function public.guard_list_delete();
create trigger guard_list_delete before delete on public.job_boards
  for each row execute function public.guard_list_delete();

-- Endgültiges Löschen eines archivierten Listeneintrags durch den Admin, mit Eintrag im
-- Änderungsprotokoll. Verweise aus Bewerbungen (company_id, job_id) werden über die Verknüpfung
-- geleert; company und position der Bewerbung bleiben als Text erhalten.
create function public.purge_list_entry(list public.import_list, id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_status public.list_status;
  entry_name   text;
  admin_name   text;
begin
  if not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;

  execute format('select status, %I from public.%I where id = $1 for update',
                 case when list = 'jobs' then 'title' else 'name' end, list)
     into entry_status, entry_name using id;

  if entry_status is null then
    raise exception 'list_entry_not_found' using errcode = 'P0002';
  end if;
  if entry_status <> 'archived' then
    raise exception 'list_entry_not_archived' using errcode = 'P0001',
      hint = 'Only archived entries can be purged.';
  end if;

  perform set_config('portal.purge_list_entry', id::text, true);
  execute format('delete from public.%I where id = $1', list) using id;
  perform set_config('portal.purge_list_entry', '', true);

  select p.first_name || ' ' || p.last_name into admin_name
    from public.profiles p where p.user_id = auth.uid();
  insert into public.audit_log (actor, text)
  values (admin_name, format('Listeneintrag endgültig gelöscht: %s, "%s" (%s)', list, entry_name, id));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Tracker
-- ---------------------------------------------------------------------------------------------

-- Free-Grenze: Bei effektiv free sind höchstens free_application_limit Bewerbungen möglich.
-- Geprüft wird nur beim Anlegen; bestehende Einträge darüber bleiben sichtbar und bearbeitbar.
create function public.enforce_free_application_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_free integer;
begin
  if public.effective_plan(new.user_id) is distinct from 'free' then
    return new;
  end if;

  select value::integer into max_free from public.app_settings where key = 'free_application_limit';
  if max_free is null then
    return new;
  end if;

  -- Gleichzeitige Anfragen desselben Nutzers nacheinander prüfen.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if (select count(*) from public.applications a where a.user_id = new.user_id) >= max_free then
    raise exception 'free_application_limit_reached' using errcode = 'P0001',
      hint = format('The Free plan allows up to %s applications.', max_free);
  end if;
  return new;
end;
$$;

create trigger enforce_free_application_limit before insert on public.applications
  for each row execute function public.enforce_free_application_limit();

-- ---------------------------------------------------------------------------------------------
-- Funktionen für das Frontend
-- ---------------------------------------------------------------------------------------------

-- Startphase, soweit für Registrierung und Stufenwahl nötig. Der Einladungscode bleibt verborgen.
create function public.registration_info()
returns table (
  registration_mode public.registration_mode,
  sales_enabled     boolean,
  pilot_plan        public.plan_level,
  pilot_until       date
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.registration_mode,
         l.sales_enabled,
         case when pilot.active then l.new_account_grant::text::public.plan_level end,
         case when pilot.active then l.grant_until end
  from public.launch_settings l,
       lateral (select l.new_account_grant <> 'none'
                       and coalesce(l.grant_until >= public.portal_today(), false) as active) pilot;
$$;

-- Die beiden Grenzwerte, die das Frontend anzeigt. app_settings selbst bleibt dem Admin vorbehalten.
create function public.public_settings()
returns table (
  free_application_limit integer,
  pass_reminder_days     integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select (select value::integer from public.app_settings where key = 'free_application_limit'),
         (select value::integer from public.app_settings where key = 'pass_reminder_days')
  where public.is_active_user();
$$;

-- Gesperrte Inhalte für den Stufen-Hinweis: nur Bereich, Titel und Mindeststufe, nie der Inhalt.
-- Einträge mit Titel (Checklistenpunkte, Leitfäden, Vorlagen) einzeln, alles andere als Anzahl je Bereich.
create function public.locked_content()
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
    select 'template', null, t.title, t.min_plan, 1
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
