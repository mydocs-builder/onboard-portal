# Kandidatenportal: Datenmodell Phase 1

Oct 4, 2026 · @Patrick

## Grundsätze

Das Modell bildet den freigegebenen Umfang von Phase 1 ab; spätere Erweiterungen kommen als neue Tabellen oder Felder dazu, ohne Bestehendes umzubauen.

- **Inhalte als Daten.** Checklistenpunkte, Leitfäden, Formulierungen, Glossar, Listen, Stufenzuordnung und Preise liegen in Tabellen, nicht im Code.
- **Ein Modell für alle Checklisten.** CV, LinkedIn, XING, Visum und "Job found, what now?" nutzen dieselben Tabellen.
- **Feste IDs.** Jeder Eintrag hat eine dauerhafte ID; Fortschritt und Verweise hängen daran, nie an der Position in einer Liste.
- **Mindeststufe am Inhalt.** Jeder freischaltbare Inhalt trägt ein Feld `min_plan` (free, starter, plus). Die Datenbank entscheidet über die Sichtbarkeit, nicht das Frontend.
- **Alles verboten, was nicht erlaubt ist.** Jede Tabelle hat Zugriffsregeln; ohne passende Regel sieht niemand etwas.
- **Verlauf wird nicht überschrieben.** Planphasen, Bewerbungsverlauf und Admin-Änderungen sind eigene Einträge für Auswertung und Nachvollziehbarkeit.
- **Technische Felder überall:** `id` (UUID, außer wo vermerkt), `created_at`, `updated_at`. Sie werden unten nicht einzeln aufgeführt.
- **Namen:** Tabellen und Felder englisch, wie im Code üblich; Beschreibungen deutsch.

## Übersicht

26 Tabellen in sieben Bereichen, dazu ein Speicherbereich für Vorlagendateien.

| Bereich | Tabellen |
| --- | --- |
| Konten | `profiles` |
| Zugang und Bezahlung | `plan_access`, `plan_periods`, `stripe_events`, `launch_settings`, `prices`, `audit_log`, `consent_texts`, `purchase_consents` |
| Bewerbungen | `applications`, `application_events` |
| Checklisten | `checklists`, `checklist_items`, `checklist_progress`, `dismissed_tasks` |
| Inhalte | `articles`, `templates`, `phrases`, `glossary_terms` |
| Listen | `companies`, `jobs`, `agencies`, `job_boards`, `import_batches` |
| Betrieb | `email_log`, `app_settings` |

Die Anmeldedaten (E-Mail, Passwort, Bestätigung, letzter Login) verwaltet Supabase selbst in seinem eigenen Bereich `auth.users`; `profiles` ergänzt sie um die Portal-Angaben. Vorlagendateien (DOCX, PDF) liegen im Speicherbereich `templates` von Supabase.

## Konten und Rollen

Jedes Konto in `auth.users` bekommt beim Anlegen automatisch genau einen Eintrag in `profiles`.

**profiles**, Primärschlüssel `user_id` (zugleich ID in `auth.users`)

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| first\_name, last\_name | Text | Pflicht, aus Registrierung oder Admin-Anlage |
| role | candidate, admin | Standard candidate; admin nur per Hand in der Datenbank |
| field | it, engineering, nursing\_care, healthcare, logistics, leer | Berufsfeld, steuert Filter und Fachvokabular |
| language | en, de | Portalsprache, zum Start nur en |
| first\_login\_at | Zeitpunkt | leer bis zum ersten Login; steuert "Welcome aboard" |
| reminders\_enabled | ja/nein | Erinnerungsmails, Standard ja |
| invited\_by\_admin | ja/nein | von Patrick angelegt und eingeladen |
| blocked\_at | Zeitpunkt | gesetzt, wenn ein Konto gesperrt ist |
| registration\_source | Text | z. B. website, admin, navigator; für die Auswertung |
| confirmation\_resends | Zahl | wie oft der Bestätigungslink erneut verschickt wurde; Standard 0, nur vom Server geschrieben |

