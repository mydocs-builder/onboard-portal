# onboard-portal

Kandidatenportal von Onboard Germany, my.onboard-germany.de.

- `docs/` – Umfang, Datenmodell, Übergabe
- `supabase/` – Migrationen, Edge Functions, Tests
- `frontend/` – React-Anwendung
- `server/` – Docker Compose, Caddy, Backup-, Update- und Veröffentlichungsskripte

## Lokale Entwicklung

Voraussetzungen: Docker Desktop (läuft) und Node.js. Die Supabase CLI ist als Dev-Abhängigkeit festgeschrieben.

```bash
npm install
npm run db:start   # lokaler Supabase-Stack, spielt alle Migrationen ein
npm run db:reset   # Datenbank neu aus supabase/migrations/ aufbauen, danach supabase/seed.sql laden
npm run db:test    # pgTAP-Tests aus supabase/tests/
npm run db:stop
```

Studio: http://127.0.0.1:54323, Mails (Mailpit): http://127.0.0.1:54324, API: http://127.0.0.1:54321. Die lokalen Schlüssel zeigt `npx supabase status`.

### Lokale Testkonten

`supabase/seed.sql` legt vier Konten an, nur für die lokale Entwicklung, nie für die Produktion: `free@example.com`, `starter@example.com`, `plus@example.com`, `admin@example.com`. Das gemeinsame Passwort steht in `supabase/seed.sql` unter `dev_password`. Dazu vier Platzhalterdateien für die Vorlagen aus `supabase/storage/templates/`.

**Als Admin mit zweitem Faktor anmelden:** Admin-Rechte gelten erst in einer Sitzung mit zweitem Faktor. Für `admin@example.com` ist der Faktor schon eingerichtet.

1. Einmalig: In einer Authenticator-App ein Konto von Hand hinzufügen (zeitbasiert, 6 Stellen), Name `admin@example.com`, Schlüssel = Wert von `admin_totp_secret` in `supabase/seed.sql`.
2. Anmelden mit E-Mail und Passwort. Die Sitzung hat dann die Stufe `aal1` und verhält sich wie ein Kandidat.
3. Den sechsstelligen Code aus der App eingeben. Danach hat die Sitzung `aal2` und Admin-Rechte.

Solange das Frontend keine Anmeldeseite hat, laufen die Schritte 2 und 3 über die Schnittstelle: `POST /auth/v1/token?grant_type=password`, dann `POST /auth/v1/factors/<id>/challenge` und `POST /auth/v1/factors/<id>/verify` mit `challenge_id` und `code`; die Faktor-ID steht in `GET /auth/v1/user`. In supabase-js sind das `signInWithPassword`, `mfa.challenge` und `mfa.verify`.

### Bezahlung lokal testen (Stripe-Testmodus)

1. `.env.example` nach `.env` kopieren. Dort `STRIPE_SECRET_KEY` (Testschlüssel `sk_test_...`) und `PORTAL_URL=http://127.0.0.1:5173` eintragen.
2. `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook` starten (die Angabe `--events` ist nötig; es sind die beiden Ereignisse, die der Webhook verarbeitet) und den ausgegebenen Wert `whsec_...` als `STRIPE_WEBHOOK_SECRET` in `.env` eintragen.
3. `npm run functions:serve` startet `create-checkout` und `stripe-webhook` mit diesen Werten.

Die Regeln der Freischaltung (Beginn, Ende, Umrechnung beim Upgrade) stehen in der Datenbankfunktion `grant_pass` und sind in `supabase/tests/06_grant_pass.sql` getestet.

### Tägliche Funktion lokal ausführen

Die Edge Function `daily` startet vorgemerkte Pässe, beendet abgelaufene Zugänge, archiviert abgelaufene Jobs, gleicht mit Stripe ab und verschickt die fälligen Mails. Auf dem Server ruft die Datenbank sie jeden Morgen selbst auf; lokal von Hand:

1. Für den Mailversand in `.env` eintragen: `SMTP_HOST=inbucket`, `SMTP_PORT=1025`, `SMTP_SENDER=Onboard Germany <portal@onboard-germany.de>`. Die Mails landen dann im lokalen Postfach unter http://127.0.0.1:54324 und verlassen den Rechner nicht.
2. `npm run functions:serve` starten.
3. Aufrufen mit dem lokalen Service-Role-Schlüssel (`npx supabase status`): `POST http://127.0.0.1:54321/functions/v1/daily` mit dem Header `Authorization: Bearer <Service-Role-Schlüssel>`.

Die Antwort nennt, was der Lauf getan hat. Ohne SMTP-Angaben werden die Mails übersprungen, ohne Stripe-Schlüssel der Abgleich. Die Regeln sind in `supabase/tests/07_daily.sql` getestet, die Mailtexte stehen in `supabase/functions/_shared/emails.ts`.

Arbeitsanweisung für Claude Code: `CLAUDE.md`.
