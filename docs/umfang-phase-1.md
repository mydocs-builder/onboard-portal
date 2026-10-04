# Kandidatenportal: Umfang Phase 1

Oct 3, 2026 · @Patrick

## Ziel und Abgrenzung

Phase 1 ist ein Portal mit bezahlten Pässen, mit dem internationale Fachkräfte ihre Jobsuche in Deutschland selbst organisieren: Vorlagen, Leitfäden, Checklisten, Bewerbungstracker und von Hand gepflegte Listen. Es läuft getrennt von WordPress unter einer eigenen Subdomain, my.onboard-germany.de.

Das Portal ist ein Recherche- und Organisationswerkzeug. Bewerbungen laufen direkt beim Arbeitgeber, Onboard Germany vermittelt keine Stellen und prüft keine Einzelfälle.

Phase 1 kommt ohne n8n aus. Alles, was regelmäßig automatisch recherchiert oder per KI verarbeitet wird, gehört zu Phase 2 (Abschnitt "Nicht in Phase 1").

Grundlage für Aussehen und Abläufe ist der klickbare Prototyp vom 3. Oktober 2026. Dieses Dokument legt fest, was davon gebaut wird.

## Zielgruppe und Sprachen

Zielgruppe sind Fachkräfte aus dem Ausland, die eine Stelle in Deutschland suchen, mit und ohne Deutschkenntnisse. Pflegekräfte werden über das Berufsfeld "Nursing and care" gezielt bedient, eine eigene Pflege-Spezialisierung folgt später.

- **Portal für Kandidaten:** zum Start nur Englisch. Die deutsche Fassung folgt später; die Zweisprachigkeit wird von Beginn an technisch angelegt.
- **Admin-Bereich:** Deutsch.
- **Rechtliche Aussagen:** nur mit Paragraphenangabe aus den Gesetzesdateien im Projektwissen, sonst nicht formuliert.

## Stufen und Pässe

Drei Stufen; die bezahlten Stufen werden als Pässe für 1 oder 3 Monate verkauft, ohne Abo und ohne automatische Verlängerung. Preise als Einführungspreise inklusive Umsatzsteuer.

| Stufe | 1-Monats-Pass | 3-Monats-Pass | Für wen |
| --- | --- | --- | --- |
| Free | 0 € | - | Einstieg, Registrierung von der Website aus |
| Starter | 14 € | 36 € | eigene Jobsuche mit Vorlagen und Leitfäden |
| Plus | 29 € | 75 € | zusätzlich Unternehmensliste, aktuelle Jobs, spezialisierte Personaldienstleister, Anrechnung auf die Job Search Consultation |

- Ein Pass endet automatisch, danach gilt Free. Es gibt nichts zu kündigen. 7 Tage vor Ablauf kommt eine Erinnerungsmail mit Link zum Nachkauf.
- Der 3-Monats-Pass ist rund 14 Prozent günstiger als drei 1-Monats-Pässe. Der Rabatt gilt für die Vorauszahlung.
- Wer einen Pass derselben Stufe nachkauft, während der alte noch läuft, verlängert ihn: Der neue Pass schließt an das bisherige Ablaufdatum an.
- Ein Abo-Modell kann später zusätzlich angeboten werden. Der umgekehrte Weg wäre aufwendiger, deshalb Start nur mit Pässen.
- Plus-Kunden erhalten eine Anrechnung von 29 € auf die Job Search Consultation (149 €).
- Stufenzuordnung, Preise und Inhalte werden als Daten gepflegt und sind ohne Programmierung änderbar.
- Der Digital Guide (29 €) bleibt eigenständig. Im Portal ist sein Inhalt online lesbar, aber nicht als vollständiges PDF herunterladbar.

**Regel für neue Pässe bei laufendem Zugang:** Bei gleicher oder niedrigerer Stufe beginnt der neue Pass am Tag nach dem bisherigen Ende, es geht kein Tag verloren. Bei einem Upgrade, etwa von Starter auf Plus, gilt die höhere Stufe sofort; der Restwert eines bezahlten Passes wird zum Listenpreis pro Tag in Tage der höheren Stufe umgerechnet. Beispiel: Starter-Pass für 1 Monat, nach 3 Tagen Kauf von Plus für 1 Monat; die 27 Resttage Starter (Wert 12,60 €) ergeben 13 Tage Plus, also Plus ab sofort für 43 Tage. So lässt sich der Preisunterschied zwischen den Stufen nicht umgehen. Resttage einer kostenlosen Freischaltung werden nicht umgerechnet. Die Bestellübersicht zeigt Beginn, Ablaufdatum und die Umrechnung in einem Satz, die Passlänge (1 oder 3 Monate) ist dort wählbar.

## Funktionen des Kandidatenportals

Die Navigation folgt dem Prototyp: Overview, "Get started", "Job search", "Preparation", "Job found, what now?" und Konto.

