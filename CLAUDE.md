# Arbeitsanweisung für Claude Code: Kandidatenportal my.onboard-germany.de

## Worum es geht

Abo-freies Portal mit Pässen für internationale Fachkräfte auf Jobsuche in Deutschland, betrieben von Onboard Germany (Patrick). Phase 1: Checklisten (CV, LinkedIn, XING, Visum, "Job found"), Bewerbungstracker mit nächstem Schritt, Vorlagen und Leitfäden, Listen (Unternehmen, Jobs, Personaldienstleister, Jobbörsen), Bezahlung über Stripe, Admin-Bereich.

## Verbindliche Unterlagen in `docs/`

- `umfang-phase-1.md` – freigegebener Funktionsumfang (Export des Claude Docs)
- `datenmodell.md` – Datenmodell mit Zugriffsregeln; beschreibt den gebauten Stand und wird von Claude gepflegt
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

**Schritt 7, Admin-Bereich** (Deutsch): Übersicht, Auswertungen, Nutzer, Nutzer anlegen, Plan ändern, Startphase, Zustimmungstexte, Inhaltspflege, CSV-Import.

- Auswertungen: Summen-Funktionen in der Datenbank, noch nicht gebaut. Erstattete Planphasen zählen nicht als Verkauf, ersetzte (superseded_by) nicht als eigener Pass.
- Zustimmungstexte (`consent_texts`): Fassungen anzeigen mit Zahl der Käufe, neue Fassung anlegen, aktiv schalten mit Bestätigung, kein Bearbeiten oder Löschen, Warnhinweis ohne aktive Fassung.
- Startphase: beim Einschalten des Verkaufs warnen, wenn keine Fassung des Zustimmungstextes aktiv ist.
- Änderungen des Admins an Plan und Sperre sollen im Änderungsprotokoll landen; das ist für Admin-Aktionen noch nicht gebaut.
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

Gebaut ist alles bis Schritt 6; 548 pgTAP-Tests und 59 Tests der Frontend-Logik (Vitest) laufen durch. `docs/datenmodell.md` beschreibt den gebauten Stand der Datenbank vollständig.

**Frontend (`frontend/`)**

- Seiten unter `src/pages/`, gemeinsame Bausteine unter `src/components/`, alle Bedientexte in `src/i18n/en.json`. Inhalte (Checklisten, Leitfäden, Formulierungen, Glossar, Listen, Preise, Zustimmungstext) kommen aus der Datenbank.
- `src/portal/PortalProvider.tsx` lädt nach der Anmeldung Profil, Stufe (`effective_plan`), heutiges Datum (`portal_today`), Grenzwerte und `locked_content()`. Das Schloss im Menü wird daraus abgeleitet: Ein Bereich gilt als gesperrt, wenn die Stufe dort nichts sieht und es gesperrte Einträge gibt.
- Logik mit Tests: `src/tracker/logic.ts` (Vorschläge beim Statuswechsel, Fälligkeit, "What happened?", Dubletten), `src/overview/steps.ts` (nächste Schritte, "Completed") und `src/lib/emailSuggestion.ts` (Hinweis bei Tippfehlern in verbreiteten E-Mail-Domains).
- Gestaltung: `src/styles/portal.css` ist das CSS des Prototyps mit Farben und Schriften als Variablen, `src/styles/app.css` die Ergänzungen. Kleinste Schriftgröße 14 px (Styleguide); der Prototyp hatte stellenweise 11 bis 13 px.
- Adressen und Menü stehen je an genau einer Stelle: `src/routes.ts` hält die Adresse jeder Seite (im übrigen Code steht keine Adresse als Text), `src/portal/nav.ts` Gruppen, Reihenfolge und Einträge des Menüs; die Beschriftung kommt aus den Texten (`nav.items.*`, `nav.groups.*`). Ändert sich eine Adresse, kommt die alte in `REDIRECTS` in `src/routes.ts` und leitet auf die neue weiter. Außerhalb des Frontends stehen Portal-Adressen nur in `create-checkout` (Rückkehr von Stripe) und in den Mailtexten.
- Checklisten kommen aus der Datenbank ins Menü: Ihr Feld `area` bestimmt die Stelle (Regel und Tabelle in `docs/datenmodell.md`, Abschnitt Checklisten; Code in `src/portal/checklistNav.ts`). Eine neue aktive Checkliste erscheint ohne Code-Änderung, als Reiter auf einer bestehenden Seite oder als eigener Menüeintrag unter `/checklists/<key>`. `area` ist bei Checklisten wie bei Vorlagen eine feste Werteliste in der Datenbank; eine Auffangregel für unbekannte Werte gibt es nicht.
- Vorlagen erscheinen auf der Seite ihres Bereichs (`templates.area`, dieselben Bereiche wie bei `articles`); die gemeinsame Komponente ist `src/components/Templates.tsx`. "Interview and guide" erscheint im Menü auch dann, wenn es dort nur Vorlagen gibt.
- Links aus Mails führen auf `/auth/callback` (optional mit `?next=`). Die Rückkehr von Stripe führt auf `/billing/success` und `/plan?checkout=cancelled`.
- Nach jeder Migration `npm run db:types` ausführen und die erzeugte Datei mit einchecken.

