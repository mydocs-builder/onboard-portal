# Kandidatenportal: Frontend

Beschreibt den gebauten Stand des Frontends in `frontend/` (Schritt 6, 5. Oktober 2026) und die Entscheidungen dazu. Claude pflegt diese Datei wie `datenmodell.md`: Jede Änderung am Aufbau oder an einer hier genannten Entscheidung wird im selben Schritt nachgetragen.

## Aufbau

React mit TypeScript, Vite, React Router, supabase-js, i18next; eigenes CSS ohne Framework. Markdown über `react-markdown` (übernimmt kein HTML), Schriften lokal über `@fontsource`.

| Ort | Inhalt |
| --- | --- |
| `src/routes.ts` | Die Adresse jeder Seite, an genau einer Stelle; dazu `REDIRECTS` für frühere Adressen |
| `src/portal/nav.ts` | Das Menü: Gruppen, Reihenfolge, Einträge |
| `src/portal/checklistNav.ts` | Wo eine Checkliste aus der Datenbank im Menü erscheint |
| `src/portal/PortalProvider.tsx` | Lädt nach der Anmeldung Profil, Stufe, heutiges Datum, Grenzwerte, gesperrte Inhalte, Checklisten |
| `src/pages/` | Die Seiten; `auth/` für Anmeldung und Registrierung, `billing/` für Plan und Kauf |
| `src/components/` | Gemeinsame Bausteine: Checkliste, Vorlagen, Markdown, Stufen-Hinweis, externer Link, Schalter |
| `src/tracker/`, `src/overview/`, `src/billing/`, `src/lib/` | Logik als reine Funktionen, mit Tests (Vitest) |
| `src/i18n/en.json` | Alle Bedientexte; Einzahl und Mehrzahl über i18next |
| `src/styles/` | `portal.css` ist das CSS des Prototyps mit Farben und Schriften als Variablen, `app.css` die Ergänzungen |

## Grundsätze

- **Die Datenbank entscheidet, was sichtbar ist.** Das Frontend fragt die Stufe nicht selbst ab, sondern zeigt, was die Zugriffsregeln liefern. Für Gesperrtes kommt der Stufen-Hinweis aus `locked_content()`. Ein Menüeintrag trägt ein Schloss, wenn die Stufe dort nichts sieht und es gesperrte Einträge gibt.
- **Inhalte kommen aus der Datenbank:** Checklisten, Leitfäden, Vorlagen, Formulierungen, Glossar, Listen, Preise und die Wortlaute der Zustimmungen. Im Code stehen nur Bedientexte und der Rahmen der Seiten.
- **Adressen stehen nur in `src/routes.ts`.** Im übrigen Code steht keine Adresse als Text. Ändert sich eine Adresse, kommt die alte in `REDIRECTS` und leitet weiter, samt Platzhaltern, Abfrage und Anker. Außerhalb des Frontends stehen Portal-Adressen in `supabase/functions/create-checkout` (Rückkehr von Stripe), `supabase/functions/newsletter` (Bestätigungslink) und in den Mailtexten.
- **Das Menü steht nur in `src/portal/nav.ts`.** Die Beschriftung kommt aus den Texten (`nav.items.*`, `nav.groups.*`). Adresse und Platz im Menü sind unabhängig voneinander.
- **"Heute" kommt aus der Datenbank** (`portal_today()`, deutsche Zeit), nicht aus der Uhr des Browsers.
- **Nutzereingaben werden nie als HTML ausgegeben.** Links aus Daten werden nur als http- oder https-Adresse zu einem Link.
- **Nach jeder Migration** `npm run db:types` ausführen und die erzeugte Datei mit einchecken.

## Was ohne Code-Änderung erscheint

| Neu in der Datenbank | Wirkung im Portal |
| --- | --- |
| aktive Checkliste | erscheint an der Stelle, die `area` vorgibt: als Reiter auf einer Checklisten-Seite oder als eigener Menüeintrag unter `/checklists/<key>` (Tabelle in `datenmodell.md`) |
| aktive Vorlage | erscheint auf der Seite ihres Bereichs (`templates.area`) |
| veröffentlichter Leitfaden | erscheint auf der Seite seines Bereichs; mit höherer Mindeststufe als Titel mit Schloss |
| veröffentlichter Job, erster Leitfaden oder erste Vorlage zu "Interview and guide" | der Menüeintrag erscheint; ohne Inhalt ist er ausgeblendet |
| geänderter Preis | Preiskarten, Stufenwahl ("from €X / month") und der Satz zur Ersparnis rechnen neu |
| neue aktive Fassung eines Wortlauts | wird bei Kauf, Registrierung und in "Emails from us" angezeigt und festgehalten |

Die Aufgaben der Übersicht (CV, LinkedIn, XING, Visa) sind dagegen an `task_key` gebunden; eine neue Checkliste erzeugt keine neue Aufgabe (im Fahrplan für später vorgemerkt).

## Hinweise in Leitfäden

Ein Zitat im Markdown (`> ...`) erscheint als Hinweis mit Linie links. Der gefüllte Kasten ist nach dem Styleguide wichtigen Hinweisen vorbehalten, höchstens einmal pro Seite: Er entsteht nur, wenn das Zitat mit der Zeile `[!IMPORTANT]` beginnt, und nur beim ersten solchen Zitat eines Textes. Ein Absatz, der nur aus kursivem Text besteht, ist die Fundstellenzeile. Code: `src/lib/markdownNotes.ts`.

## Gestaltung