- **E-Mail und Passwort** liegen nur in `auth.users`. Eine E-Mail-Änderung läuft über den Bestätigungsablauf von Supabase.
- **Unbestätigte Konten:** Ein selbst registriertes Konto, dessen E-Mail-Adresse nach unconfirmed\_account\_days Tagen (Standard 7, deutsche Zeit) nicht bestätigt ist, löscht die tägliche Funktion samt Profil. Vom Admin angelegte Konten mit Status "Eingeladen" sind ausgenommen. Weil ein solches Konto nie angemeldet war, werden auch seine Planphasen (Pilotphase) gelöscht und nicht ohne Nutzerbezug aufbewahrt; sonst zählten sie in der Auswertung als kostenlose Phase ohne Buchung. Je gelöschtem Konto bleibt ein Eintrag im `audit_log` ohne Nutzerbezug, ohne Name und Adresse, nur mit dem Tag der Registrierung; so bleibt zählbar, wie viele Registrierungen nie bestätigt wurden.
- **Bestätigungslink erneut senden:** höchstens confirmation\_resend\_limit Mal je Konto (Standard 3). Ein Trigger auf `auth.users` zählt jeden weiteren Versand in confirmation\_resends mit und weist ihn danach mit confirmation\_resend\_limit\_reached ab; das gilt für jeden Weg, auch an der Oberfläche vorbei. Der erste Versand bei der Registrierung zählt nicht, bestätigte und eingeladene Konten sind nicht begrenzt. Eine erneute Registrierung mit derselben, noch unbestätigten Adresse verschickt den Link ebenfalls und zählt mit. Supabase Auth gibt die Ablehnung nur als allgemeinen Fehler weiter; das Portal zählt deshalb im Browser mit und zeigt den Hinweis, sobald die Grenze erreicht ist. Die Grenze liest es aus `registration_info()`, sie steht nicht im Code.
- **Status "Eingeladen"** ergibt sich daraus, dass `first_login_at` leer und `invited_by_admin` gesetzt ist; kein eigenes Feld.
- **Konto löschen** läuft über die Edge Function `delete-account`: Der angemeldete Nutzer bestätigt mit seinem Passwort, die Funktion prüft es mit einer eigenen Anmeldung und löscht dann das Konto mit dem Service-Role-Schlüssel. Das entfernt `auth.users` und über die Verknüpfung alle Daten des Nutzers in diesem Modell. Zwei Ausnahmen: `purchase_consents` behält den Nachweis der Zustimmung ohne Nutzerbezug bis zum Ende der Aufbewahrungsfrist, und `plan_periods` behält alle Phasen (Pass, Pilot, manuell) für die Auswertung; die Nutzer-ID wird durch eine zufällige Kennung je gelöschtem Konto ersetzt, ohne Zuordnungstabelle. reason bleibt, stripe\_session\_id wird entfernt.

## Zugang, Pässe und Startphase

`plan_access` sagt, was ein Nutzer heute darf; `plan_periods` hält fest, wie es dazu kam.

**plan\_access**, ein Eintrag je Nutzer, Primärschlüssel `user_id`

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| plan | free, starter, plus | aktuell gewährte Stufe |
| source | none, pass, manual | Herkunft: gekaufter Pass oder Freischaltung |
| pass\_length | month, quarter, leer | bei Pässen |
| valid\_until | Datum | letzter Tag des Zugangs |
| manual\_reason | Text | z. B. Pilotphase, Komplett-Begleitung |
| stripe\_customer\_id | Text | Kennung bei Stripe, sobald einmal gekauft |

**plan\_periods**, jede Phase mit Zugang als eigener Eintrag, auch künftige

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| user\_id | Verweis, leerbar | wird beim Löschen des Kontos geleert |
| deleted\_account\_id | UUID, leer | zufällige Kennung je gelöschtem Konto, tritt beim Löschen an die Stelle von user\_id; ohne Zuordnungstabelle |
| plan, source, pass\_length | wie oben | source zusätzlich pilot |
| starts\_on, ends\_on | Datum | Laufzeit; liegt starts\_on in der Zukunft, ist es ein vorgemerkter Pass |
| reason, promo\_code | Text | Grund der Freischaltung, verwendeter Gutschein |
| amount\_cents, credit\_days | Zahl | bezahlter Betrag; umgerechnete Tage beim Upgrade |
| stripe\_session\_id | Text, eindeutig | verhindert doppelte Freischaltung |
| granted\_by | Text | stripe, system oder Admin-Name |
| superseded\_by | Verweis, leer | Planphase des Upgrades, das diesen vorgemerkten Pass ersetzt hat |
| upgraded\_from | Stufe, leer | bei einem Upgrade die bisherige Stufe des Zugangs; die Kaufbestätigung nennt sie |
| refunded\_at, refunded\_cents | Zeitpunkt, Zahl, leer | in Stripe erstatteter Betrag; trägt der tägliche Abgleich ein |

**Freischaltung eines bezahlten Passes** läuft über die Datenbankfunktion `grant_pass(user, plan, length, stripe_session_id, amount_cents, promo_code, stripe_customer_id)`. Nur der Server darf sie aufrufen (der Stripe-Webhook), weder Kandidat noch Admin. Sie schreibt Planphase, Zugang und Änderungsprotokoll in einer Transaktion:

- **Kein laufender Zugang:** Beginn heute. Ein 1-Monats-Pass läuft 30 Tage, ein 3-Monats-Pass 90 Tage (`pass_days`).
- **Gleiche oder niedrigere Stufe, auch während einer kostenlosen Freischaltung:** Der Pass hängt sich an das späteste Ende an, auch hinter bereits vorgemerkte Pässe; ersetzte Phasen zählen dabei nicht. `plan_access` bleibt unverändert; die tägliche Funktion stellt am Beginn um.
- **Upgrade:** gilt sofort. Umgerechnet wird der gesamte bezahlte Restwert: die Resttage des laufenden Passes einschließlich des heutigen Tages und die volle Laufzeit aller vorgemerkten Pässe niedrigerer Stufe, jeweils zum aktiven Listenpreis pro Tag ihrer eigenen Stufe und Länge. Die Summe wird durch den Tagespreis des neuen Passes geteilt, einmal abgerundet und in credit\_days vermerkt. Danach gibt es eine durchgehende Laufzeit der höheren Stufe. Kostenlose Freischaltungen werden nicht umgerechnet. Die bisherige Stufe des Zugangs steht in upgraded\_from, auch wenn nichts umgerechnet wurde.
- **Ersetzte Pässe:** Die umgerechneten vorgemerkten Pässe werden nicht gelöscht, sondern über superseded\_by als ersetzt markiert und bleiben für die Auswertung erhalten. Die tägliche Funktion startet ersetzte Phasen nicht. Der Pass, der beim Upgrade gerade lief, bleibt unmarkiert.
- **Dieselbe Stripe-Session** schaltet nur einmal frei; ein zweiter Aufruf liefert das erste Ergebnis zurück.
- **Eine Rechnung, zwei Wege:** Beginn, Ende und Umrechnung berechnet allein die Datenbankfunktion `pass_terms(user, plan, length)`; sie ändert nichts. `grant_pass` schaltet mit ihrem Ergebnis frei, `preview_pass(plan, length)` zeigt es dem angemeldeten Kandidaten vorab für die Bestellübersicht, nur für das eigene Konto: Beginn, Ablaufdatum, ob es ein Upgrade ist, umgerechnete Tage, laufende Stufe und deren Quelle, Preis. `pass_terms` selbst darf nur der Server aufrufen. Gesperrte Konten und Pässe ohne aktiven Preis erhalten keine Vorschau. Die Vorschau gilt für den Tag der Anzeige; bezahlt der Kandidat erst an einem späteren Tag, rechnet `grant_pass` mit dem dann gültigen Stand.

