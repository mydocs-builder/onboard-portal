# Arbeitsanweisung für Claude Code: Kandidatenportal my.onboard-germany.de

## Worum es geht

Abo-freies Portal mit Pässen für internationale Fachkräfte auf Jobsuche in Deutschland, betrieben von Onboard Germany (Patrick). Phase 1: Checklisten (CV, LinkedIn, XING, Visum, "Job found"), Bewerbungstracker mit nächstem Schritt, Vorlagen und Leitfäden, Listen (Unternehmen, Jobs, Personaldienstleister, Jobbörsen), Bezahlung über Stripe, Admin-Bereich.

## Verbindliche Unterlagen in `docs/`

- `umfang-phase-1.md` – freigegebener Funktionsumfang (Export des Claude Docs)
- `datenmodell.md` – Datenmodell mit Zugriffsregeln; beschreibt den gebauten Stand und wird von Claude gepflegt
- `frontend.md` – Aufbau des Frontends, Entscheidungen, Abweichungen vom Prototyp, bekannte Lücken; wird von Claude gepflegt
- `uebergabe.md` – abgelöst; verweist nur noch auf `CLAUDE.md` und `datenmodell.md`
- `entwurf-001_billing.sql` – früher Entwurf, geht im Datenmodell auf; nicht direkt verwenden
- `prototyp.html` – klickbarer Prototyp: Vorbild für Aussehen und Abläufe, Quelle der Seed-Texte

Bei Widersprüchen gilt `datenmodell.md` vor `umfang-phase-1.md`. Unklares nachfragen, nicht raten.

## Technik

- Supabase selbst gehostet (Postgres, Auth, Storage, Edge Functions in TypeScript/Deno), lokal über die Supabase CLI
- Frontend: React mit TypeScript, Vite, React Router, supabase-js, i18next; eigenes CSS ohne CSS-Framework
- Stripe: nur serverseitig in Edge Functions; Einmalzahlungen (Pässe), keine Abos
- Mail: rapidmail per SMTP
- Caddy als Reverse Proxy, Docker Compose auf eigenem Server

## Regeln

1. **Keine Geheimnisse im Repository.** Schlüssel nur in `.env` (ignoriert); im Repository nur `.env.example` mit leeren Werten.
2. **Datenbank nur über Migrationen** in `supabase/migrations/`, nie per Hand. Neue Felder optional oder mit Standardwert; Umbenennen und Löschen getrennt vom Hinzufügen.
3. **Jede Tabelle mit Row Level Security** und ausdrücklichen Regeln. Für jede Regel ein Test in `supabase/tests/` (pgTAP), der versucht, sie zu umgehen.
4. **Plan und Pass schreibt nie der Kandidat.** Nur Webhook, Admin-Funktionen und die tägliche Funktion.
5. **Admin sieht keine Bewerbungen und Checklisten-Fortschritte** einzelner Nutzer; Auswertungen nur als Summen.
6. **Inhalte als Daten**, nicht im Code. Fortschritt hängt an festen IDs.
7. **Nutzereingaben nie als HTML ausgeben.** Markdown nur über einen sicheren Renderer.
8. **Code und Bezeichner englisch, Dokumentation deutsch.** Oberfläche zum Start nur Englisch, alle Texte über i18next.
9. **`docs/datenmodell.md` pflegt Claude selbst** (seit 4. Oktober 2026): Jede Änderung an Migrationen wird im selben Schritt dort nachgetragen.
10. Texte im Portal: allgemeine Information, keine Einzelfallprüfung (RDG). Rechtliche Aussagen nur mit Paragraphenangabe, die Patrick geliefert hat.

## Gestaltung (aus dem Styleguide von Onboard Germany)

- Farben: Textblau `#0A1F44`, Creme `#FFFCF3`, Sektion warm `#F5F1E6`, warmes Weiß `#FFFEFA`, Grau Text `#5A6473`, Grau Linie `#E2E6EC`, Türkis `#49E2E2`, Button `#6FE9E9`, helles Türkis `#C1FFFC`, Info-Fläche `#EAFBFB`
- Schriften: Spectral (Überschriften) und Inter (Text, Bedienung), lokal eingebunden, nicht von Google geladen
- Ecken überall eckig (Radius 0), 8-px-Raster, kleinste Schriftgröße 14 px
- Türkis nie als Textfarbe auf Creme (Kontrast); Zahlen und Text in Textblau
- Der gefüllte Kasten (Info-Fläche) ist wichtigen Hinweisen vorbehalten, höchstens einmal pro Seite; alles andere, etwa ein "Tip", ist ein Hinweis mit Linie links
- Vorbild für Aussehen und Abläufe ist der Prototyp (`docs/prototyp.html`)

