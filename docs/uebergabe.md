# Übergabe Kandidatenportal my.onboard-germany.de

Stand: 4. Oktober 2026. Für den Start der nächsten Sitzung ins Projektwissen legen.

## Verbindliche Unterlagen

- **Umfang Phase 1 (freigegeben):** Claude Doc "Kandidatenportal: Umfang Phase 1", https://claude.ai/code/artifact/cdd6458e-867d-43c6-8508-734733c3002e
- **Klickbarer Prototyp:** https://claude.ai/artifact/5nq7n3BGysTpgJo4m3uek3 (Kandidatenportal, Login und Registrierung, Admin-Bereich; Beispieldaten, keine Datenbank)
- **Code-Entwürfe Bezahlung** (ungetestet): `supabase/migrations/001_billing.sql`, `supabase/functions/create-checkout/index.ts`, `supabase/functions/stripe-webhook/index.ts`

## Entscheidungen

- Portal getrennt von WordPress unter **my.onboard-germany.de**, zum Start nur Englisch, Zweisprachigkeit technisch angelegt
- Technik: eigener Server in der EU mit 8 GB RAM, Docker, **Caddy + Supabase selbst gehostet** (PocketBase verworfen, noch vor v1.0), Frontend als statische React-Anwendung
- Phase 1 ohne n8n; n8n erst in Phase 2 (automatische Jobs- und Firmenrecherche, KI-Funktionen)
- **Stufen:** Free, Starter, Plus. **Pässe statt Abos**, Einmalzahlung, enden automatisch: Starter 14 € (1 Monat) / 36 € (3 Monate), Plus 29 € / 75 €. 3-Monats-Pass als "Best value" hervorgehoben, 1 Monat vorausgewählt
- Upgrade während eines Passes: höhere Stufe sofort, Restwert des alten Passes wird zum Listenpreis pro Tag in Tage der neuen Stufe umgerechnet. Gleiche oder niedrigere Stufe beginnt nach dem bisherigen Ende
- Unternehmensliste und aktuelle Jobs in Plus; Jobs in Phase 1 von Hand gepflegt, Import per CSV (Excel: "CSV UTF-8", Semikolon)
- **Startphase:** Pilot mit Plus kostenlos bis Stichtag, Verkauf aus, optional Einladungscode; Umschaltung im Admin
- Gutscheincodes über Stripe; Anrechnung 29 € für Plus auf die Job Search Consultation
- Admin-Bereich (Deutsch): Übersicht, Auswertungen, Alle Nutzer, Nutzer anlegen (Einladung per Mail, keine Passwortvergabe), Inhalte, Startphase
- Mailversand: **rapidmail**. Code-Repository: **GitHub**, privat, nur Code und Struktur, keine Kundendaten
- Unabhängige Sicherheitsprüfung vor dem Verkaufsstart

## Patricks Aufgaben (laufen parallel)

- [ ] Server in Deutschland oder EU, 8 GB RAM, mit Auftragsverarbeitungsvertrag
- [ ] Subdomain my.onboard-germany.de vormerken (DNS-Zugang bereithalten)
- [ ] Stripe-Konto mit Geschäftsdaten, nur Testmodus
- [ ] rapidmail-Konto, Auftragsverarbeitungsvertrag, Absenderdomain onboard-germany.de bestätigen
- [ ] GitHub-Konto mit Zwei-Faktor-Anmeldung, privates Repository `onboard-portal`
- [ ] Steuerfrage digitale Leistungen ins Ausland (OSS) mit Steuerberaterin klären

## Nächste Schritte (Claude)

1. **Datenmodell und Zugriffsregeln:** Dokument zum Gegenlesen plus Migrationsdateien; die Code-Entwürfe zur Bezahlung gehen darin auf
2. Installation auf dem Server mit Testumgebung, Backups, Update- und Veröffentlichungsskript
3. Oberfläche komplett (HTML/CSS in React), dann Anbindung an die Datenbank
4. Bezahlung im Stripe-Testmodus
5. Admin-Bereich mit Pflegemasken, Import, Auswertungen
6. Durchtest inklusive automatischer Tests der Zugriffsregeln

Ziel: eine erste vollständige Fassung mit Beispielinhalten, um zu sehen, ob alles grundsätzlich funktioniert. Inhalte, Website-Anpassungen (Preise, Kommunikation) und Rechtstexte werden erst danach geprüft.

## Bewusst später

Deutsche Fassung; n8n-Recherche; CV-Check und Interview-Feedback per KI; Visa-Checklisten Blaue Karte, Fachkräftevisum, Pflege; Visa-Navigator im Portal; Spiegelung von Website-Inhalten (z. B. Familiennachzug); Pflege-Spezialisierung; Stellenanzeigen von Unternehmen (Klärung § 38 BeschV).