**Zustimmung beim Kauf** (sofortiger Beginn, Erlöschen des Widerrufsrechts)

Ohne bestätigte Zustimmung zur aktiven Fassung des Wortlauts erzeugt `create-checkout` keine Bezahlseite. Pro Kauf werden Zeitpunkt, Fassung und Planphase festgehalten; der Wortlaut selbst steht versioniert in der Datenbank, damit nachvollziehbar bleibt, welcher Text galt.

**consent\_texts**: version (Versionskennung, etwa 2026-10-05), language, body, active. Je Sprache ist genau eine Fassung aktiv. Eine Fassung wird nie geändert oder gelöscht, für keine Rolle; nur active lässt sich umschalten. Ein neuer Wortlaut ist ein neuer Eintrag.

**purchase\_consents**, eine Zustimmung je begonnenem Kauf

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| user\_id | Verweis, leerbar | wer zugestimmt hat; wird beim Löschen des Kontos geleert |
| consent\_text\_id | Verweis | die Fassung des Wortlauts, der zugestimmt wurde |
| consented\_at | Zeitpunkt | Zeit des Servers beim Aufruf von `create-checkout` |
| plan, pass\_length | wie oben | der Pass, für den die Zustimmung gilt |
| stripe\_session\_id | Text, eindeutig | die dazu erzeugte Bezahlseite |
| plan\_period\_id | Verweis, leer | Bezug zur Planphase; wird gesetzt, sobald die Zahlung den Pass freischaltet. Bleibt er leer, wurde der Kauf nicht abgeschlossen |

- **Ablauf:** Das Portal zeigt die aktive Fassung und schickt deren Versionskennung als consent\_version an `create-checkout`. Die Datenbankfunktion `begin_checkout` prüft Konto, Verkauf, Preis und Zustimmung und legt die Zustimmung an; fehlt die Angabe oder ist sie veraltet, scheitert der Kauf mit consent\_required, bevor Stripe aufgerufen wird. Danach vermerkt `attach_checkout_session` die Stripe-Session. Entsteht später die Planphase zu dieser Session, wird sie automatisch an der Zustimmung eingetragen.
- **Ohne aktiven Wortlaut** lässt sich nichts kaufen. Die Migrationen legen keinen Text an; der rechtlich geprüfte Wortlaut wird vor dem Verkaufsstart als Fassung eingetragen.
- **Kontolöschung:** Der Nachweis der Zustimmung bleibt erhalten. Entfernt wird nur der Nutzerbezug; der Verweis auf die Planphase und die Stripe-Session bleiben.
- **Aufbewahrung:** bis zum Ende des dritten Kalenderjahres nach dem Kauf (maßgeblich ist consented\_at in deutscher Zeit). Danach löscht die tägliche Funktion den Eintrag. Die Frist steht als consent\_retention\_years in `app_settings` (Standard 3). **Vermerk: Die Frist wird mit den Rechtstexten noch geprüft.**
- **Nicht abgeschlossene Käufe:** Zustimmungen ohne Planphase (Bezahlseite erzeugt, nicht bezahlt) löscht die tägliche Funktion schon nach 30 Tagen. Die Frist steht als abandoned\_consent\_days in `app_settings` (Standard 30). Sobald eine Zustimmung eine Planphase hat, gilt für sie nur noch die lange Frist.
- **Freischaltung ohne Zustimmung:** `grant_pass` verlangt keine Zustimmung, damit eine bezahlte Zahlung nie ohne Pass bleibt. Die Sperre sitzt vor der Bezahlseite.

**prices**: plan, pass\_length, amount\_cents, stripe\_price\_id, active. Die vier Preise der Pässe; das Portal liest Preise und Stripe-Kennungen von hier, nicht aus dem Code.

**launch\_settings**, genau ein Eintrag

| Feld | Werte |
| --- | --- |
| registration\_mode | open, invite |
| invite\_code | Text |
| new\_account\_grant | none, starter, plus |
| grant\_until | Datum |
| sales\_enabled | ja/nein |

**stripe\_events**: id (Ereignis-ID von Stripe, Primärschlüssel), type, received\_at. Jede Meldung wird genau einmal verarbeitet.