## Fahrplan

| Schritt | Inhalt | Stand |
| --- | --- | --- |
| 1 | Datenbank: Migrationen aus `docs/datenmodell.md` | erledigt |
| 2 | pgTAP-Tests für alle Zugriffsregeln | erledigt |
| 3 | Seed-Daten aus `docs/prototyp.html`, Testkonten, Platzhalterdateien | erledigt |
| 4 | Bezahlung: `create-checkout`, `stripe-webhook`, `grant_pass`, Zustimmung beim Kauf, Erstattungen | erledigt |
| 5 | Tägliche Funktion `daily` und Mails | erledigt |
| 6 | Frontend Kandidatenportal nach `docs/prototyp.html` | erledigt |
| 7 | Admin-Bereich | offen, als Nächstes |
| 8 | Durchtest der wichtigsten Abläufe im Browser | offen |
| 9 | Server | offen |
| später | Löschen inaktiver Konten | nicht bauen, bis Patrick es freigibt |
| später | Freischalt-Codes im Portal | nicht bauen, bis Patrick es freigibt |
| später | Aufgaben der Übersicht je Checkliste einstellbar | nicht bauen, bis Patrick es freigibt |

**Schritt 7, Admin-Bereich** (Deutsch): Übersicht, Auswertungen, Nutzer, Nutzer anlegen, Plan ändern, Startphase, Zustimmungstexte, Inhaltspflege, CSV-Import, Partnerangebote.

- **Zuerst der Prototyp:** Vor dem Bau der Pflegemasken entwirft Patrick sie mit Claude im Prototyp. Nicht mit dem Bau der Masken beginnen, bevor dieser Entwurf vorliegt.
- Auswertungen: Summen-Funktionen in der Datenbank, noch nicht gebaut. Erstattete Planphasen zählen nicht als Verkauf, ersetzte (superseded_by) nicht als eigener Pass.
- Zustimmungstexte (`consent_texts`): Fassungen anzeigen mit Zahl der Käufe, neue Fassung anlegen, aktiv schalten mit Bestätigung, kein Bearbeiten oder Löschen, Warnhinweis ohne aktive Fassung.
- Startphase: beim Einschalten des Verkaufs warnen, wenn keine Fassung des Zustimmungstextes aktiv ist.
- Änderungen des Admins an Plan und Sperre sollen im Änderungsprotokoll landen; das ist für Admin-Aktionen noch nicht gebaut.
- Seitenleiste wie im Kandidatenportal, mit denselben Klassen (`docs/frontend.md`, Gestaltung). Nicht einklappbar.
- Newsletter und Talentpool: in der Übersicht die Zahl der Newsletter-Abonnenten (Status active) und der Talentpool-Interessenten, als Summen-Funktion; Export der Newsletter-Abonnenten mit Status active als CSV für rapidmail. Die Seite "Zustimmungstexte" pflegt auch die Wortlaute der beiden Häkchen (`marketing_consent_texts`), nach denselben Regeln wie `consent_texts`.
- Pflegemaske für Leitfäden: Knöpfe "Hinweis" und "Wichtiger Hinweis", die das Markdown selbst setzen (`> ...` bzw. `> [!IMPORTANT]`), und eine Vorschau.
- Partnerangebote: Tabelle `partner_offers` mit Anbieter, Titel, Kategorie, Kurzbeschreibung, Link, optionalem Gutscheincode, gültig bis, Stelle im Portal, Reihenfolge, Status. Für alle Stufen sichtbar, als Baustein an der zugeordneten Stelle und auf einer Übersichtsseite "Partner offers"; ohne veröffentlichte Angebote erscheint nichts. Hinweis bei jedem Angebot: "Partner link: We may receive a commission. The price for you stays the same." Klicks je Angebot zählen, ohne Bezug zum Nutzer.
- Anmeldung des Admins: Nach E-Mail und Passwort fehlt im Frontend noch der Schritt für den zweiten Faktor (TOTP); bis dahin verhält sich ein Admin-Konto im Portal wie ein Kandidat.
- Einladung: `first_name` in den Angaben des Nutzers mitgeben (Anrede der Mail) und als Ziel `/auth/callback?next=/reset-password` setzen; die Seite zum Setzen des Passworts gibt es schon.