| Bereich | Inhalt | Free | Starter | Plus |
| --- | --- | --- | --- | --- |
| Overview | Begrüßung mit Vorname (erster Login: "Welcome aboard" mit kurzer Startanleitung, danach "Welcome back"), Kennzahlen, nächste Schritte, Abfrage des Berufsfelds | ja | ja | ja |
| CV and cover letter | CV-Checkliste (8 Punkte), Leitfaden zum deutschen CV | ja | ja | ja |
| CV and cover letter | Vorlagen CV, Anschreiben, Beispiel-CV, Follow-up-Mail; weitere Leitfäden | - | ja | ja |
| LinkedIn and XING | Checklisten LinkedIn (19 Punkte in drei Abschnitten, mit Beispielen und Nachrichtenvorlagen zum Kopieren) und XING (15 Punkte, gleicher Aufbau, Vorlagen auf Deutsch) | Grundlagen: LinkedIn 6, XING 5 | voll | voll |
| Applications | Tracker mit Ort, Link zur Anzeige, optionaler Ansprechperson, Notizen und Verlauf; nächster Schritt mit Art und Datum (Bewerben, Nachfassen, Gespräch, Unterlagen senden, Entscheidung erfragen, auf Angebot antworten), vom Status vorgeschlagen; bei Fälligkeit Abfrage "What happened?" mit Folgeschritt; Dublettenwarnung | bis 10 Einträge | unbegrenzt | unbegrenzt |
| Companies | von Hand gepflegte Liste mit Signalen, Website, Prüfdatum; Filter nach Branche, Signal, Arbeitgebertyp | - | - | ja |
| Job boards | Jobbörsen nach Fachgebiet | allgemeine | alle | alle |
| Recruitment agencies | Leitfaden mit Hinweis zu § 40 AufenthG, Generalisten | - | ja | ja |
| Recruitment agencies | spezialisierte Agenturen mit Filtern | - | - | ja |
| Visa checklist | Chancenkarte, abhakbar, mit Fundstellenzeile | ja | ja | ja |
| German for the job | Formulierungen Anschreiben | ja | ja | ja |
| German for the job | Telefonat, Vorstellungsgespräch, Fachvokabular nach Berufsfeld | - | ja | ja |
| Interview and guide | Vorbereitung Vorstellungsgespräch, Guide online lesbar | - | ja | ja |
| Employment contract | Glossar typischer Klauseln, Hinweis zu § 39 und § 41 AufenthG | - | ja | ja |
| From offer to first day | Schrittfolge in drei Phasen, abhakbar | ja | ja | ja |
| Plan, Account | Plan and billing (aktueller Pass, Ablaufdatum, Rechnungen, Pass kaufen oder verlängern) getrennt von Account settings (persönliche Daten, E-Mail, Passwort) | ja | ja | ja |

**Querschnittsfunktionen**

- Das Berufsfeld im Profil setzt die Filter bei Unternehmen und Personaldienstleistern und wählt das Fachvokabular. Bei "Nursing and care" erscheint zusätzlich der Filter Arbeitgebertyp (Krankenhaus, Pflegeheim, ambulanter Dienst).
- Das Signal "Recognition partnership" trägt eine Erklärung als Tooltip, belegt mit § 16d Abs. 3 AufenthG.
- Nächste Schritte kennen zwei Arten: Aufgaben (CV, LinkedIn, XING, Visa-Unterlagen) und Ereignisse (fällige Follow-ups, neue Jobs). Eine Aufgabe wandert in den Bereich "Completed", wenn ihre Checkliste vollständig ist oder der Kandidat sie mit "Mark as done" abschließt. "Completed" steht eingeklappt unter den nächsten Schritten; von Hand abgeschlossene Aufgaben lassen sich dort mit "Reopen" zurückholen. Ereignisse lassen sich nicht abschließen, sie verschwinden, wenn sie erledigt sind.
- Gesperrte Bereiche zeigen einen Stufen-Hinweis mit Link zur Stufenwahl, keinen leeren Inhalt.
- Der Menüpunkt "Jobs for internationals" erscheint in Plus, sobald der erste Job veröffentlicht ist. In Phase 1 werden Jobs von Hand gepflegt (Abschnitt Admin-Bereich).

**E-Mail-Erinnerungen bei Follow-ups**

Einmal täglich verschickt das Portal eine gesammelte Mail mit allen Bewerbungen, deren Termin an diesem Tag fällig wird, je Termin nur einmal. Die Mail nennt Unternehmen und Position und verlinkt in den Tracker. Kandidaten können die Erinnerungen im Account abschalten, voreingestellt ist an.

**Externe Links**

Jede Website und jede Adresse im Portal ist anklickbar und öffnet sich in einem neuen Tab: Websites von Unternehmen und Personaldienstleistern, Jobbörsen, Stellenanzeigen ("View ad") und Verweise auf onboard-germany.de. Ein kleines Pfeilsymbol neben dem Link zeigt, dass ein neuer Tab aufgeht; Screenreader lesen "opens in a new tab" mit. Technisch mit target="\_blank" und rel="noopener noreferrer", damit die Zielseite keinen Zugriff auf das Portal erhält. Die Liste der Personaldienstleister bekommt dazu eine Spalte Website, die im Prototyp fehlt.