**audit\_log**: user\_id (leer bei Einträgen ohne Bezug zu einem Nutzerkonto, etwa endgültig gelöschten Listeneinträgen), actor (stripe, system oder Admin-Name), text, Zeitpunkt. Das Änderungsprotokoll im Admin-Bereich; Einträge werden nie geändert, auch nicht vom Server.

## Bewerbungen

Jede Bewerbung gehört genau einem Nutzer und trägt ihren nächsten Schritt selbst; der Verlauf liegt daneben.

**applications**

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| user\_id | Verweis | Besitzer |
| company, position | Text | Pflicht ist nur company |
| location, job\_url | Text | Stadt; Link zur Anzeige |
| contact | Text | optional, Name und Funktion |
| status | planned, applied, interview, offer, accepted, rejected, no\_response, withdrawn |  |
| applied\_on | Datum | leer bei planned |
| next\_type | apply, follow\_up, interview, documents, decision, offer\_reply, none | Art des nächsten Schritts |
| next\_on | Datum | fällig am |
| notes | Text | Freitext, mit Hinweis im Formular |
| source | job\_board, company\_list, job\_list, agency, direct, referral, other | Herkunft der Bewerbung |
| job\_id, company\_id | Verweis, leerbar | wenn aus einer Portalliste übernommen |
| reminded\_for | Datum | Termin, für den zuletzt erinnert wurde; verhindert doppelte Mails |

**application\_events**: application\_id, user\_id, happened\_on, text. Ein Eintrag je Ereignis, etwa "Applied via StepStone" oder "Invited to an interview on 10 Oct". Wird beim Löschen der Bewerbung mitgelöscht.

**Vorschläge beim Statuswechsel** setzt das Frontend, nicht die Datenbank; der Nutzer kann sie ändern.

| Status | nächster Schritt | in Tagen |
| --- | --- | --- |
| planned | apply | 3 |
| applied | follow\_up | 7 |
| interview | interview | 7 |
| offer | offer\_reply | 7 |
| accepted, rejected, no\_response, withdrawn | none | - |

Die Antwortmöglichkeiten bei fälligen Schritten ("What happened?") sind ebenfalls Frontend-Logik; die Datenbank speichert nur Ergebnis und Verlaufseintrag.

## Checklisten

Fünf Checklisten in Phase 1, alle im selben Modell; eine neue Checkliste, etwa Pflege oder Familiennachzug, ist nur ein neuer Eintrag.

**checklists**: key (cv, linkedin, xing, visa\_chancenkarte, after\_offer), title, area (der Menüpunkt, in dem sie erscheint), legal\_note (Fundstellenzeile, etwa bei der Visa-Checkliste), sort, active.

**Wo eine Checkliste im Portal erscheint,** bestimmt allein ihr Feld area. Eine neu angelegte, aktive Checkliste braucht keine Änderung am Code:

| area | Wirkung |
| --- | --- |
| cv, linkedin, checklist, arrival | erscheint auf dieser Seite; hat der Menüpunkt mehrere aktive Checklisten, als Reiter |
| ein anderer Menüeintrag, z. B. german oder contract | eigener Menüeintrag direkt hinter diesem Eintrag, mit dem Titel der Checkliste |
| eine Gruppe des Menüs: start, search, preparation, found | eigener Menüeintrag am Ende dieser Gruppe |
| alles andere | eigener Menüeintrag am Ende der Gruppe "Preparation", damit keine aktive Checkliste unsichtbar bleibt |

Mehrere eigene Einträge an derselben Stelle stehen in der Reihenfolge von sort. Die Kennungen der Menüeinträge und Gruppen stehen im Frontend in `src/portal/nav.ts`, die Regel in `src/portal/checklistNav.ts`. Die Aufgaben der Übersicht (CV, LinkedIn, XING, Visa) sind davon unabhängig und an task\_key gebunden; eine neue Checkliste erzeugt keine neue Aufgabe.

**checklist\_items**

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| checklist\_id | Verweis |  |
| section | Text | Abschnitt, etwa Basics, Content, Visibility and network |
| title, description | Text |  |
| example | Text | Ausfüllhilfe mit "Copy text", optional |
| link\_label, link\_target | Text | Verweis, etwa auf eine Website-Seite oder einen Portalbereich |
| min\_plan | free, starter, plus | ab welcher Stufe sichtbar |
| sort, active |  | inaktive Punkte bleiben für bestehenden Fortschritt erhalten |

**checklist\_progress**: user\_id, item\_id, done\_at. Ein Eintrag je abgehaktem Punkt, Entfernen des Hakens löscht ihn.

**dismissed\_tasks**: user\_id, task\_key (cv, linkedin, xing, visa), dismissed\_at. Merkt sich "Mark as done" auf der Übersicht; "Reopen" löscht den Eintrag.

**Abgeleitet, nicht gespeichert:** Fortschritt in Prozent, "erledigt" einer Aufgabe und die nächsten Schritte der Übersicht werden beim Laden aus diesen Tabellen berechnet. In Free zählt nur, was die Stufe sehen darf.

## Inhalte

Alle redaktionellen Inhalte des Portals, mit Sprache und Mindeststufe je Eintrag; die deutsche Fassung kommt später als zusätzliche Einträge dazu.

