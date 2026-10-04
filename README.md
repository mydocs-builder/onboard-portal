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
npm run db:reset   # Datenbank neu aus supabase/migrations/ aufbauen
npm run db:test    # pgTAP-Tests aus supabase/tests/
npm run db:stop
```

Studio: http://127.0.0.1:54323, Mails (Mailpit): http://127.0.0.1:54324, API: http://127.0.0.1:54321. Die lokalen Schlüssel zeigt `npx supabase status`.

Arbeitsanweisung für Claude Code: `CLAUDE.md`.
