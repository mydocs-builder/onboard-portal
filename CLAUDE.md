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
| 6 | Frontend Kandidatenportal nach `docs/prototyp.html` | offen, als Nächstes |
| 7 | Admin-Bereich | offen |
| 8 | Durchtest der wichtigsten Abläufe im Browser | offen |
| 9 | Server | offen |
| später | Löschen inaktiver Konten | nicht bauen, bis Patrick es freigibt |

**Schritt 7, Admin-Bereich** (Deutsch): Übersicht, Auswertungen, Nutzer, Nutzer anlegen, Plan ändern, Startphase, Zustimmungstexte, Inhaltspflege, CSV-Import.

- Auswertungen: Summen-Funktionen in der Datenbank, noch nicht gebaut. Erstattete Planphasen zählen nicht als Verkauf, ersetzte (superseded_by) nicht als eigener Pass.
- Zustimmungstexte (`consent_texts`): Fassungen anzeigen mit Zahl der Käufe, neue Fassung anlegen, aktiv schalten mit Bestätigung, kein Bearbeiten oder Löschen, Warnhinweis ohne aktive Fassung.
- Startphase: beim Einschalten des Verkaufs warnen, wenn keine Fassung des Zustimmungstextes aktiv ist.
- Änderungen des Admins an Plan und Sperre sollen im Änderungsprotokoll landen; das ist für Admin-Aktionen noch nicht gebaut.

**Schritt 9, Server:** docker-compose mit Caddy und Supabase, Testumgebung, Backups, Update- und Veröffentlichungsskript, Vault-Einträge für den Zeitplan der täglichen Funktion (`daily_function_url`, `daily_function_key`). Auf dem Server laufen nur die Migrationen, nie `supabase/seed.sql`: keine Testkonten, keine Beispieldaten, kein Verkauf durch die Seed-Daten. Das echte Admin-Konto bekommt einen eigenen zweiten Faktor, nicht das Geheimnis aus den Seed-Daten.

**Später, inaktive Konten:** Konten ohne Login und ohne Pass nach 24 Monaten löschen, Ankündigung per Mail 30 Tage vorher. Gehört in die tägliche Funktion; braucht eine neue Mail-Art in `email_log` und einen Mailtext von Patrick.

## Aktueller Stand (5. Oktober 2026)

Gebaut ist alles bis Schritt 5; 470 pgTAP-Tests laufen durch. `docs/datenmodell.md` beschreibt den gebauten Stand vollständig.

**Arbeitsweise**

- Nach jedem abgeschlossenen Schritt committen, direkt auf `main`. Pushen nur, wenn Patrick es sagt. Scheitert der Push an der Anmeldung, muss Patrick ihn einmal selbst ausführen (die Anmeldung bei GitHub braucht den Browser).
- Committete Migrationen werden nicht mehr geändert; jede Änderung ist eine neue Migration. Geänderte Funktionen werden dort mit `create or replace` vollständig neu angegeben.
- Neue Funktionen sind für niemanden ausführbar, bis ein `grant execute` dasteht (Standardrechte sind entzogen).
- `.env` enthält Patricks Stripe-Testschlüssel. Werte nicht auslesen oder anzeigen; nur prüfen, ob sie gesetzt sind.

**Lokale Arbeit** (Befehle und Schritte in `README.md`)

- `npm run db:start`, `db:reset`, `db:test`, `functions:serve`. Die Supabase CLI ist in `package.json` festgeschrieben.
- Testkonten aus `supabase/seed.sql`: `free@`, `starter@`, `plus@`, `admin@example.com`; Passwort unter `dev_password`.
- Admin-Rechte gelten erst mit zweitem Faktor (TOTP). Für `admin@example.com` ist er eingerichtet; das Geheimnis steht in `seed.sql` unter `admin_totp_secret`.
- Stripe: `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook`. Ohne `--events` startet es bei Patrick nicht.
- Mails lokal: in `.env` stehen `SMTP_HOST=inbucket`, `SMTP_PORT=1025`, `SMTP_SENDER=...`; Postfach unter http://127.0.0.1:54324.
- Die tägliche Funktion wird lokal von Hand aufgerufen, mit dem Service-Role-Schlüssel als Bearer-Token.
- `sales_enabled` ist nur in den Seed-Daten an; nach den Migrationen allein ist der Verkauf aus.

**Entscheidungen, die nicht im Datenmodell stehen**

- Mailtexte in `supabase/functions/_shared/emails.ts` sind von Patrick freigegeben (fünf Mails der täglichen Funktion, Kaufbestätigung). Reiner Text, kein HTML. Änderungen am Wortlaut nur nach Rücksprache.
- `create-checkout` erwartet `consent_version`; das Frontend liest die aktive Fassung aus `consent_texts` und schickt deren Versionskennung mit.
- Seed-Daten: Unternehmen, Jobs und Personaldienstleister sind Beispieldaten (Name beginnt mit "Beispiel", Adresse endet auf `.example`, `source = 'example'`). Der Zustimmungstext in den Seed-Daten ist der Entwurf aus dem Prototyp.
- In Patricks Stripe-Testkonto liegen Testzahlungen und zwei Test-Erstattungen aus den Tests vom 4. und 5. Oktober.

**Bekannte Lücken**

- Vier Leitfäden haben im Prototyp nur Titel und Kurztext; sie sind angelegt, aber unveröffentlicht.
- Die Verweise auf Hubs der Website in "From offer to first day" zeigen vorläufig auf `https://onboard-germany.de/`.
- Der Prototyp enthält 9 Beispielfirmen, der Umfang nennt 10.
- Vorlagen sind Platzhalterdateien in `supabase/storage/templates/`.
- Die Aufbewahrungsfrist der Zustimmungen (drei Kalenderjahre) wird mit den Rechtstexten noch geprüft.
- Eine eigene eingeschränkte Datenbankrolle für n8n (Phase 2) ist vorgemerkt, nicht gebaut.

## Vor dem Verkaufsstart

- [ ] **Stripe, Konto:** öffentliche Unternehmensdaten, Kontoauszug-Bezeichnung ONBOARD GERMANY, Branding, Kunden-E-Mails für erfolgreiche Zahlungen und Erstattungen. Ohne die Kunden-E-Mails für erfolgreiche Zahlungen stimmt der Rechnungssatz der Kaufbestätigung nicht ("You will receive your invoice in a separate email from Stripe", `supabase/functions/_shared/emails.ts`).
- [ ] **Stripe, Rechnungen:** Rechnungsangaben mit Steuernummer bzw. USt-IdNr, mit der Steuerberatung abgestimmt
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