| Tabelle | Felder | Zweck |
| --- | --- | --- |
| `articles` | slug, area (cv, linkedin, interview, guide, agencies, contract), title, lead, body (Markdown), min\_plan, language, sort, published | Leitfäden und Guide-Kapitel |
| `templates` | title, description, format (docx, pdf, xlsx), file\_path, area (wie bei articles, Standard cv), min\_plan, sort, active | Vorlagen zum Download; Dateien im Speicherbereich |
| `phrases` | category (cover\_letter, phone, interview, vocabulary), field (leer oder Berufsfeld), german, english, usage, min\_plan, sort | German for the job |
| `glossary_terms` | term\_de, term\_en, what, look\_for, min\_plan (Standard starter), sort | Arbeitsvertrag erklärt |

- **body in Markdown:** Überschriften, Absätze, Listen und Hinweise lassen sich in der Pflegemaske schreiben, ohne HTML. Das Frontend gibt Markdown sicher aus, ohne fremden Code auszuführen.
- **Vorlagen je Bereich:** Eine Vorlage erscheint auf der Seite ihres Bereichs: cv auf "CV and cover letter", linkedin auf "LinkedIn and XING", interview und guide auf "Interview and guide", agencies auf "Recruitment agencies", contract auf "Employment contract". Eine neue Vorlage braucht keine Änderung am Code. Erlaubte Formate sind docx, pdf und xlsx; ein weiteres Format oder ein weiterer Bereich ist eine kleine Migration.
- **Vorlagendateien** sind nur für berechtigte Stufen abrufbar. Der Download läuft über einen kurzlebigen Link, den die Datenbank nur bei passendem Plan ausstellt.
- **Sprache:** articles, templates, phrases und glossary\_terms tragen ein Feld language (en, de), Standard en; ein deutscher Eintrag ist ein eigener Eintrag. Checklisten tragen keine Sprache: Ihre Texte sind in Phase 1 Englisch, die deutsche Fassung kommt später als Übersetzungstabelle je Punkt, damit Fortschritt und IDs beim Sprachwechsel erhalten bleiben.
- **Gespiegelte Website-Inhalte** (Familiennachzug usw.) sind für später vorgesehen; sie würden nicht hier gespeichert, sondern über die Schnittstelle von WordPress gelesen.

## Listen und Import

Vier Listen mit gemeinsamem Muster: Entwurf oder veröffentlicht, Quelle und Prüfdatum, Herkunft aus einem Import.

**Gemeinsame Felder aller vier Listen:** status (draft, published, archived), source, checked\_at, import\_batch\_id, min\_plan.

| Tabelle | Eigene Felder | Besonderheit |
| --- | --- | --- |
| `companies` | name, website, domain (eindeutig), industry, employer\_type, region, signals (Liste) | Dublettenerkennung über domain |
| `jobs` | title, company\_name, company\_id (leerbar), location, industry, employer\_type, signals, url, posted\_on, expires\_on | ohne Ablaufdatum gilt posted\_on plus 30 Tage |
| `agencies` | name, website, field, model (direct, temp, both), recruits\_abroad, region, specialised | specialised steuert Starter gegenüber Plus |
| `job_boards` | name, website, category, focus |  |

**Feste Wertelisten**

- industry: it, engineering, nursing\_care, healthcare, logistics; erweiterbar
- employer\_type: hospital, care\_home, outpatient, nur bei nursing\_care
- signals: english\_ads, relocation\_support, visa\_support, recognition\_partnership

Die Wertelisten liegen als eigene Typen in der Datenbank. Eine neue Branche ist eine kleine Migration, damit Import und Filter immer dieselben Werte kennen.

**import\_batches**: list (companies, jobs, agencies, job\_boards), file\_name, rows\_total, rows\_ok, rows\_failed, errors (Liste mit Zeile und Grund), created\_by, created\_at. Jeder Import erzeugt einen Eintrag; seine Zeilen landen als draft und werden über die Batch-ID gemeinsam veröffentlicht oder verworfen.

**Phase 2:** n8n schreibt später in dieselben Tabellen, mit source = n8n und status = draft für neue Unternehmen. Am Modell ändert sich dadurch nichts. Vorgemerkt, noch nicht gebaut: n8n bekommt dafür eine eigene, eingeschränkte Datenbankrolle (nur die Listentabellen und `import_batches`), nicht den Service-Role-Schlüssel.

## Zugriffsregeln

Drei Rollen: Kandidat (angemeldet, role = candidate), Admin (role = admin, zusätzlich Zwei-Faktor-Anmeldung) und Server (die Funktionen mit dem Service-Role-Schlüssel). Nicht angemeldete Besucher sehen nichts außer Login und Registrierung.