## Registrierung, Login und Konto

Jedes Konto startet als Free und wird erst nach Bestätigung der E-Mail-Adresse aktiv.

1. **Registrierung:** Vorname, Nachname, E-Mail, Passwort (mindestens 10 Zeichen), Berufsfeld optional, Zustimmung zu Nutzungsbedingungen und Datenschutzerklärung.
2. **Bestätigung:** Mail mit Link, 24 Stunden gültig, erneut anforderbar.
3. **Stufenwahl:** Free, Starter oder Plus, monatlich oder alle 3 Monate. Free führt direkt ins Portal, eine bezahlte Stufe zur Bestellübersicht (Abschnitt Bezahlung).
4. **Login:** E-Mail und Passwort. "Passwort vergessen" schickt einen Link und bestätigt neutral, ohne zu verraten, ob die Adresse registriert ist.

**Bereich Account**

- Vorname, Nachname, Berufsfeld, Portalsprache ändern
- E-Mail ändern nur über einen Bestätigungslink an die neue Adresse
- Passwort ändern mit aktuellem Passwort und Wiederholung
- Plan, Pass und Ablaufdatum auf der eigenen Seite "Plan and billing", dort auch Rechnungen und Pass kaufen oder verlängern; keine Kündigung nötig
- Konto löschen mit Passwortbestätigung; ein laufender Pass verfällt mit dem Konto

Im Prototyp fehlt der Nachname in der Registrierung. Er kommt im Bau dazu.

## Bezahlung mit Stripe

Stripe übernimmt Zahlung und Rechnung als Einmalzahlung; bei Onboard Germany liegen keine Zahlungsdaten, nur Plan, Pass-Laufzeit, Ablaufdatum und die Stripe-Kunden-ID.

**Ablauf beim Kauf eines Passes**

1. Bestellübersicht im Portal: Stufe, Pass, Preis, Ablaufdatum, Zustimmung zum sofortigen Beginn und zum Erlöschen des Widerrufsrechts.
2. Weiterleitung auf die Bezahlseite von Stripe, mit der Nutzer-ID als Referenz.
3. Stripe meldet die erfolgreiche Zahlung an eine Funktion in Supabase. Die trägt Stufe, Quelle "Pass" und Ablaufdatum ein; bei Verlängerung ab dem bisherigen Ablaufdatum.
4. Die Zugriffsregeln der Datenbank lesen die Stufe von dort. Eine tägliche Funktion setzt abgelaufene Pässe auf Free und verschickt die Erinnerungen.

**In Stripe angelegt:** vier Preise als Einmalzahlung, je Starter und Plus für 1 und 3 Monate. Rechnungen erstellt Stripe zu jeder Zahlung. Ob Stripe Tax für die Umsatzsteuer nach Kundenland genutzt wird, ist mit der Steuerfrage (OSS) zu klären.

| Zustand | Bedeutung | Zugang |
| --- | --- | --- |
| Pass aktiv | bezahlt, Ablaufdatum in der Zukunft | gekaufte Stufe |
| Manuell freigeschaltet | vom Admin oder durch die Pilotphase ohne Zahlung vergeben | gewählte Stufe bis Enddatum |
| Abgelaufen | Ablaufdatum erreicht | Free, Daten bleiben erhalten |

- Zahlung fehlgeschlagen oder abgebrochen: Es entsteht kein Pass, der Nutzer bleibt auf seiner bisherigen Stufe.
- Erstattung, etwa bei Widerruf: Patrick erstattet in Stripe und setzt den Nutzer im Admin-Bereich auf Free.
- Bei Rückfall auf Free bleiben Tracker, Checklisten und Profil erhalten. Der Tracker zeigt bei mehr als 10 Einträgen alle an, neue Einträge sind erst mit einem Pass möglich.
- Alles wird zuerst im Testmodus von Stripe mit Testkarten durchgespielt.

**Gutscheincodes**

Die Bezahlseite von Stripe zeigt ein Feld für Gutscheincodes. Patrick legt Rabatte und Codes im Stripe-Dashboard an, ohne Änderung am Portal: Prozent oder fester Betrag, beschränkt auf bestimmte Pässe, Erstkunden oder einzelne Kunden. Pro Kauf gilt ein Code. Der verwendete Code wird beim Pass gespeichert und steht in der Detailansicht des Nutzers.

## Admin-Bereich

Der Admin-Bereich ist Teil des Portals, nur für Konten mit Admin-Rolle sichtbar und auf Deutsch.

Navigation links in vier Gruppen, jede Aufgabe auf einer eigenen Seite:

| Gruppe | Seiten |
| --- | --- |
| Start | Auswertungen (Weg vom Konto zum ersten Pass, Quote nach kostenlosen Phasen je Herkunft, Gutscheincodes und wer nach Ablauf nachkauft); Übersicht mit Kennzahlen und "Zu erledigen" (offene Einladungen, Pässe, die in 7 Tagen ablaufen, auslaufende Freischaltungen, Stand der Startphase) |
| Nutzer | Alle Nutzer (Liste mit Suche und Filtern, Detailseite je Nutzer), Nutzer anlegen |
| Inhalte | Unternehmen, Jobs, Personaldienstleister, Jobbörsen, Checklisten und Texte |
| Einstellungen | Startphase |

Damit die Auswertungen funktionieren, speichert die Datenbank ab dem ersten Tag jede Planphase eines Nutzers als eigenen Eintrag: Plan, Quelle (Pilotphase, manuell mit Grund, Stripe), Gutscheincode, Beginn und Ende. Nachträglich lässt sich das nicht rekonstruieren. Gezählt wird ohne Namen; die Auswertungen zeigen nur Summen.

**Nutzer**

- Kennzahlen: Nutzer gesamt, Verteilung auf Free, Starter und Plus, Umsatz der letzten 30 Tage aus verkauften Pässen
- Liste mit Name, E-Mail, Plan, Status, Berufsfeld, Registrierungsdatum; Suche nach Name oder E-Mail; Filter nach Plan und Status
- Detailansicht mit Konto, Plan, Abrechnung, Status, nächstem Termin und Änderungsprotokoll
- Aktionen: Passwort-Link senden, Konto sperren, Konto löschen

**Nutzer anlegen**

Patrick legt Konten selbst an: Vorname, Nachname, E-Mail, Berufsfeld optional, Plan Free oder Starter bzw. Plus manuell freigeschaltet mit Enddatum und Grund. Der Nutzer erhält eine Einladung per E-Mail und setzt sein Passwort selbst; Patrick vergibt keine Passwörter. Bis zum ersten Login steht der Status auf "Eingeladen", die Einladung lässt sich erneut senden. Doppelte E-Mail-Adressen werden abgewiesen. Einen bezahlten Pass kann nur der Nutzer selbst kaufen; dafür gibt es den Zahlungslink auf der Detailseite.

**Ende einer manuellen Freischaltung**

Eine manuelle Freischaltung ist kostenlos, es gibt keinen automatischen Zahlungslink. 7 Tage vor dem Enddatum erhält der Nutzer automatisch eine Mail: Die Freischaltung endet am Datum, danach gilt Free; ist der Verkauf eingeschaltet, enthält die Mail einen Link zur Stufenwahl, optional mit einem Gutscheincode. Am Enddatum fällt das Konto auf Free, Daten bleiben erhalten. Patrick kann vorher verlängern oder einen Zahlungslink senden.

Kauft der Nutzer während einer laufenden kostenlosen Freischaltung einen Pass, beginnt der Pass erst am Enddatum der Freischaltung, damit er keine Tage doppelt bezahlt. Sobald Stripe die Zahlung meldet, trägt das Portal den Pass automatisch ein und vermerkt ihn im Änderungsprotokoll.

**Plan ändern, zwei Arten**

- **Zahlungslink senden:** Der Nutzer erhält per E-Mail einen Link zur Bezahlseite für den gewählten Pass. Nach der Zahlung ist der Pass automatisch aktiv.
- **Manuell ohne Zahlung:** Stufe, Enddatum und Grund, etwa für Kunden der Komplett-Begleitung. Nach dem Enddatum automatisch zurück auf Free.

Jede Änderung landet im Änderungsprotokoll des Nutzers. Bewerbungen, Notizen und Checklisten der Nutzer sind im Admin-Bereich nicht sichtbar.

**Startphase**

Das Portal startet als Pilotphase: Plus kostenlos für alle neuen Konten bis zu einem Stichtag, Verkauf von Starter und Plus ausgeschaltet. Vier Einstellungen in der Verwaltung, jederzeit änderbar:

| Einstellung | Werte | Start |
| --- | --- | --- |
| Registrierung | offen für alle, nur mit Einladungscode | offen |
| Neue Konten erhalten | Plus kostenlos bis Stichtag, Free | Plus |
| Stichtag | Datum | legt Patrick fest |
| Verkauf von Starter und Plus | aus, an | aus |

- Solange der Verkauf aus ist, entfallen Stufenwahl und Bezahlung nach der Registrierung, und die Seite "Plan" zeigt einen Hinweis auf die Pilotphase statt der Preiskarten.
- Die kostenlose Plus-Stufe läuft technisch als manuelle Freischaltung mit Grund "Pilotphase" und steht so im Änderungsprotokoll. Am Stichtag fallen die Konten automatisch auf Free, außer der Nutzer hat vorher gebucht.
- Ausgewählte Personen lassen sich zusätzlich einzeln über "Plan ändern" freischalten, auch mit eigenem Enddatum.
- Wird der Verkauf eingeschaltet, sehen alle Nutzer ab sofort die Preiskarten. Pilotnutzer werden vor dem Stichtag per Mail informiert.