**Schritt 9, Server:** docker-compose mit Caddy und Supabase, Testumgebung, Backups, Update- und Veröffentlichungsskript, Vault-Einträge für den Zeitplan der täglichen Funktion (`daily_function_url`, `daily_function_key`). Die vier Mailtexte von Supabase Auth (Bestätigung, Einladung, Passwort zurücksetzen, E-Mail-Änderung) müssen auf dem Server genauso hinterlegt werden wie lokal: Betreff und Vorlage aus `supabase/config.toml` und `supabase/templates/`, dazu dieselbe Gültigkeit der Links (`otp_expiry`, 24 Stunden) und `double_confirm_changes = true`. Auf dem Server laufen nur die Migrationen, nie `supabase/seed.sql`: keine Testkonten, keine Beispieldaten, kein Verkauf durch die Seed-Daten. Das echte Admin-Konto bekommt einen eigenen zweiten Faktor, nicht das Geheimnis aus den Seed-Daten.

**Später, inaktive Konten:** Konten ohne Login und ohne Pass nach 24 Monaten löschen, Ankündigung per Mail 30 Tage vorher. Gehört in die tägliche Funktion; braucht eine neue Mail-Art in `email_log` und einen Mailtext von Patrick.

**Später, Aufgaben der Übersicht** (vorgemerkt am 5. Oktober 2026): Je Checkliste einstellbar, ob sie als Aufgabe unter "Next steps" auf der Übersicht erscheint, statt der festen Bindung an `task_key` (heute cv, linkedin, xing, visa in `frontend/src/overview/steps.ts` und `dismissed_tasks.task_key`).

**Später, Freischalt-Codes** (vorgemerkt am 5. Oktober 2026): Der Admin legt Codes an mit Stufe, Dauer in Tagen, maximaler Zahl der Einlösungen und "gültig bis". Kandidaten lösen sie unter "Plan and billing" ein. Die Freischaltung läuft wie eine manuelle, mit dem Code als Grund, und folgt denselben Regeln für Beginn und Ende wie Pässe. Rabatte auf Käufe bleiben bei den Gutscheincodes von Stripe; die Freischalt-Codes haben damit nichts zu tun.

- Code mit höherer Stufe bei laufendem bezahltem Pass: Die höhere Stufe gilt sofort für die Dauer des Codes; der bezahlte Restwert wird wie beim Upgrade über `pass_terms` umgerechnet und angehängt.
- Bei gleicher oder höherer laufender Stufe hängt sich der Code hinten an.
- Resttage kostenloser Freischaltungen werden wie bisher nicht umgerechnet.
- Jedes Konto kann einen Code nur einmal einlösen. "Maximale Einlösungen" ist die Gesamtzahl über alle Konten.
- Zusätzlich je Code die Einstellung "nur für Konten ohne bisherigen Pass".

## Aktueller Stand (5. Oktober 2026)

Gebaut ist alles bis Schritt 6. 606 pgTAP-Tests und 75 Tests der Frontend-Logik (Vitest) laufen durch. Den gebauten Stand beschreiben `docs/datenmodell.md` (Datenbank) und `docs/frontend.md` (Frontend, Entscheidungen, Abweichungen vom Prototyp, bekannte Lücken). Vor der Arbeit an einem Bereich dort nachlesen.

**Nächster Schritt: Schritt 7, Admin-Bereich.** Er beginnt nicht mit Code: Zuerst entwirft Patrick die Pflegemasken mit Claude im Prototyp. Was dazugehört, steht oben im Fahrplan.

**In der Sitzung vom 5. Oktober gebaut**

- Frontend des Kandidatenportals in `frontend/`: Anmeldung und Registrierung, Übersicht, Checklisten, Tracker, Listen, Inhaltsseiten, Account settings, Plan und Kauf.
- Datenbank: `preview_pass` und `pass_terms` (eine Rechnung für Vorschau und Freischaltung), Löschen unbestätigter Konten und Grenze für das erneute Senden des Bestätigungslinks, `area` als feste Werteliste bei Checklisten und Vorlagen, Format xlsx für Vorlagen, Newsletter mit Double-Opt-in und Talentpool mit versionierten Wortlauten und Nachweis.
- Edge Functions `delete-account` und `newsletter`.
- Mails von Supabase Auth mit freigegebenem Wortlaut (`supabase/templates/`), Bestätigungsmail zum Newsletter.
- `npm run portal` und `npm run portal:stripe` (`scripts/portal.mjs`).