| Tabelle | Kandidat | Admin | Server |
| --- | --- | --- | --- |
| `profiles` | eigenen lesen; Name, Feld, Sprache, Erinnerungen ändern | alle lesen, sperren | alles |
| `plan_access` | eigenen lesen | alle lesen, manuell ändern | alles |
| `plan_periods` | eigene lesen | alle lesen, manuelle Phasen anlegen | alles |
| `prices`, `launch_settings` | aktive Preise lesen; Startphase nur soweit für die Registrierung nötig | lesen und ändern | alles |
| `consent_texts` | aktive Fassung lesen | alle lesen, neue Fassung anlegen, aktiv schalten | alles außer Wortlaut ändern oder löschen |
| `purchase_consents` | eigene lesen | alle lesen | anlegen über `begin_checkout` |
| `stripe_events`, `email_log` | nichts | lesen | alles |
| `audit_log` | nichts | lesen | anlegen |
| `applications`, `application_events` | eigene lesen, anlegen, ändern, löschen | nichts | alles |
| `checklist_progress`, `dismissed_tasks` | eigene lesen, anlegen, löschen | nichts | alles |
| `checklists`, `checklist_items` | lesen, soweit min\_plan erfüllt | lesen und ändern | alles |
| `articles`, `templates`, `phrases`, `glossary_terms` | veröffentlichte lesen, soweit min\_plan erfüllt | lesen und ändern | alles |
| `companies`, `jobs`, `agencies`, `job_boards` | veröffentlichte lesen, soweit min\_plan erfüllt | lesen und ändern | alles |
| `import_batches` | nichts | lesen und anlegen | alles |

- **Admin sieht keine Bewerbungen und Checklisten-Fortschritte** der Nutzer, wie im Umfang festgelegt. Die Auswertungen bekommt er als Summen über eigene Datenbankfunktionen, nicht über Lesezugriff auf die Tabellen.
- **Plan und Pass schreibt nie der Kandidat.** Änderungen kommen nur über den Webhook, den Admin oder die tägliche Funktion.
- **Gesperrte Konten** verlieren jeden Lesezugriff, auch auf eigene Daten, bis die Sperre aufgehoben ist.
- **Gesperrte Inhalte** zeigt das Frontend als Stufen-Hinweis. Dafür liefert die Datenbank pro Bereich nur Titel und Mindeststufe, nicht den Inhalt.

**Ergänzungen nach dem ersten Bau (4. Oktober 2026)**

- `app_settings` ist nur für den Admin lesbar; Kandidaten erhalten über `public_settings()` nur free\_application\_limit und pass\_reminder\_days.
- Admin-Rechte gelten nur in einer Sitzung mit zweitem Faktor; ohne ihn verhält sich ein Admin-Konto wie ein Kandidat.
- Veröffentlichte Einträge in Listen werden archiviert, nicht gelöscht; Löschen nur bei Entwürfen. Die Sperre ist ein Trigger und gilt für jede Rolle, auch für Server-Funktionen mit Service-Role-Schlüssel.
- Statuswechsel in Listen: draft → published → archived und archived → published. Kein Weg führt zurück auf draft, ebenfalls für jede Rolle.
- Endgültig löschen kann nur der Admin über `purge_list_entry(list, id)`, und nur archivierte Einträge. Die Funktion schreibt einen Eintrag ins `audit_log` (ohne user\_id, actor = Name des Admins). Verweise in `applications` (company\_id, job\_id) werden dabei geleert; company und position der Bewerbung bleiben als Text.
- Checklistenpunkte mit Fortschritt werden deaktiviert, nicht gelöscht.
- Die Registrierung liest über `registration_info()` nur Modus, Verkaufsstatus, Pilot-Stichtag und confirmation\_resend\_limit (die Seite "Check your inbox" sieht ein Besucher vor der Anmeldung, und Besucher dürfen nur diese Funktion aufrufen); der Einladungscode wird in der Datenbank geprüft und ist nie lesbar.
- Gesperrte Inhalte liefert `locked_content()` mit Bereich, Titel und Mindeststufe (bei Checklistenpunkten ist der Bereich der Schlüssel der Checkliste, bei Leitfäden und Vorlagen ihr Feld area), bei Formulierungen, Glossar und Listen nur die Anzahl.
- "Heute" rechnet überall in deutscher Zeit.

**Funktionen der Datenbank im Überblick**

| Funktion | Zweck | Aufruf durch |
| --- | --- | --- |
| `portal_today()` | heutiges Datum in deutscher Zeit | angemeldete Nutzer, Server |
| `is_active_user()`, `is_admin()` | Rollenprüfung in den Zugriffsregeln (angemeldet und nicht gesperrt; Admin mit zweitem Faktor) | angemeldete Nutzer, Server |
| `effective_plan(user)` | gültige Stufe | angemeldete Nutzer (nur eigene), Admin, Server |
| `pass_days(length)`, `is_open_application(status)` | Laufzeit eines Passes in Tagen; ob eine Bewerbung noch läuft | angemeldete Nutzer, Server |
| `mark_first_login()` | setzt first\_login\_at beim ersten Login | angemeldete Nutzer |
| `registration_info()` | Startphase für die Registrierung | Besucher, angemeldete Nutzer |
| `public_settings()`, `locked_content()` | Grenzwerte und gesperrte Inhalte für das Frontend | angemeldete Nutzer |
| `purge_list_entry(list, id)` | archivierten Listeneintrag endgültig löschen | Admin |
| `begin_checkout(...)`, `attach_checkout_session(...)` | Kauf beginnen, Zustimmung festhalten | Server (`create-checkout`) |
| `pass_terms(user, plan, length)` | Laufzeit und Umrechnung eines neuen Passes berechnen, ohne etwas zu ändern | Server (über `grant_pass` und `preview_pass`) |
| `preview_pass(plan, length)` | Vorschau für die Bestellübersicht, nur eigenes Konto | angemeldete Nutzer |
| `grant_pass(...)` | bezahlten Pass freischalten | Server (Webhook, Abgleich) |
| `record_refund(...)` | Erstattung an der Planphase vermerken | Server (Abgleich) |
| `daily_run()`, `daily_mails()`, `daily_mail_sent(...)` | tägliche Funktion | Server (`daily`) |
| `call_daily_function()` | ruft die Edge Function `daily` auf | Zeitplan der Datenbank (pg\_cron) |