**Inhalte pflegen**

Pflegemasken für Unternehmen, Personaldienstleister, Jobbörsen, Checklisten und Texte, damit keine Arbeit im Tabelleneditor von Supabase nötig ist. Diese Masken fehlen im Prototyp und werden im Bau ergänzt.

**Einträge hinzufügen, einzeln oder als Stapel**

Gilt für Unternehmen, Jobs, Personaldienstleister und Jobbörsen.

- **Einzeln:** Formular in der Verwaltung, mit Pflichtfeldern und Auswahllisten für Branche, Arbeitgebertyp und Signale.
- **Als Stapel:** CSV-Datei hochladen. Das Portal zeigt eine Vorschau, prüft jede Zeile (Pflichtfelder, gültige Werte, Website-Format) und erkennt Dubletten über die Website-Domain. Fehlerhafte Zeilen werden angezeigt, nicht still übergangen.
- **Entwurf und Freigabe:** Importierte Einträge landen als Entwurf und werden erst nach Freigabe sichtbar, einzeln oder alle auf einmal.
- **Vorlagen und Export:** je Liste eine CSV-Vorlage zum Herunterladen und ein Export des aktuellen Bestands.
- **Excel:** Der Import akzeptiert Semikolon als Trennzeichen. Gespeichert wird als "CSV UTF-8", damit Umlaute erhalten bleiben.

| Liste | Spalten |
| --- | --- |
| Unternehmen | name, website, industry, employer\_type, region, signals, source, checked\_at |
| Jobs | title, company, location, industry, employer\_type, signals, url, posted\_at, expires\_at |
| Personaldienstleister | name, website, field, model, recruits\_abroad, region, source, checked\_at |
| Jobbörsen | name, website, category, focus |

Mehrere Signale stehen in einer Zelle, getrennt durch einen senkrechten Strich, zum Beispiel English job ads|Relocation support. Jobs verschwinden nach expires\_at automatisch, ohne Angabe nach 30 Tagen.

**Bestand im Blick**

Die Verwaltung zeigt je Liste die Zahl der veröffentlichten Einträge und markiert Einträge, deren Prüfdatum älter als 6 Monate ist. Die Mindestzahl echter Unternehmen ist eine Startbedingung für den Verkauf von Plus; danach hält die Markierung alter Einträge die Liste aktuell.

## Gespeicherte Daten und Datenschutz

Gespeichert werden Kontodaten, Pass-Status und die Arbeitsdaten des Kandidaten; keine Zahlungsdaten, keine hochgeladenen Dokumente, keine besonderen Kategorien personenbezogener Daten.

| Daten | Wo | Zweck |
| --- | --- | --- |
| Vorname, Nachname, E-Mail, Passwort (verschlüsselt), Sprache, Berufsfeld | Supabase | Konto, Anrede, Filter |
| Plan, Status, Laufzeitende, Stripe-Kunden-ID | Supabase | Freischaltung der Stufe |
| Bewerbungen mit Ort, Link zur Anzeige, optionaler Ansprechperson (Name, Funktion), Status, nächstem Schritt, Notizen, Verlauf | Supabase | Tracker |
| Abgehakte Punkte aller Checklisten | Supabase | Fortschritt, nächste Schritte |
| Letzter Login | Supabase, technisch | Sicherheit |
| Zahlungsmethode, Rechnungsanschrift, Rechnungen | Stripe | Bezahlung, Buchhaltung |

- Unter dem Notizfeld steht der Hinweis, keine sensiblen persönlichen Angaben einzutragen.
- Nutzer können ihr Konto selbst löschen. Daten in Stripe, die für Rechnungen aufbewahrt werden müssen, bleiben dort.
- Auftragsverarbeitungsverträge mit Server-Anbieter, Stripe und Mailversand-Dienst.
- Datenschutzerklärung fürs Portal nennt alle Daten dieser Tabelle.

## Technik und Betrieb

Ein eigener Server in der EU mit 8 GB RAM, alles in Docker; Supabase selbst gehostet statt PocketBase.

| Baustein | Aufgabe |
| --- | --- |
| Caddy | Reverse Proxy mit automatischen SSL-Zertifikaten, liefert das Frontend aus |
| Frontend | statische React-Anwendung, zweisprachig, Farben und Schriften aus dem Styleguide, Schriften lokal eingebunden |
| Supabase | Postgres-Datenbank, Konten, Zugriffsregeln, Admin-Oberfläche, Funktion für Stripe-Meldungen |
| Stripe | Bezahlseite für Pässe, Rechnungen, Gutscheincodes |
| Mailversand-Dienst | Bestätigungs- und Passwort-Mails |

**Grundsätze für das Datenmodell**