**Arbeitsweise**

- Nach jedem abgeschlossenen Schritt committen, direkt auf `main`. Pushen nur, wenn Patrick es sagt. Scheitert der Push an der Anmeldung, muss Patrick ihn einmal selbst ausführen (die Anmeldung bei GitHub braucht den Browser).
- Committete Migrationen werden nicht mehr geändert; jede Änderung ist eine neue Migration. Geänderte Funktionen werden dort mit `create or replace` vollständig neu angegeben; ändert sich der Rückgabetyp, wird die Funktion gelöscht und mit ihren Rechten neu angelegt.
- Neue Funktionen sind für niemanden ausführbar, bis ein `grant execute` dasteht (Standardrechte sind entzogen). Besucher dürfen nur `registration_info()` aufrufen; jede Tabelle braucht mindestens eine ausdrückliche Regel. Beides prüft `supabase/tests/01_schema.sql`.
- Nach jeder Migration `npm run db:types` ausführen, `docs/datenmodell.md` nachtragen und Tests ergänzen. Änderungen am Frontend in `docs/frontend.md` nachtragen.
- `.env` enthält Patricks Stripe-Testschlüssel. Werte nicht auslesen oder anzeigen; nur prüfen, ob sie gesetzt sind.
- Mailtexte sind von Patrick freigegeben; Änderungen am Wortlaut nur nach Rücksprache. Das gilt für `supabase/functions/_shared/emails.ts` (reiner Text) und `supabase/templates/` (Supabase Auth). Die Bestätigungsmail zum Newsletter darf keine Werbung und keine weiteren Inhalte enthalten.
- Neue Wortlaute für das Portal (Häkchen, rechtliche Hinweise) nicht selbst festlegen: als Entwurf kennzeichnen und Patrick vorlegen.

**Lokale Arbeit** (Befehle und Schritte in `README.md`)