## Stufenlogik

Eine Datenbankfunktion `effective_plan(user)` liefert die gültige Stufe; alle Zugriffsregeln auf Inhalte und Listen fragen nur sie.

- **Regel:** Ist `valid_until` von heute oder später, gilt `plan`, sonst free. Gesperrte Konten gelten als ohne Zugang.
- **Vergleich:** free < starter < plus. Ein Eintrag mit min\_plan = starter ist für starter und plus sichtbar.
- **Free-Grenze im Tracker:** Bei effektiv free sind höchstens 10 Bewerbungen möglich. Die Datenbank prüft das beim Anlegen selbst, das Frontend zeigt nur den Hinweis. Bestehende Einträge über 10 bleiben nach Rückfall auf Free sichtbar und bearbeitbar.
- **Grenzwerte als Einstellung:** die 10 Bewerbungen, die 7 Tage für Erinnerungen vor Ablauf, die 30 Tage für Jobs ohne Ablaufdatum stehen in `app_settings`, nicht im Code.
- **Startphase bei Registrierung:** Steht `new_account_grant` auf plus und `grant_until` in der Zukunft, legt die Datenbank beim ersten Profil automatisch Zugang und Planphase mit Quelle pilot an.

**Zuordnung der Stufen in Phase 1** (als Daten, jederzeit änderbar)

| Bereich | Free | Starter | Plus |
| --- | --- | --- | --- |
| CV-Checkliste, Leitfaden deutscher CV, Visa-Checkliste, From offer to first day | ja | ja | ja |
| LinkedIn- und XING-Checkliste | Basics | voll | voll |
| Vorlagen, weitere Leitfäden, Interview, Guide, Vertragsglossar | - | ja | ja |
| German for the job | Anschreiben | voll | voll |
| Jobbörsen | allgemeine | alle | alle |
| Personaldienstleister | - | Generalisten | alle mit Filter |
| Unternehmen, Jobs | - | - | ja |
| Bewerbungen | bis 10 | unbegrenzt | unbegrenzt |

## Geplante Funktionen und Mails

Eine Funktion läuft täglich früh am Morgen und erledigt alles Zeitgesteuerte; jede Mail wird in `email_log` vermerkt, damit nichts doppelt verschickt wird.

| Aufgabe | Wirkung | Mail |
| --- | --- | --- |
| Vorgemerkte Pässe starten | Planphase mit starts\_on heute wird in `plan_access` übernommen | Bestätigung "Your pass is active" |
| Ablauf in 7 Tagen | nichts | Erinnerung mit Link zum Nachkauf, bei Pilot und Freischaltung angepasster Text |
| Abgelaufene Zugänge | plan auf free, Verlaufseintrag | "Your pass has ended" |
| Fällige nächste Schritte | nichts | eine gesammelte Mail je Nutzer mit allen Bewerbungen, deren next\_on heute ist; nur bei reminders\_enabled |
| Gesprächstermine morgen | nichts | Erinnerung am Vortag |
| Abgelaufene Jobs | status archived | - |
| Zustimmungen nach Ablauf der Aufbewahrungsfrist | Eintrag in `purchase_consents` wird gelöscht | - |
| Unbestätigte Konten nach Ablauf der Frist | selbst registriertes Konto wird samt Profil gelöscht, Eintrag im Änderungsprotokoll ohne Nutzerbezug | - |
| Abgleich mit Stripe | Zahlungen ohne Freischaltung finden und nachtragen | Hinweis an Patrick bei Abweichungen |

**Umsetzung der täglichen Funktion**

