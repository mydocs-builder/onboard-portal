# Arbeitsanweisung für Claude Code: Kandidatenportal my.onboard-germany.de

## Worum es geht

Abo-freies Portal mit Pässen für internationale Fachkräfte auf Jobsuche in Deutschland, betrieben von Onboard Germany (Patrick). Phase 1: Checklisten (CV, LinkedIn, XING, Visum, "Job found"), Bewerbungstracker mit nächstem Schritt, Vorlagen und Leitfäden, Listen (Unternehmen, Jobs, Personaldienstleister, Jobbörsen), Bezahlung über Stripe, Admin-Bereich.

## Verbindliche Unterlagen in `docs/`

- `umfang-phase-1.md` – freigegebener Funktionsumfang (Export des Claude Docs)
- `datenmodell.md` – freigegebenes Datenmodell mit Zugriffsregeln (Export des Claude Docs)
- `uebergabe.md` – Entscheidungen und Stand
- `entwurf-001_billing.sql` – früher Entwurf, geht im Datenmodell auf; nicht direkt verwenden

Bei Widersprüchen gilt `datenmodell.md` vor `umfang-phase-1.md` vor `uebergabe.md`. Unklares nachfragen, nicht raten.

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
9. Texte im Portal: allgemeine Information, keine Einzelfallprüfung (RDG). Rechtliche Aussagen nur mit Paragraphenangabe, die Patrick geliefert hat.

## Gestaltung (aus dem Styleguide von Onboard Germany)

- Farben: Textblau `#0A1F44`, Creme `#FFFCF3`, Sektion warm `#F5F1E6`, warmes Weiß `#FFFEFA`, Grau Text `#5A6473`, Grau Linie `#E2E6EC`, Türkis `#49E2E2`, Button `#6FE9E9`, helles Türkis `#C1FFFC`, Info-Fläche `#EAFBFB`
- Schriften: Spectral (Überschriften) und Inter (Text, Bedienung), lokal eingebunden, nicht von Google geladen
- Ecken überall eckig (Radius 0), 8-px-Raster, kleinste Schriftgröße 14 px
- Türkis nie als Textfarbe auf Creme (Kontrast); Zahlen und Text in Textblau
- Vorbild für Aussehen und Abläufe ist der Prototyp (Link in `docs/uebergabe.md`)

## Erste Aufgaben

1. Migrationen aus `docs/datenmodell.md`: Typen, Tabellen, `effective_plan`, Trigger für `profiles` und Startphase, Zugriffsregeln
2. pgTAP-Tests für alle Zugriffsregeln
3. Seed-Daten mit Beispielinhalten für die lokale Entwicklung
4. Edge Functions `create-checkout` und `stripe-webhook` an das Datenmodell anpassen