**Arbeitsweise**

- Nach jedem abgeschlossenen Schritt committen, direkt auf `main`. Pushen nur, wenn Patrick es sagt. Scheitert der Push an der Anmeldung, muss Patrick ihn einmal selbst ausführen (die Anmeldung bei GitHub braucht den Browser).
- Committete Migrationen werden nicht mehr geändert; jede Änderung ist eine neue Migration. Geänderte Funktionen werden dort mit `create or replace` vollständig neu angegeben.
- Neue Funktionen sind für niemanden ausführbar, bis ein `grant execute` dasteht (Standardrechte sind entzogen).
- `.env` enthält Patricks Stripe-Testschlüssel. Werte nicht auslesen oder anzeigen; nur prüfen, ob sie gesetzt sind.

**Lokale Arbeit** (Befehle und Schritte in `README.md`)

- `npm run portal` startet alles auf einmal (Supabase, Funktionen, Frontend unter http://127.0.0.1:5173), `npm run portal:stripe` zusätzlich `stripe listen`; das Skript ist `scripts/portal.mjs`. Einzeln: `npm run db:start`, `db:reset`, `db:test`, `db:types`, `functions:serve`, `dev`. Die Supabase CLI ist in `package.json` festgeschrieben.
- `frontend/.env.local` (ignoriert) enthält Adresse und öffentlichen Schlüssel (anon) der lokalen Umgebung; Vorlage ist `frontend/.env.example`.
- Für Kauf und Kontolöschung im Browser muss `npm run functions:serve` laufen: Ohne die `.env` erlauben die Funktionen nur Aufrufe von der Adresse des Servers (`PORTAL_URL`), nicht von 127.0.0.1.
- Testkonten aus `supabase/seed.sql`: `free@`, `starter@`, `plus@`, `admin@example.com`; Passwort unter `dev_password`.
- Admin-Rechte gelten erst mit zweitem Faktor (TOTP). Für `admin@example.com` ist er eingerichtet; das Geheimnis steht in `seed.sql` unter `admin_totp_secret`.
- Stripe: `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook`. Ohne `--events` startet es bei Patrick nicht.
- Mails lokal: in `.env` stehen `SMTP_HOST=inbucket`, `SMTP_PORT=1025`, `SMTP_SENDER=...`; Postfach unter http://127.0.0.1:54324.
- Die tägliche Funktion wird lokal von Hand aufgerufen, mit dem Service-Role-Schlüssel als Bearer-Token.
- `sales_enabled` ist nur in den Seed-Daten an; nach den Migrationen allein ist der Verkauf aus.

**Entscheidungen, die nicht im Datenmodell stehen**

- Mailtexte in `supabase/functions/_shared/emails.ts` sind von Patrick freigegeben (fünf Mails der täglichen Funktion, Kaufbestätigung). Reiner Text, kein HTML. Änderungen am Wortlaut nur nach Rücksprache.
- Die vier Mails von Supabase Auth (Bestätigung der Registrierung, Einladung, Passwort zurücksetzen, E-Mail-Änderung) stehen in `supabase/templates/`, Betreff in `supabase/config.toml`; Wortlaut von Patrick freigegeben (5. Oktober 2026). Supabase Auth verschickt Mails nur als HTML, deshalb enthalten die Vorlagen nichts außer Absätzen und dem Link, ohne Gestaltung. Die Anrede nimmt den Vornamen aus den Angaben der Registrierung (`first_name`). Alle Links gelten 24 Stunden (`otp_expiry`), auch der zum Zurücksetzen des Passworts.
- Eine E-Mail-Änderung wird an der alten und an der neuen Adresse bestätigt (`double_confirm_changes = true`, Entscheidung von Patrick am 5. Oktober 2026); beide erhalten dieselbe Mail, die die neue Adresse nennt. Die Anmeldung wechselt erst, wenn beide Links geklickt sind.
- `create-checkout` erwartet `consent_version`; das Frontend liest die aktive Fassung aus `consent_texts` und schickt deren Versionskennung mit.
- Seed-Daten: Unternehmen, Jobs und Personaldienstleister sind Beispieldaten (Name beginnt mit "Beispiel", Adresse endet auf `.example` oder liegt unter `example.com`, `source = 'example'`). Der Zustimmungstext in den Seed-Daten ist der Entwurf aus dem Prototyp.
- In Patricks Stripe-Testkonto liegen Testzahlungen und zwei Test-Erstattungen aus den Tests vom 4. und 5. Oktober.

- Rechnungen (5. Oktober 2026): Im Portal gibt es keine Links zu Rechnungen. "Plan and billing" zeigt die Käufe mit Datum, Pass und Betrag und den Satz, dass die Rechnungen per Mail von Stripe kamen. Rechnungs-IDs werden nicht gespeichert.
- Visa-Checkliste: nur Chancenkarte, ohne Reiter. Die Reiter erscheinen von selbst, sobald im Menüpunkt eine zweite Checkliste aktiv ist (gilt für jeden Menüpunkt mit mehreren Checklisten, so auch LinkedIn und XING).
- Sprachumschalter und das Feld "Portal language" sind ausgeblendet, bis es die deutsche Fassung gibt.
- Abweichungen vom Prototyp, von Patrick bestätigt: Unternehmen nur in Plus (auch in der Preiskarte), "pass" statt "subscription" beim Löschen des Kontos, "Jobs for internationals" erst mit dem ersten veröffentlichten Job, ohne Verkauf keine Stufenwahl und auf "Plan" der Pilot-Hinweis.
- Texte zu Jobs sagen nicht "updated daily" (im Prototyp so); in Phase 1 werden Jobs von Hand gepflegt.
- Konto löschen und Bewerbung löschen verlangen eine Bestätigung (Passwort bzw. zweiter Klick); der Prototyp löschte sofort.
- Der Verlauf einer Bewerbung wird als fertiger englischer Satz gespeichert (`application_events.text`), nicht als Schlüssel.
- Wer nach dem Anfordern einer E-Mail-Änderung sein Passwort ändert, macht den Bestätigungslink ungültig (Verhalten von Supabase Auth); die Seite sagt dann, dass der Link nicht mehr gilt.

**Bekannte Lücken**

- Die Verweise auf Impressum, Datenschutzerklärung, Nutzungsbedingungen und die Buchung des Immigration Call zeigen vorläufig auf `https://onboard-germany.de/` (`frontend/src/lib/links.ts`).
- "Interview and guide" erscheint im Menü erst, wenn dort ein Leitfaden veröffentlicht ist (wie "Jobs for internationals"); bis dahin ist der Menüpunkt für alle Stufen ausgeblendet.
- Die Mails von Supabase Auth gehen technisch als HTML hinaus (nur Absätze und Link). Echter reiner Text wie bei den übrigen Mails bräuchte einen eigenen Versand über einen Send-Email-Hook.
- Das Aussehen wurde in Schritt 6 nur stichprobenhaft am Bildschirm geprüft (Login, Navigation, mobile Leiste); die übrigen Seiten über Inhalt und Verhalten. Der Blick auf jede Seite, auch mobil, gehört zu Schritt 8.

- Vier Leitfäden haben im Prototyp nur Titel und Kurztext; sie sind angelegt, aber unveröffentlicht.
- Die Verweise auf Hubs der Website in "From offer to first day" zeigen vorläufig auf `https://onboard-germany.de/`.
- Der Prototyp enthält 9 Beispielfirmen, der Umfang nennt 10.
- Vorlagen sind Platzhalterdateien in `supabase/storage/templates/`.
- Die Aufbewahrungsfrist der Zustimmungen (drei Kalenderjahre) wird mit den Rechtstexten noch geprüft.
- Eine eigene eingeschränkte Datenbankrolle für n8n (Phase 2) ist vorgemerkt, nicht gebaut.

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
- [ ] **Rechtstexte:** Nutzungsbedingungen, Datenschutzerklärung und Widerrufsbelehrung für das Portal geprüft
- [ ] **Mailversand:** Transaktionsmails bei rapidmail geklärt, SMTP-Daten auf dem Server, Absenderdomain bestätigt
- [ ] **Unternehmen:** Mindestzahl echter, geprüfter Unternehmen erreicht
- [ ] **Jobbörsen:** Adressen aller Jobbörsen geöffnet und `checked_at` gesetzt
- [ ] **Sicherheitsprüfung:** unabhängige Prüfung von Zugriffsregeln, Server und Bezahlung
- [ ] **Server ohne Seed-Daten:** Auf dem Server sind nur die Migrationen gelaufen, nie `supabase/seed.sql`; es gibt dort keine Testkonten
- [ ] **Admin-Konto:** Das echte Admin-Konto hat einen eigenen zweiten Faktor
- [ ] **Startphase:** Verkauf erst einschalten, wenn alle Punkte oben erledigt sind