- **Aufteilung:** Die Datenbankfunktion `daily_run()` ändert den Zustand in einer Transaktion (Pässe starten, Zugänge beenden, Jobs archivieren, abgelaufene Zustimmungen und unbestätigte Konten löschen). `daily_mails()` leitet aus dem Zustand ab, welche Mails noch fehlen; `daily_mail_sent()` vermerkt eine verschickte Mail im `email_log`. Die Edge Function `daily` ruft sie auf, gleicht mit Stripe ab und verschickt die Mails. Alle drei Datenbankfunktionen darf nur der Server aufrufen, die Edge Function nur, wer den Service-Role-Schlüssel hat.
- **Zeitplan:** täglich 04:00 UTC über pg\_cron (05:00 bzw. 06:00 Uhr deutscher Zeit). Adresse und Schlüssel stehen je Umgebung im Vault (`daily_function_url`, `daily_function_key`); fehlen sie, passiert nichts.
- **Vorgemerkte Pässe:** Gestartet werden Planphasen, deren Beginn seit dem letzten Lauf erreicht ist (Merker `daily_last_run` in `app_settings`). Ein ausgefallener Lauf wird bis zu sieben Tage nachgeholt. Ersetzte Phasen (superseded\_by) starten nie. Planphasen mit früherem Beginn fasst der Lauf nicht an; ein nach Erstattung auf Free gesetztes Konto wird also nicht wieder freigeschaltet.
- **Abgelaufene Zugänge:** plan wird free, source none; valid\_until bleibt als Datum des Ablaufs stehen.
- **Mails sind wiederholbar:** Eine Mail wird erst nach erfolgreichem Versand vermerkt. Schlägt der Versand fehl, liefert der nächste Lauf sie wieder; Mails zu Pässen bis zu drei Tage lang.
- **Erinnerung vor Ablauf:** einmal je Enddatum, sobald das Ende höchstens pass\_reminder\_days entfernt ist, und nur, wenn kein weiterer Pass vorgemerkt ist.
- **Fällige Schritte:** nur laufende Bewerbungen (planned, applied, interview, offer). Nach dem Versand steht der Termin in reminded\_for.
- **Mail nach Ablauf** nennt die abgelaufene Stufe. Weil plan\_access dann schon auf free steht, kommen Stufe und Quelle aus der Planphase, die am Ablaufdatum endete; gibt es keine, bleibt der Text allgemein.
- **Kaufbestätigung:** Der Webhook verschickt sie direkt nach der Freischaltung, der tägliche Abgleich beim Nachtragen; je Freischaltung einmal, nicht bei doppelten Meldungen. Sie nennt Stufe, Laufzeit, Beginn und Ablaufdatum, beim Upgrade die umgerechneten Tage. Sie steht nicht im email\_log; ein Fehler beim Versand ändert nichts an der Freischaltung.
- **Gesperrte Konten** erhalten keine Mails.
- **Abgleich mit Stripe:** bezahlte Checkout-Sessions der letzten drei Tage, die das Portal erzeugt hat (mit Nutzer-ID). Fehlt die Freischaltung, wird sie über `grant_pass` nachgetragen, in der Reihenfolge der Käufe (älteste zuerst); der Pass beginnt dann am Tag des Nachtrags. Der Hinweis geht an admin\_notify\_email.
- **Erstattungen:** Der Abgleich liest die Erstattungen der letzten drei Tage aus Stripe. Eine vollständig erstattete Zahlung ohne Freischaltung wird nicht nachgetragen und einmal gemeldet (Merker in `stripe_events` mit der Kennung reconcile\_refund\_…). Gibt es die Planphase schon, vermerkt `record_refund` dort refunded\_at und refunded\_cents und schreibt einen Eintrag ins Änderungsprotokoll; maßgeblich ist der insgesamt erstattete Betrag der Zahlung. Der Zugang ändert sich dadurch nicht: Der Hinweis an den Admin nennt, ob er noch läuft, und der Admin setzt ihn per Hand auf Free. Auswertungen zählen erstattete Planphasen nicht als Verkauf.
- **Erstattete vorgemerkte Pässe:** Ein vollständig erstatteter Pass (refunded\_cents erreicht amount\_cents), der noch nicht begonnen hat, zählt nicht mehr als Pass. Die tägliche Funktion startet ihn nicht und verschickt keine Mail dazu, er verhindert die Erinnerung vor Ablauf nicht, und `grant_pass` hängt neue Pässe nicht hinter ihn und rechnet ihn beim Upgrade nicht um. Die Planphase bleibt mit dem Vermerk der Erstattung stehen. Eine Teilerstattung ändert nichts. Ein bereits laufender erstatteter Pass bleibt Sache des Admins.
- **Noch nicht gebaut:** das Löschen inaktiver Konten nach 24 Monaten mit Ankündigung 30 Tage vorher; dafür fehlt auch eine Mail-Art in email\_log.

**email\_log**: user\_id, kind (reminder\_next\_step, interview\_tomorrow, pass\_ending, pass\_ended, pass\_started), ref\_id, sent\_at, sent\_on (Tag des Versands in deutscher Zeit). Eindeutig je Nutzer, Art, Bezug und Tag.

**Mails außerhalb der täglichen Funktion** verschickt Supabase selbst über rapidmail: Bestätigung der Registrierung, Einladung durch den Admin, Passwort zurücksetzen, E-Mail-Änderung. Die Kaufbestätigung mit Ablaufdatum verschickt der Webhook direkt nach der Zahlung, die Rechnung kommt von Stripe.

**app\_settings**: key, value. Grenzwerte und Texteinstellungen, etwa free\_application\_limit = 10, pass\_reminder\_days = 7, job\_default\_days = 30, consent\_retention\_years = 3, abandoned\_consent\_days = 30, unconfirmed\_account\_days = 7, confirmation\_resend\_limit = 3, admin\_notify\_email.

## Offene Fragen

Alle fünf Punkte sind am 4. Oktober 2026 wie vorgeschlagen entschieden.

- [x] **Inaktive Konten:** Konten ohne Login und ohne Pass werden nach 24 Monaten gelöscht, mit Ankündigung per Mail 30 Tage vorher.
- [x] **Planphasen nach Kontolöschung:** alle Phasen bleiben in `plan_periods`, mit zufälliger Kennung statt Nutzer-ID, für die Auswertung.
- [x] **Erinnerung am Vortag eines Gesprächs:** wird aufgenommen, läuft über die tägliche Funktion.
- [x] **Sprache der Mails:** Englisch; Deutsch mit der deutschen Fassung.
- [x] **Herkunftsland und Zielstadt:** nicht in Phase 1, erst mit Dokumentenpfad und "Your city".

Aus diesem Dokument entstehen als Nächstes die Migrationsdateien und die automatischen Tests der Zugriffsregeln, als erster Schritt in Claude Code.