- Kleinste Schriftgröße 14 px (Styleguide); der Prototyp hat stellenweise 11 bis 13 px.
- Seitenleiste: etwa 28 px Abstand vor jeder Rubrik, darüber eine Linie in Grau Linie mit 24 px Einzug, 2 px zwischen den Punkten einer Gruppe, nicht einklappbar. Die Regeln hängen an den Klassen `side`, `navgroup`, `navgroup line`, `grp`, `nav` und gelten für den Admin-Bereich, sobald er dieselben Klassen nutzt.
- Externe Links öffnen im neuen Tab, mit Pfeil und dem Hinweis "opens in a new tab" für Screenreader.

## Abläufe mit Besonderheiten

- **Links aus Mails** führen auf `/auth/callback` (optional mit `?next=`). Abgelaufene Links bekommen eine eigene Meldung.
- **E-Mail-Änderung:** Alte und neue Adresse bestätigen. Nach dem ersten der beiden Links zeigt das Portal "One more confirmation needed". Wer zwischendurch das Passwort ändert, macht die Links ungültig (Verhalten von Supabase Auth).
- **"Send the link again"** bei der Registrierung: Die Grenze setzt die Datenbank durch. Supabase Auth meldet die Ablehnung nur als allgemeinen Fehler; die Seite zählt deshalb im Browser mit und liest die Grenze aus `registration_info()`.
- **Kauf:** Die Bestellübersicht zeigt Beginn, Ablauf und Umrechnung aus `preview_pass()`. Nach der Rückkehr von Stripe (`/billing/success`) wartet die Seite auf die Freischaltung durch den Webhook.
- **Newsletter:** Die Bestätigungsmail geht hinaus, sobald das Konto bestätigt ist und das Portal zum ersten Mal lädt; der Server verschickt sie nur einmal.
- **Stufenwahl nach der Registrierung** (`/welcome`): nur bei eingeschaltetem Verkauf, einmal, und nur für Konten auf Free.

## Entscheidungen von Patrick (5. Oktober 2026)

- Rechnungen: keine Links im Portal. "Plan and billing" zeigt die Käufe mit Datum, Pass und Betrag und den Satz, dass die Rechnungen per Mail von Stripe kamen.
- Visa-Checkliste nur Chancenkarte, ohne Reiter; Reiter erscheinen von selbst mit einer zweiten Checkliste.
- Sprachumschalter und "Portal language" sind ausgeblendet, bis es die deutsche Fassung gibt.
- Stufenwahl: nur die Stufe, "from €X / month" mit dem Monatspreis des 3-Monats-Passes, Ersparnis aus den Preisen berechnet; die Laufzeit wird auf der Bestellübersicht gewählt.
- Listen: Zähler ("48 companies", "12 of 48 companies") und "Clear filters" ohne Treffer; gezählt wird nur, was die Stufe sieht.
- Registrierung: kein zweites E-Mail-Feld; Hinweis bei Tippfehlern in verbreiteten Domains; "Wrong address? Change it" mit vorausgefülltem Formular, ohne Passwort.
- CV-Seite: gesperrte Starter-Leitfäden als Titel mit Schloss und "Included from Starter", Klick führt zu "Plan and billing".
- "Emails from us": An den Schaltern für Newsletter und Talentpool steht der versionierte Wortlaut aus der Datenbank.

## Abweichungen vom Prototyp

**Nach Umfang oder Datenmodell:** Unternehmen nur in Plus (auch in der Preiskarte), Nachname bei der Registrierung, Spalte "Website" bei den Personaldienstleistern, Schalter für Erinnerungsmails, Konto löschen mit Passwort, "Jobs for internationals" erst mit dem ersten veröffentlichten Job, ohne Verkauf keine Stufenwahl und auf "Plan" der Pilot-Hinweis.

**Von Patrick bestätigt, wie gebaut:**

- Texte zu Jobs sagen nicht "updated daily"; in Phase 1 werden Jobs von Hand gepflegt.
- "pass" statt "subscription" beim Löschen des Kontos; Bewerbung löschen braucht einen zweiten Klick.
- Übersicht: Der Hinweis auf neue Jobs erscheint nur, wenn es welche gibt.
- Jobbörsen: Im Filter stehen die Kategorienamen aus der Datenbank; die allgemeinen Börsen stehen zuerst.
- Tracker: "Add application" ist an der Free-Grenze gesperrt; die Dublettenwarnung steht im Formular mit "Save anyway"; der Link zur Anzeige wird geprüft. Der Verlauf wird als fertiger englischer Satz gespeichert (`application_events.text`).
- "Plan and billing": bei "Pass" kein Preis; Zeile "Next pass" für vorgemerkte Pässe; Hinweis nach abgebrochener Zahlung.
- Bestellübersicht: Der Upgrade-Hinweis nennt keine Resttage, weil auch vorgemerkte Pässe einfließen.
- Seitenleiste: Höhe der Menüpunkte und Abstände wie gebaut, nicht wie im Prototyp.

## Bekannte Lücken

- Die Verweise auf Impressum, Datenschutzerklärung, Nutzungsbedingungen, Hubs der Website und die Buchung des Immigration Call zeigen vorläufig auf `https://onboard-germany.de/` (`src/lib/links.ts`).
- Die Mails von Supabase Auth gehen technisch als HTML hinaus (nur Absätze und Link). Echter reiner Text bräuchte einen eigenen Versand über einen Send-Email-Hook.
- Der Schritt für den zweiten Faktor bei der Anmeldung des Admins fehlt; bis dahin verhält sich ein Admin-Konto im Portal wie ein Kandidat.
- Das Aussehen wurde in Schritt 6 nur stichprobenhaft am Bildschirm geprüft (Login, Navigation, mobile Leiste, Seitenleiste); die übrigen Seiten über Inhalt und Verhalten. Der Blick auf jede Seite, auch mobil, gehört zu Schritt 8.
- `npm run portal` ist gestartet und geprüft; das Beenden mit Strg+C hat Patrick noch nicht bestätigt.