- Inhalte als Daten: Checklistenpunkte, Texte, Listen, Stufenzuordnung und Preise liegen als Einträge in der Datenbank, nicht im Code.
- Ein gemeinsames Modell für alle Checklisten (CV, LinkedIn, XING, Visum, "Job found").
- Fortschritt hängt an festen IDs der Punkte, nicht an ihrer Position.
- Strukturänderungen als Migrationsdateien, versioniert.

**Betrieb**

- Zweite Instanz als Testumgebung; jede Änderung läuft dort zuerst.
- Tägliche automatische Backups an einen externen Speicherort, Backup vor jeder Migration.
- Updates der Docker-Images nach Plan, nicht automatisch.
- Styleguide erhält Kapitel 11 "Portal" mit den neuen Komponenten.

Die täglichen Erinnerungsmails laufen als geplante Funktion in Supabase über den Mailversand-Dienst, ohne n8n. Abgelaufene Jobs und manuelle Freischaltungen werden von derselben täglichen Funktion beendet.

**Änderungen nach dem Start**

Code, Migrationen und Server-Konfiguration liegen von Anfang an in einem privaten Git-Repository; jede Änderung läuft erst in der Testumgebung, dann live.

| Art der Änderung | Weg | Ausfall |
| --- | --- | --- |
| Inhalte: Checklistenpunkte, Texte, Listen, Stufenzuordnung | direkt im Admin-Bereich | keiner |
| Preise und neue Pässe | Stripe und Admin-Bereich; laufende Pässe behalten ihre Bedingungen | keiner |
| Neue Seiten oder Funktionen ohne neue Daten | neue Fassung des Frontends | keiner |
| Neue Funktionen mit neuen Tabellen oder Feldern | Migration, dann neues Frontend | keiner bis wenige Minuten |
| Umbau bestehender Daten | Migration mit Umschreibskript, vorher Test mit Kopie | geplantes Wartungsfenster |

Ablauf je technischer Änderung: Umsetzung und Test in der Testumgebung mit Testdaten, Backup der Live-Datenbank, Migration einspielen, neue Fassung von Frontend und Funktionen veröffentlichen, kurzer Funktionstest live. Die vorige Fassung des Frontends bleibt liegen und lässt sich in Sekunden zurückholen. Ein Skript fasst die Schritte zusammen, damit eine Veröffentlichung ein Befehl ist.

**Sicherheit**

Ziel ist nicht Unangreifbarkeit, sondern geringe Angriffsfläche, begrenzter Schaden, schnelles Erkennen und sichere Wiederherstellung.

| Ebene | Maßnahmen |
| --- | --- |
| Server | Anmeldung nur per SSH-Schlüssel, kein Root-Login, Firewall nur für Web und SSH, automatische Sicherheitsupdates des Systems, Schutz gegen wiederholte Fehlversuche |
| Admin-Oberfläche von Supabase | nicht öffentlich erreichbar, nur über einen gesicherten Tunnel |
| Schlüssel | Service-Role-, Stripe- und Webhook-Schlüssel nur auf dem Server, nie im Git-Repository oder im Browser; bei Verdacht sofort erneuern |
| Datenbank | Zugriffsregeln auf jeder Tabelle, Grundsatz "alles verboten, was nicht erlaubt ist"; Plan und Pass nur durch die Server-Funktionen schreibbar |
| Anmeldung | E-Mail-Bestätigung, Passwortlänge, Begrenzung von Fehlversuchen, Zwei-Faktor-Anmeldung für das Admin-Konto |
| Bezahlung | keine Kartendaten im Portal, Prüfung der Stripe-Signatur, Freischaltung nur über die Meldung von Stripe |
| Frontend | nur HTTPS, Sicherheits-Header über Caddy, keine ungeprüfte Ausgabe von Nutzereingaben |
| Pflege | regelmäßige Updates von Supabase, Caddy und Bibliotheken, automatische Warnungen bei bekannten Lücken |
| Backups | täglich, verschlüsselt, an einem zweiten Ort; Wiederherstellung regelmäßig getestet |
| Überwachung | Erreichbarkeit, Fehlerprotokolle, Auffälligkeiten wie viele Fehlversuche |

**Prüfung:** automatische Tests der Zugriffsregeln vor jeder Veröffentlichung (ein Kandidat sieht keine fremden Daten, kann seinen Plan nicht selbst ändern, erreicht den Admin-Bereich nicht); Prüfung von TLS und Sicherheits-Headern mit öffentlichen Werkzeugen; vor dem Verkaufsstart eine unabhängige Sicherheitsprüfung durch eine Fachfirma, mindestens für Zugriffsregeln, Server und Bezahlung.

**Notfallplan:** Schlüssel erneuern, betroffene Zugänge sperren, aus Backup wiederherstellen, Vorfall dokumentieren. Bei einer Datenschutzverletzung mit Risiko für die Nutzer sind Meldepflichten gegenüber der Aufsichtsbehörde und gegebenenfalls den Betroffenen zu prüfen (allgemeines Wissen, vor dem Start zu klären).