- `npm run portal` startet Supabase, Funktionen und Frontend (http://127.0.0.1:5173), `npm run portal:stripe` zusätzlich `stripe listen` mit `--events` (ohne die Angabe startet es bei Patrick nicht). Einzeln: `npm run db:start`, `db:reset`, `db:test`, `db:types`, `functions:serve`, `dev`. Die Supabase CLI ist in `package.json` festgeschrieben.
- Die Funktionen müssen mit der `.env` laufen (`functions:serve` oder `portal`): Sonst erlauben sie nur Aufrufe von der Adresse des Servers und verschicken keine Mails.
- Testkonten aus `supabase/seed.sql`: `free@`, `starter@`, `plus@`, `admin@example.com`; Passwort unter `dev_password`. Admin-Rechte gelten erst mit zweitem Faktor (TOTP); das Geheimnis steht in `seed.sql` unter `admin_totp_secret`.
- Mails landen lokal im Postfach unter http://127.0.0.1:54324. Die tägliche Funktion wird lokal von Hand aufgerufen, mit dem Service-Role-Schlüssel als Bearer-Token.
- Nur lokal, durch die Seed-Daten: Verkauf eingeschaltet, Entwürfe der Wortlaute (Kauf, Newsletter, Talentpool) aktiv, Beispieldaten für Unternehmen, Jobs und Personaldienstleister (Name beginnt mit "Beispiel", `source = 'example'`). Nach den Migrationen allein ist der Verkauf aus und es gibt keine Wortlaute.
- In Patricks Stripe-Testkonto liegen Testzahlungen und zwei Test-Erstattungen vom 4. und 5. Oktober.

**Offene Punkte**

- Die Adressen für Impressum und Germany Immigration Call fehlen; die Verweise zeigen vorläufig auf die Startseite (siehe "Vor dem Verkaufsstart").
- Ohne aktiven Wortlaut zeigt das Portal die Häkchen für Newsletter und Talentpool nicht an und verkauft nichts. Auf dem Server lassen sich die Wortlaute erst mit dem Admin-Bereich anlegen.
- Vier Leitfäden sind angelegt, aber unveröffentlicht (im Prototyp nur Titel und Kurztext). "Interview and guide" ist deshalb im Menü ausgeblendet, und die gesperrten Starter-Leitfäden der CV-Seite erscheinen noch nicht.
- Vorlagen sind Platzhalterdateien in `supabase/storage/templates/`. Der Prototyp enthält 9 Beispielfirmen, der Umfang nennt 10.
- Mit den Rechtstexten zu prüfen: Aufbewahrungsfrist der Zustimmungen zum Kauf (drei Kalenderjahre) und ob der Nachweis zu Newsletter und Talentpool die Löschung des Kontos überdauern muss.
- Änderungen des Admins an Plan und Sperre landen noch nicht im Änderungsprotokoll; die Summen-Funktionen für die Auswertungen fehlen (beides Schritt 7).
- Das Beenden von `npm run portal` mit Strg+C hat Patrick noch nicht bestätigt.
- Eine eigene eingeschränkte Datenbankrolle für n8n (Phase 2) ist vorgemerkt, nicht gebaut.
- Weitere bekannte Lücken des Frontends stehen in `docs/frontend.md`.

## Aufgaben bei Patrick

- [ ] Server buchen: Deutschland oder EU, 8 GB RAM, mit Auftragsverarbeitungsvertrag
- [ ] Subdomain `my.onboard-germany.de` per DNS auf den Server richten
- [ ] rapidmail für Transaktionsmails klären: SMTP-Zugang, kostenloses Kontingent, Auftragsverarbeitungsvertrag
- [ ] Steuerfrage digitale Leistungen ins Ausland (OSS) mit der Steuerberatung klären
- [x] GitHub-Konto und Repository
- [x] Stripe-Konto im Testmodus

## Vor dem Verkaufsstart

- [ ] **Stripe, Konto:** öffentliche Unternehmensdaten, Kontoauszug-Bezeichnung ONBOARD GERMANY, Branding, Kunden-E-Mails für erfolgreiche Zahlungen und Erstattungen. Ohne die Kunden-E-Mails für erfolgreiche Zahlungen stimmt der Rechnungssatz der Kaufbestätigung nicht ("You will receive your invoice in a separate email from Stripe", `supabase/functions/_shared/emails.ts`).
- [ ] **Stripe, Rechnungen:** Rechnungsangaben mit Steuernummer bzw. USt-IdNr, mit der Steuerberatung abgestimmt
- [ ] **Website-Links:** Adressen für Impressum und Germany Immigration Call in `frontend/src/lib/links.ts` eintragen (bis dahin Platzhalter auf die Startseite; Datenschutzerklärung und Nutzungsbedingungen folgen, sobald die Seiten existieren)
- [ ] **Stripe Live-Modus:** Produkte und Preise neu anlegen, Webhook einrichten, Live-Preis-IDs in `prices` eintragen
- [ ] **Umsatzsteuer** bei digitalen Leistungen ins Ausland (OSS) geklärt
- [ ] **Zustimmungstext:** geprüfter Wortlaut angelegt und aktiv geschaltet
- [ ] **Einwilligungstexte für Newsletter und Talentpool:** Die Wortlaute der beiden Häkchen sind Entwürfe aus dem Prototyp (lokal in `supabase/seed.sql`). Mit den Rechtstexten prüfen und die geprüften Fassungen im Admin-Bereich anlegen und aktiv schalten; ohne aktive Fassung zeigt das Portal das jeweilige Häkchen nicht an. Dabei auch klären, ob der Nachweis einer Einwilligung nach der Löschung des Kontos aufbewahrt werden muss (heute wird er mitgelöscht)
- [ ] **Partnerangebote:** Kennzeichnungstext der Partnerlinks prüfen; vor Versicherungsempfehlungen mit Provision die Erlaubnispflicht klären
- [ ] **Rechtstexte:** Nutzungsbedingungen, Datenschutzerklärung und Widerrufsbelehrung für das Portal geprüft
- [ ] **Mailversand:** Transaktionsmails bei rapidmail geklärt, SMTP-Daten auf dem Server, Absenderdomain bestätigt
- [ ] **Unternehmen:** Mindestzahl echter, geprüfter Unternehmen erreicht
- [ ] **Jobbörsen:** Adressen aller Jobbörsen geöffnet und `checked_at` gesetzt
- [ ] **Sicherheitsprüfung:** unabhängige Prüfung von Zugriffsregeln, Server und Bezahlung
- [ ] **Server ohne Seed-Daten:** Auf dem Server sind nur die Migrationen gelaufen, nie `supabase/seed.sql`; es gibt dort keine Testkonten
- [ ] **Admin-Konto:** Das echte Admin-Konto hat einen eigenen zweiten Faktor
- [ ] **Startphase:** Verkauf erst einschalten, wenn alle Punkte oben erledigt sind