**Updates**

Alle Versionen sind im Git-Repository festgeschrieben; Hinweise auf neue Versionen kommen automatisch, eingespielt wird bewusst per Skript.

| Bestandteil | Wie Patrick davon erfährt | Wie es eingespielt wird |
| --- | --- | --- |
| Betriebssystem des Servers | Sicherheitsupdates laufen automatisch, Hinweis bei nötigem Neustart | automatisch, Neustart zu einem ruhigen Zeitpunkt |
| Supabase und Caddy (Docker) | E-Mail eines Update-Melders bei neuen Versionen | erst Testumgebung, dann Update-Skript live |
| Bibliotheken von Frontend und Funktionen | automatische Hinweise und Vorschläge im Git-Repository, Sicherheitslücken markiert | Vorschlag übernehmen, testen, Veröffentlichungsskript |
| Stripe-Schnittstelle | Mails von Stripe zu Neuerungen und Abkündigungen | bewusster Wechsel der Version, im Testmodus geprüft |
| SSL-Zertifikate | keine Aktion nötig | Caddy erneuert sie selbst |

Rhythmus: einmal im Monat ein Wartungstermin für alle gesammelten Updates; Sicherheitsupdates innerhalb weniger Tage. Das Update-Skript sichert zuerst die Datenbank, holt die neuen Versionen, startet neu, prüft, ob das Portal antwortet, und kehrt sonst zur vorigen Version zurück.

## Zusammenspiel mit onboard-germany.de

Die Website wirbt und führt hin, das Portal unter my.onboard-germany.de übernimmt ab Login und Registrierung; beide verlinken sich gegenseitig an festen Stellen.

| Stelle | Verhalten |
| --- | --- |
| Button "Portal" mit Personensymbol im Header der Website, DE und EN | führt zu my.onboard-germany.de/login. Ist der Nutzer noch angemeldet, leitet die Seite direkt ins Portal weiter. WordPress kennt den Anmeldestatus nicht, der Button heißt deshalb immer gleich und nicht "Mein Konto". Auf der deutschen Website mit Hinweis "Portal auf Englisch". |
| Portal-Seite auf der Website | Name "Kandidatenportal" bzw. "Candidate Portal", als Eintrag im Mega-Menü Fachkräfte; erklärt Inhalte und Stufen mit Preiskarten, Button "Kostenlos registrieren" führt zu /register. Bei eingeschaltetem Verkauf mit vorgewählter Stufe, zum Beispiel /register?plan=plus. |
| Logo auf Login und Registrierung | führt zur Startseite der Website. |
| Abmelden | zurück auf die Login-Seite mit dem Hinweis "You have been signed out" und einem Link zurück zu onboard-germany.de. |
| Links vom Portal zur Website (Hubs, Buchung des Immigration Call) | öffnen in einem neuen Tab, die Portal-Sitzung bleibt offen. |
| Fußzeile im Portal und auf Login-Seiten | Website, Impressum, Datenschutzerklärung Portal, Nutzungsbedingungen. |
| Mails des Portals | Absender mit Adresse @onboard-germany.de, Domain für den Mailversand-Dienst eingerichtet. |

Nach dem Abmelden auf die Login-Seite statt direkt auf die Website: Der Nutzer sieht, dass die Abmeldung geklappt hat, kann sich mit einem anderen Konto anmelden und kommt mit einem Klick zur Website. Das ist bei Portalen unter eigener Subdomain der übliche Weg.

Das Portal speichert nur, was für die Anmeldung technisch nötig ist. Kommt später eine Nutzungsanalyse dazu, braucht sie eine Einwilligung und damit ein Cookie-Banner (allgemeines Wissen, vor dem Start zu prüfen).

## Inhalte vor dem Start

Die Inhalte sind der größte Arbeitsblock; Claude formuliert vor, Patrick prüft fachlich und liefert eigene Materialien. Zum Start nur Englisch.

| Inhalt | Grundlage | Vorarbeit | Prüfung |
| --- | --- | --- | --- |
| Vorlagen CV, Anschreiben, Beispiel-CV, Follow-up-Mail | Digital Guide | Patrick | Patrick |
| Guide-Kapitel als Online-Fassung | Digital Guide | Claude | Patrick |
| CV-, LinkedIn- und XING-Checklisten, Leitfaden deutscher CV | Prototyp | Claude | Patrick |
| Weitere Leitfäden (Anschreiben, Anerkennung im CV, LinkedIn und XING, Vorstellungsgespräch) | neu | Claude | Patrick |
| German for the job: Formulierungen und Fachvokabular | Prototyp | Claude | Patrick |
| Vertragsglossar | Prototyp | Claude | Patrick |
| From offer to first day | Prototyp, Hubs der Website | Claude | Patrick |
| Visa-Checkliste Chancenkarte | build\_ck\_antrag.py | vorhanden | Patrick |
| Jobbörsen | Prototyp | Claude | Patrick, jede Adresse öffnen |
| Unternehmen, Startbestand | 10 Beispieleinträge für Bau und Test, vor dem Start durch echte Einträge ersetzt | Patrick | Patrick |
| Personaldienstleister, Generalisten und Spezialisierte | neu zu recherchieren | Claude | Patrick |

- Rechtliche Aussagen nur mit Paragraphenangabe aus den Gesetzesdateien im Projekt. Gesetzliche Werte zu Probezeit, Urlaub oder Meldefristen kommen nur dazu, wenn BGB, Bundesurlaubsgesetz oder Bundesmeldegesetz als Quelle ins Projekt gelegt werden.
- Jeder Eintrag in Unternehmens- und Agenturliste trägt Quelle und Prüfdatum.

## Nicht in Phase 1

Diese Punkte sind besprochen, aber bewusst verschoben, damit Phase 1 ohne n8n und ohne offene Rechtsfragen starten kann.

| Thema | Phase | Voraussetzung |
| --- | --- | --- |
| Deutsche Fassung des Portals | später | Übersetzung aller Inhalte |
| Jobs täglich automatisch per n8n (von Hand ab Phase 1) | 2 | n8n, geprüfte Datenquellen mit Schnittstelle |
| Automatische Pflege der Unternehmensliste per n8n | 2 | n8n, Freigabe neuer Firmen durch Patrick |
| CV-Check und Interview-Feedback per KI | 2 | Kosten und Datenschutz der KI-Verarbeitung geklärt |
| Visa-Checklisten Blaue Karte, Fachkräftevisum, Pflege | nach Inhalt | Inhalte aus der Rechtsquelle erarbeitet |
| Chancenkarten- und Visa-Navigator im Portal, Ergebnis gespeichert und mit der Visa-Checkliste verknüpft (in Phase 1 nur als Link auf die WordPress-Fassung) | später | Navigator auf WordPress fertig, Entscheidung über eine gemeinsame Regelbasis |
| Pflege-Spezialisierung (Portalbereich, B2B-Paket für Einrichtungen) | später | Gespräche mit Einrichtungen, Klärung zu § 38 BeschV |
| Stellenanzeigen von Unternehmen im Portal | später | rechtliche Klärung Anzeigenportal gegenüber Vermittlung |
| Live-Fragestunde | offen | Entscheidung, RDG-sichere Form |

Ebenfalls später: Inhalte, die heute frei auf onboard-germany.de stehen, etwa Familiennachzug, im Portal spiegeln, damit Nutzer alle Informationen an einem Ort haben. Gepflegt werden sie weiter nur in WordPress; das Portal liest sie über die Schnittstelle von WordPress ein, damit keine zweite Fassung entsteht.

## Rechtliche Punkte vor dem Start

Vier Punkte müssen vor dem ersten zahlenden Kunden geklärt sein; sie stammen aus allgemeinem Wissen, nicht aus dem Projektwissen.

- [ ] Nutzungsbedingungen und Datenschutzerklärung fürs Portal, geprüft durch Anwalt oder einen seriösen Generator
- [ ] Wortlaut der Zustimmung zum sofortigen Beginn und zum Erlöschen des Widerrufsrechts bei digitalen Inhalten
- [ ] Bestätigen, dass bei Pässen ohne Verlängerung kein Kündigungsbutton nötig ist
- [ ] Umsatzsteuer für digitale Leistungen an Verbraucher im EU-Ausland (OSS) und außerhalb der EU, mit Steuerberatung

Alle Texte im Portal bleiben RDG-konform: allgemeine Information, keine Prüfung von Einzelfällen oder Verträgen.

## Offene Punkte und Freigabe

Acht Entscheidungen fehlen noch; danach ist der Umfang eingefroren und das Datenmodell folgt.

- [x] Preise freigegeben: Starter 14 € / 36 €, Plus 29 € / 75 €
- [x] Anrechnung für Plus auf die Job Search Consultation: 29 €
- [x] Keine Abos, sondern Pässe für 1 oder 3 Monate, die automatisch enden
- [x] Unternehmensliste zum Start nur in Plus; ein späterer Wechsel nach Starter bleibt möglich
- [x] Deutsche Fassung des Portals später
- [x] Subdomain: my.onboard-germany.de
- [x] Unternehmen: 10 Testeinträge für Bau und Test, zum Livegang recherchiert Patrick deutlich mehr
- [x] Plus wird erst verkauft, wenn eine Mindestzahl echter, geprüfter Unternehmen erreicht ist; die Zahl legt Patrick vor dem Start fest
- [x] E-Mail-Erinnerungen bei fälligen Follow-ups: ja
- [x] Externe Links öffnen in einem neuen Tab

Nachträge zum Funktionsumfang bitte als Kommentar an der passenden Stelle. Nach der Freigabe gelten Änderungen als Erweiterung für nach dem Start.

- [x] Umfang Phase 1 freigegeben
