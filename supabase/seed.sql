-- Seed-Daten für die lokale Entwicklung. Wird bei "supabase db reset" nach den Migrationen geladen.
-- Quelle aller Texte: docs/prototyp.html (klickbarer Prototyp vom 3. Oktober 2026).
--
-- Unternehmen, Jobs und Personaldienstleister sind BEISPIELDATEN, keine echten Arbeitgeber:
-- Namen beginnen mit "Beispiel", Adressen enden auf ".example" oder liegen unter example.com, und source ist 'example'.
-- Vor dem Livegang werden sie durch recherchierte Einträge ersetzt:
--   delete ... where source = 'example' (als Entwurf) bzw. archivieren und purge_list_entry().
-- Jobbörsen sind echte Anbieter aus dem Prototyp; checked_at bleibt leer, bis Patrick jede Adresse geöffnet hat.

-- Preise der Pässe in Cent, mit den Preis-IDs aus dem Stripe-TESTMODUS.
-- Die Live-IDs werden vor dem Verkaufsstart im Admin-Bereich eingetragen, nicht hier.
insert into public.prices (plan, pass_length, amount_cents, stripe_price_id) values
  ('starter', 'month', 1400, 'price_1UMwaz2feYLU6PH2AtdiMiZy'),
  ('starter', 'quarter', 3600, 'price_1UMwiD2feYLU6PH2K96cmnQt'),
  ('plus', 'month', 2900, 'price_1UMwj12feYLU6PH2iuR0iAo7'),
  ('plus', 'quarter', 7500, 'price_1UMwjc2feYLU6PH2aPNAPFvp');

-- Lokal ist der Verkauf eingeschaltet, damit sich die Bezahlung im Stripe-Testmodus durchspielen lässt.
update public.launch_settings set sales_enabled = true;

-- Wortlaut der Zustimmung beim Kauf, aus dem Prototyp. ENTWURF: der rechtlich geprüfte Wortlaut
-- wird vor dem Verkaufsstart als neue Fassung im Admin-Bereich angelegt, nicht hier.
insert into public.consent_texts (version, language, body, active) values
  ('2026-10-03-prototype', 'en', 'I want access to start immediately. I understand that I lose my right of withdrawal once access has started.', true);

-- Wortlaute der freiwilligen Einwilligungen (Newsletter, Talentpool), aus dem Prototyp. ENTWURF: die
-- geprüften Wortlaute werden vor dem Start im Admin-Bereich als neue Fassung angelegt, nicht hier.
-- Ohne aktive Fassung zeigt das Portal das jeweilige Häkchen nicht an.
insert into public.marketing_consent_texts (kind, version, language, body, active) values
  ('newsletter', '2026-10-05-prototype', 'en', 'Send me the Onboard Germany newsletter with job search tips and news. You can unsubscribe at any time.', true),
  ('talent_pool', '2026-10-05-prototype', 'en', 'Let me know when the Onboard Germany talent pool opens.', true);

-- Lokal gehen Hinweise der täglichen Funktion an das Testkonto des Admins.
insert into public.app_settings (key, value) values ('admin_notify_email', 'admin@example.com');

-- Checklisten. Feste IDs: Der Fortschritt der Nutzer hängt an der ID des Punkts.
insert into public.checklists (id, key, title, area, legal_note, sort) values
  (md5('seed:checklist:cv')::uuid, 'cv', 'CV checklist', 'cv', null, 1),
  (md5('seed:checklist:linkedin')::uuid, 'linkedin', 'LinkedIn', 'linkedin', null, 2),
  (md5('seed:checklist:xing')::uuid, 'xing', 'XING', 'linkedin', null, 3),
  (md5('seed:checklist:visa_chancenkarte')::uuid, 'visa_chancenkarte', 'Chancenkarte', 'checklist', 'Legal basis: Section 20a(4) AufenthG on the required evidence, Section 82(1) AufenthG on the duty to cooperate in obtaining evidence.', 4),
  (md5('seed:checklist:after_offer')::uuid, 'after_offer', 'From offer to first day', 'arrival', null, 5);

insert into public.checklist_items
  (id, checklist_id, section, title, description, example, link_label, link_target, min_plan, sort) values
  (md5('seed:item:cv:Tabular layout, newest first')::uuid, md5('seed:checklist:cv')::uuid, null, 'Tabular layout, newest first', 'Short entries with dates on the left, starting with your current or most recent position.', null, null, null, 'free', 1),
  (md5('seed:item:cv:Two pages at most')::uuid, md5('seed:checklist:cv')::uuid, null, 'Two pages at most', 'Enough for most professionals. Leave out school details beyond your highest school leaving certificate.', null, null, null, 'free', 2),
  (md5('seed:item:cv:Photo decided on purpose')::uuid, md5('seed:checklist:cv')::uuid, null, 'Photo decided on purpose', 'Either a recent professional portrait or no photo at all. Both are accepted.', null, null, null, 'free', 3),
  (md5('seed:item:cv:Gaps explained')::uuid, md5('seed:checklist:cv')::uuid, null, 'Gaps explained', 'A short line for every gap of several months, for example language course or relocation.', null, null, null, 'free', 4),
  (md5('seed:item:cv:Recognition noted')::uuid, md5('seed:checklist:cv')::uuid, null, 'Recognition noted', 'If your qualification has been recognised in Germany, say so next to it.', null, null, null, 'free', 5),
  (md5('seed:item:cv:Languages with level')::uuid, md5('seed:checklist:cv')::uuid, null, 'Languages with level', 'German and English with the CEFR level, for example German B1.', null, null, null, 'free', 6),
  (md5('seed:item:cv:Same dates as LinkedIn and XING')::uuid, md5('seed:checklist:cv')::uuid, null, 'Same dates as LinkedIn and XING', 'Recruiters compare them. Differences raise questions.', null, null, null, 'free', 7),
  (md5('seed:item:cv:PDF with a clear file name')::uuid, md5('seed:checklist:cv')::uuid, null, 'PDF with a clear file name', 'For example Firstname_Lastname_CV.pdf, not cv_final2.pdf.', null, null, null, 'free', 8),
  (md5('seed:item:linkedin:Professional photo')::uuid, md5('seed:checklist:linkedin')::uuid, 'Basics', 'Professional photo', 'A recent portrait with a neutral background, your face filling most of the frame. Profiles without a photo are opened less often.', null, null, null, 'free', 1),
  (md5('seed:item:linkedin:Headline with your job title')::uuid, md5('seed:checklist:linkedin')::uuid, 'Basics', 'Headline with your job title', 'Recruiters search by job title. Put the position you want into the headline, then your specialisation and your plan for Germany.', 'Formula: [Job title] | [Specialisation or key skills] | [Industry] | Moving to Germany

Backend Developer | Java, Spring Boot | Fintech | Moving to Germany
Registered Nurse | Intensive Care | German B2 | Moving to Germany
Mechanical Engineer | Product Design, CAD | Automotive | Moving to Germany', null, null, 'free', 2),
  (md5('seed:item:linkedin:Location and willingness to relocate')::uuid, md5('seed:checklist:linkedin')::uuid, 'Basics', 'Location and willingness to relocate', 'Give your current location honestly. Name the cities or regions in Germany you are targeting in your About section and in your job preferences.', null, null, null, 'free', 3),
  (md5('seed:item:linkedin:Personal profile URL')::uuid, md5('seed:checklist:linkedin')::uuid, 'Basics', 'Personal profile URL', 'Change the automatic address to linkedin.com/in/firstname-lastname and put it in the header of your CV.', null, null, null, 'free', 4),
  (md5('seed:item:linkedin:Background banner')::uuid, md5('seed:checklist:linkedin')::uuid, 'Basics', 'Background banner', 'Optional. A calm image related to your field, or a plain colour. It is the first thing next to your photo.', null, null, null, 'free', 5),
  (md5('seed:item:linkedin:Contact details')::uuid, md5('seed:checklist:linkedin')::uuid, 'Basics', 'Contact details', 'Add the email address you use for applications, so recruiters can reach you without a paid message.', null, null, null, 'free', 6),
  (md5('seed:item:linkedin:About section with your plan for Germany')::uuid, md5('seed:checklist:linkedin')::uuid, 'Content', 'About section with your plan for Germany', 'Four short paragraphs: what you do, what you have achieved, your plan for Germany, and what you are looking for.', 'I am a [job title] with [X] years of experience in [field], specialised in [specialisation].

In my current role at [company] I [main responsibility]. [One result with a number, for example: I reduced delivery times by 20 percent.]

I am moving to Germany [time frame] and hold [residence status, for example a Chancenkarte, or: my degree has been recognised in Germany]. My German is at level [B1], my English at [C1].

I am looking for a position as [job title] in [city or region]. You can reach me at [email address].', null, null, 'starter', 7),
  (md5('seed:item:linkedin:Experience with results')::uuid, md5('seed:checklist:linkedin')::uuid, 'Content', 'Experience with results', 'Two or three results per position instead of a list of duties, with numbers where you have them. Dates must match your CV.', 'Formula: [Action] + [what] + [result, ideally with a number]

Cut deployment time from two hours to fifteen minutes by introducing automated pipelines.
Cared for up to twelve patients per shift on a 30-bed intensive care unit.
Led the redesign of a gearbox housing, reducing weight by 8 percent.', null, null, 'starter', 8),
  (md5('seed:item:linkedin:Skills from German job ads')::uuid, md5('seed:checklist:linkedin')::uuid, 'Content', 'Skills from German job ads', 'Collect the skills that come up repeatedly in job ads for your position and list the ones you really have. Put the five most important ones first.', null, null, null, 'starter', 9),
  (md5('seed:item:linkedin:Languages with level')::uuid, md5('seed:checklist:linkedin')::uuid, 'Content', 'Languages with level', 'German and English with the CEFR level, for example German B1. Recruiters filter by it.', null, null, null, 'starter', 10),
  (md5('seed:item:linkedin:Education, certificates and recognition')::uuid, md5('seed:checklist:linkedin')::uuid, 'Content', 'Education, certificates and recognition', 'Add your degree with its original name and a short English explanation. Add German courses and certificates. If your qualification has been recognised in Germany, say so in the description.', null, null, null, 'starter', 11),
  (md5('seed:item:linkedin:Featured section')::uuid, md5('seed:checklist:linkedin')::uuid, 'Content', 'Featured section', 'Pin work samples: a portfolio, a project, a publication, a certificate. Do not upload documents with personal data such as ID numbers.', null, null, null, 'starter', 12),
  (md5('seed:item:linkedin:Recommendations from supervisors and colleagues')::uuid, md5('seed:checklist:linkedin')::uuid, 'Visibility and network', 'Recommendations from supervisors and colleagues', 'Ask two or three people who know your work well: ideally a supervisor, a colleague and, if relevant, a client. A supervisor’s recommendation confirms your role and your results.', 'Hi [name],

I hope you are well. I am applying for jobs in Germany and would really appreciate a short LinkedIn recommendation from you. You know my work from [project or period] best.

If it helps, you could mention [one or two points, for example how I handled the X project].

I am happy to write one for you as well. Thank you!

[Your first name]', null, null, 'starter', 13),
  (md5('seed:item:linkedin:Skill endorsements')::uuid, md5('seed:checklist:linkedin')::uuid, 'Visibility and network', 'Skill endorsements', 'Ask colleagues to endorse your top five skills. Endorse theirs in return, it often comes back.', null, null, null, 'starter', 14),
  (md5('seed:item:linkedin:Connect with recruiters in your field')::uuid, md5('seed:checklist:linkedin')::uuid, 'Visibility and network', 'Connect with recruiters in your field', 'Search for recruiters who hire for your position in Germany and send a short, personal invitation, never a blank one.', 'Hello [name],

I am a [job title] with [X] years of experience and I am moving to Germany [time frame]. I saw that you recruit [field] professionals in [region]. I would be glad to connect.

[Your first name]', null, null, 'starter', 15),
  (md5('seed:item:linkedin:Follow your target companies')::uuid, md5('seed:checklist:linkedin')::uuid, 'Visibility and network', 'Follow your target companies', 'Follow the companies you want to work for and comment on posts in your field now and then. Recruiters notice active profiles.', null, null, null, 'starter', 16),
  (md5('seed:item:linkedin:Open to work, visible to recruiters')::uuid, md5('seed:checklist:linkedin')::uuid, 'Visibility and network', 'Open to work, visible to recruiters', 'Activate it for recruiters only, with your target positions and locations in Germany.', null, null, null, 'starter', 17),
  (md5('seed:item:linkedin:Job alerts for Germany')::uuid, md5('seed:checklist:linkedin')::uuid, 'Visibility and network', 'Job alerts for Germany', 'Set alerts for your job title with the location Germany or your target cities, so new jobs come to you.', null, null, null, 'starter', 18),
  (md5('seed:item:linkedin:Profile in German')::uuid, md5('seed:checklist:linkedin')::uuid, 'Visibility and network', 'Profile in German', 'Once your German allows it, add a second profile language. Recruiters in Germany then see the German version.', null, null, null, 'starter', 19),
  (md5('seed:item:xing:Decide whether you need XING')::uuid, md5('seed:checklist:xing')::uuid, 'Basics', 'Decide whether you need XING', 'XING is mainly used in Germany, Austria and Switzerland. It is worth it if you target medium-sized German companies or roles where German is the working language. If not, mark this task as done on the overview.', null, null, null, 'free', 1),
  (md5('seed:item:xing:Professional photo')::uuid, md5('seed:checklist:xing')::uuid, 'Basics', 'Professional photo', 'Use the same photo as on LinkedIn. Recruiters who find you on both should recognise you at once.', null, null, null, 'free', 2),
  (md5('seed:item:xing:German job title')::uuid, md5('seed:checklist:xing')::uuid, 'Basics', 'German job title', 'Recruiters on XING search with German job titles. Use the title from German job ads for your position, not a translation of your current one.', 'English title → German title as recruiters search for it

Registered Nurse → Pflegefachkraft
Software Developer → Softwareentwickler / Softwareentwicklerin
Mechanical Engineer → Maschinenbauingenieur / Maschinenbauingenieurin
Logistics Planner → Disponent / Disponentin Logistik
Electrician → Elektroniker / Elektronikerin', null, null, 'free', 3),
  (md5('seed:item:xing:Location and willingness to relocate')::uuid, md5('seed:checklist:xing')::uuid, 'Basics', 'Location and willingness to relocate', 'Give your current location honestly and name the regions in Germany you are targeting in your profile text and job preferences.', null, null, null, 'free', 4),
  (md5('seed:item:xing:Contact settings')::uuid, md5('seed:checklist:xing')::uuid, 'Basics', 'Contact settings', 'Allow recruiters to contact you. Otherwise your profile is found but nobody can write to you.', null, null, null, 'free', 5),
  (md5('seed:item:xing:Profile text in German')::uuid, md5('seed:checklist:xing')::uuid, 'Content', 'Profile text in German', 'A few short sentences in simple German are better than a long English text on XING. Keep it at the level you really speak, it will be tested in the interview.', 'Ich bin [Berufsbezeichnung] mit [X] Jahren Berufserfahrung in [Bereich], spezialisiert auf [Schwerpunkt].

Derzeit arbeite ich bei [Unternehmen] und bin verantwortlich für [Aufgabe]. [Ein Ergebnis mit Zahl.]

Ich ziehe [Zeitraum] nach Deutschland. Mein Deutsch ist auf Niveau [B1], mein Englisch auf Niveau [C1].

Ich suche eine Stelle als [Berufsbezeichnung] in [Stadt oder Region].', null, null, 'starter', 6),
  (md5('seed:item:xing:Experience with results, in German')::uuid, md5('seed:checklist:xing')::uuid, 'Content', 'Experience with results, in German', 'Two or three results per position, with the same dates as in your CV and on LinkedIn. Recruiters compare them.', 'Muster: [Ergebnis] durch [Handlung]

Betreuung von bis zu zwölf Patientinnen und Patienten pro Schicht auf einer Intensivstation mit 30 Betten.
Verkürzung der Bereitstellungszeit von zwei Stunden auf 15 Minuten durch automatisierte Pipelines.
Gewichtsreduzierung eines Getriebegehäuses um 8 Prozent durch eine neue Konstruktion.', null, null, 'starter', 7),
  (md5('seed:item:xing:Skills with German terms')::uuid, md5('seed:checklist:xing')::uuid, 'Content', 'Skills with German terms', 'Use the terms from German job ads for your position. Recruiters search with them.', 'Beispiele aus deutschen Stellenanzeigen

Pflege: Grundpflege, Behandlungspflege, Wundversorgung, Pflegedokumentation
IT: Java, Spring Boot, Softwarearchitektur, agile Entwicklung
Ingenieurwesen: Konstruktion, CAD, technische Dokumentation, Inbetriebnahme', null, null, 'starter', 8),
  (md5('seed:item:xing:Languages with level')::uuid, md5('seed:checklist:xing')::uuid, 'Content', 'Languages with level', 'German and English with the CEFR level, the same as on LinkedIn and in your CV.', null, null, null, 'starter', 9),
  (md5('seed:item:xing:Education and recognition')::uuid, md5('seed:checklist:xing')::uuid, 'Content', 'Education and recognition', 'Your degree with its original name, the institution and the country. If your qualification has been recognised in Germany, add it.', '[Abschluss], [Hochschule oder Schule], [Land]
Anerkennung in Deutschland: [anerkannt / Verfahren läuft / noch nicht beantragt]', null, null, 'starter', 10),
  (md5('seed:item:xing:Job preferences')::uuid, md5('seed:checklist:xing')::uuid, 'Visibility and network', 'Job preferences', 'Enter the position, the regions in Germany and when you can start, so that you appear in recruiters’ searches.', null, null, null, 'starter', 11),
  (md5('seed:item:xing:Show that you are open to offers')::uuid, md5('seed:checklist:xing')::uuid, 'Visibility and network', 'Show that you are open to offers', 'Activate the setting that tells recruiters you are open to new jobs. Check in the settings who can see it.', null, null, null, 'starter', 12),
  (md5('seed:item:xing:Connect with recruiters')::uuid, md5('seed:checklist:xing')::uuid, 'Visibility and network', 'Connect with recruiters', 'Send a short personal invitation in German to recruiters who hire for your field in Germany.', 'Guten Tag [Name],

ich bin [Berufsbezeichnung] mit [X] Jahren Berufserfahrung und ziehe [Zeitraum] nach Deutschland. Ich habe gesehen, dass Sie Fachkräfte im Bereich [Bereich] für Unternehmen in [Region] suchen. Über eine Vernetzung würde ich mich freuen.

Viele Grüße
[Vorname Nachname]', null, null, 'starter', 13),
  (md5('seed:item:xing:Follow your target companies')::uuid, md5('seed:checklist:xing')::uuid, 'Visibility and network', 'Follow your target companies', 'Follow the companies you want to work for, so you see their news and new jobs.', null, null, null, 'starter', 14),
  (md5('seed:item:xing:Job alerts')::uuid, md5('seed:checklist:xing')::uuid, 'Visibility and network', 'Job alerts', 'Save a search for your German job title and your target regions, so new jobs come to you.', null, null, null, 'starter', 15),
  (md5('seed:item:visa_chancenkarte:Valid passport')::uuid, md5('seed:checklist:visa_chancenkarte')::uuid, null, 'Valid passport', 'With enough remaining validity for the planned stay.', null, null, null, 'free', 1),
  (md5('seed:item:visa_chancenkarte:Proof of qualification')::uuid, md5('seed:checklist:visa_chancenkarte')::uuid, null, 'Proof of qualification', 'As a skilled worker, proof of recognition or equivalence. On the points route, proof of state recognition in your home country and confirmation by a competent body in Germany.', null, null, null, 'free', 2),
  (md5('seed:item:visa_chancenkarte:Language certificate')::uuid, md5('seed:checklist:visa_chancenkarte')::uuid, null, 'Language certificate', 'On the points route, at least basic German or English at level B2, plus certificates for the levels you claim points for.', null, null, null, 'free', 3),
  (md5('seed:item:visa_chancenkarte:Proof of financial means')::uuid, md5('seed:checklist:visa_chancenkarte')::uuid, null, 'Proof of financial means', 'Blocked account, formal obligation or an employment contract of no more than 20 hours a week.', null, null, null, 'free', 4),
  (md5('seed:item:visa_chancenkarte:Health insurance')::uuid, md5('seed:checklist:visa_chancenkarte')::uuid, null, 'Health insurance', 'As separate proof alongside your financial means.', null, null, null, 'free', 5),
  (md5('seed:item:visa_chancenkarte:Evidence for the points you claim')::uuid, md5('seed:checklist:visa_chancenkarte')::uuid, null, 'Evidence for the points you claim', 'Employment references for work experience, a notice of partial recognition where applicable, proof of an earlier stay in Germany and your partner’s documents.', null, null, null, 'free', 6),
  (md5('seed:item:after_offer:Signed employment contract')::uuid, md5('seed:checklist:after_offer')::uuid, 'Before you travel', 'Signed employment contract', 'You need it for the visa application. Keep the signed copy ready as a PDF and on paper.', null, null, null, 'free', 1),
  (md5('seed:item:after_offer:Visa appointment')::uuid, md5('seed:checklist:after_offer')::uuid, 'Before you travel', 'Visa appointment', 'Book the appointment at the German mission early. Waiting times differ a lot between countries.', null, 'Open your visa checklist', 'portal:checklist', 'free', 2),
  (md5('seed:item:after_offer:Health insurance from day one')::uuid, md5('seed:checklist:after_offer')::uuid, 'Before you travel', 'Health insurance from day one', 'Make sure you are insured from the day you arrive, not only from your first working day.', null, 'Health insurance hub on onboard-germany.de', 'https://onboard-germany.de/', 'free', 3),
  (md5('seed:item:after_offer:Temporary accommodation')::uuid, md5('seed:checklist:after_offer')::uuid, 'Before you travel', 'Temporary accommodation', 'Book a furnished room or apartment for the first weeks. Looking for a long-term flat is easier once you are in Germany.', null, null, null, 'free', 4),
  (md5('seed:item:after_offer:Documents to take with you')::uuid, md5('seed:checklist:after_offer')::uuid, 'Before you travel', 'Documents to take with you', 'Originals of your certificates, birth certificate and, if married, marriage certificate, with the translations you already have.', null, 'Documents and translations hub', 'https://onboard-germany.de/', 'free', 5),
  (md5('seed:item:after_offer:Register your address')::uuid, md5('seed:checklist:after_offer')::uuid, 'Your first weeks in Germany', 'Register your address', 'Register at the local registration office (Bürgeramt). You need the landlord’s confirmation of moving in (Wohnungsgeberbestätigung).', null, null, null, 'free', 6),
  (md5('seed:item:after_offer:Open a bank account')::uuid, md5('seed:checklist:after_offer')::uuid, 'Your first weeks in Germany', 'Open a bank account', 'For your salary you need a German or EU account. Many banks ask for your registration certificate.', null, null, null, 'free', 7),
  (md5('seed:item:after_offer:Tax ID')::uuid, md5('seed:checklist:after_offer')::uuid, 'Your first weeks in Germany', 'Tax ID', 'After you register, your tax identification number arrives by post. Your employer needs it for payroll.', null, null, null, 'free', 8),
  (md5('seed:item:after_offer:Residence permit')::uuid, md5('seed:checklist:after_offer')::uuid, 'Your first weeks in Germany', 'Residence permit', 'Depending on your visa, the next step is an appointment at the immigration office (Ausländerbehörde). Book it early.', null, null, null, 'free', 9),
  (md5('seed:item:after_offer:Long-term flat')::uuid, md5('seed:checklist:after_offer')::uuid, 'Settling in', 'Long-term flat', 'Landlords usually ask for proof of income, ID and a credit report (SCHUFA). Your employment contract helps.', null, null, null, 'free', 10),
  (md5('seed:item:after_offer:Phone and internet')::uuid, md5('seed:checklist:after_offer')::uuid, 'Settling in', 'Phone and internet', 'A prepaid SIM works from day one. Contracts often need a German bank account.', null, null, null, 'free', 11),
  (md5('seed:item:after_offer:German course')::uuid, md5('seed:checklist:after_offer')::uuid, 'Settling in', 'German course', 'Even with English at work, everyday life is in German.', null, 'German for the job', 'portal:german', 'free', 12),
  (md5('seed:item:after_offer:Family')::uuid, md5('seed:checklist:after_offer')::uuid, 'Settling in', 'Family', 'If your family is to follow you, check the requirements for family reunification early.', null, 'Family reunification hub', 'https://onboard-germany.de/', 'free', 13);

-- Leitfäden. Drei haben im Prototyp einen Text; die übrigen vier stehen dort nur mit Titel und
-- Kurzbeschreibung ("added when the portal is built") und bleiben unveröffentlicht, bis der Text vorliegt.
insert into public.articles (slug, area, title, lead, body, min_plan, sort, published) values
  ('german-cv', 'cv', 'The German CV: what employers expect', 'A German CV, the Lebenslauf, follows conventions that differ from many other countries. Getting them right will not win you the job, but getting them wrong can cost you the interview.', '## Format and length

German employers expect a tabular CV: short entries with dates on the left and the role or qualification on the right. Most CVs list experience in reverse order, starting with the current or most recent position. For most professionals two pages are enough.

## The photo

A professional photo is still common in Germany, but it is not required. Many international companies prefer applications without one. If you include a photo, use a recent portrait taken for this purpose, not a cropped holiday picture.

> **Tip:** If your degree has been recognised in Germany, say so next to the qualification. It answers a question the recruiter would otherwise have to ask.

## Gaps in your CV

Recruiters notice gaps of several months. A short line explaining the period, for example language course, relocation or caring for a family member, is better than leaving it open.', 'free', 1, true),
  ('cover-letter-germany', 'cv', 'The cover letter in Germany', 'Structure, length and the mistakes that cost interviews.', '', 'starter', 2, false),
  ('recognition-and-certificates', 'cv', 'Recognition and certificates in your application', 'How to present foreign degrees and references so that they are understood.', '', 'starter', 3, false),
  ('recruitment-agencies', 'agencies', 'Recruitment agencies: how they can help', 'Agencies know employers who are hiring before the job ad goes online, and some specialise in candidates from abroad. Before you register, you should know which kind of agency you are dealing with.', '## Two ways agencies work

**Direct placement.** The agency finds you a job, and you sign your employment contract with the company. The fee is usually paid by the employer. Headhunters and specialised recruiters mostly work this way.

**Temporary agency work.** You are employed by the agency and work at one of its client companies. In Germany this is called Zeitarbeit or Arbeitnehmerüberlassung.

> [!IMPORTANT]
> **Important for your visa.** Where your residence permit needs the approval of the Federal Employment Agency, that approval must be refused if you are to work as a temporary agency worker. It must also be refused if the job came about through unauthorised placement or recruitment.
>
> Ask the agency at the start whether it places you directly with the employer.

*Legal basis: Section 40(1) no. 1 and 2 AufenthG.*

## How to apply through an agency

- Register on the agency''s website with your CV in German format, or reply to one of its job ads.
- Expect a first call with the recruiter before your profile goes to an employer. Use it like a job interview.
- Be clear about your residence status, your German level and when you can start. It saves both sides time.
- Prefer agencies that specialise in your field. They know which employers hire from abroad.

## What an agency can do for you

A good recruiter matches you with suitable employers, prepares you for the interview, gives feedback after it and can negotiate the salary on your behalf. Be cautious if an agency asks you to pay in advance.', 'starter', 1, true),
  ('contract-and-visa', 'contract', 'Your contract and your visa', null, '> [!IMPORTANT]
> **Working conditions.** Where your residence permit needs the approval of the Federal Employment Agency, you must not be employed on less favourable terms than comparable employees in Germany. The approval can be withdrawn if that changes later.

*Legal basis: Section 39(2) sentence 1 no. 1 and (3) no. 1 AufenthG on the approval, Section 41 AufenthG on the withdrawal.*', 'starter', 1, true),
  ('interview-preparation', 'interview', 'Preparing for a job interview in Germany', 'How interviews are structured, typical questions and what you should ask.', '', 'starter', 1, false),
  ('guide-first-job', 'guide', 'Guide: Land your first job in Germany', 'The complete guide, chapter by chapter.', '', 'starter', 1, false);

-- Vorlagen. Die Dateien selbst liefert Patrick; bis dahin liegt unter file_path noch nichts im Speicherbereich.
insert into public.templates (title, description, format, file_path, area, min_plan, sort) values
  ('CV template, German format', 'Tabular layout on two pages, with a note on each section.', 'docx', 'cv-template-german-format.docx', 'cv', 'starter', 1),
  ('Cover letter template', 'One page, structured the way German recruiters read it.', 'docx', 'cover-letter-template.docx', 'cv', 'starter', 2),
  ('Sample CV', 'A completed example to compare your own CV against.', 'pdf', 'sample-cv.pdf', 'cv', 'starter', 3),
  ('Follow-up email template', 'For asking about the status of your application.', 'docx', 'follow-up-email-template.docx', 'cv', 'starter', 4);

-- Formulierungen: Anschreiben in Free, alles andere ab Starter. Fachvokabular ohne field ist das allgemeine.
insert into public.phrases (category, field, german, english, usage, min_plan, sort) values
  ('cover_letter', null, 'Sehr geehrte Frau Becker,', 'Dear Ms Becker,', 'Opening when you know the name. Without a name: Sehr geehrte Damen und Herren,', 'free', 1),
  ('cover_letter', null, 'hiermit bewerbe ich mich um die Stelle als ... (Kennziffer 1234).', 'I am applying for the position of ... (reference 1234).', 'First sentence. Include the reference number if the ad has one.', 'free', 2),
  ('cover_letter', null, 'Derzeit arbeite ich als ... bei ...', 'I currently work as ... at ...', 'Your current role, early in the letter.', 'free', 3),
  ('cover_letter', null, 'Ab dem 1. März stehe ich Ihnen zur Verfügung.', 'I am available from 1 March.', 'Your start date, near the end.', 'free', 4),
  ('cover_letter', null, 'Über eine Einladung zu einem Vorstellungsgespräch freue ich mich.', 'I look forward to an invitation to an interview.', 'Last sentence before the sign-off.', 'free', 5),
  ('cover_letter', null, 'Mit freundlichen Grüßen', 'Kind regards', 'Sign-off, without a comma after it.', 'free', 6),
  ('phone', null, 'Guten Tag, mein Name ist ... Ich rufe wegen Ihrer Stellenanzeige als ... an.', 'Hello, my name is ... I am calling about your job ad for ...', 'Opening of the call.', 'starter', 1),
  ('phone', null, 'Ich habe mich am 22. September beworben und wollte fragen, wie der Stand ist.', 'I applied on 22 September and wanted to ask about the status.', 'Follow-up call.', 'starter', 2),
  ('phone', null, 'Könnten Sie das bitte noch einmal wiederholen?', 'Could you repeat that, please?', 'When you did not understand. Better than guessing.', 'starter', 3),
  ('phone', null, 'Könnten Sie mir das bitte per E-Mail schicken?', 'Could you send me that by email, please?', 'For dates, addresses and names.', 'starter', 4),
  ('phone', null, 'Vielen Dank, auf Wiederhören.', 'Thank you, goodbye.', 'Goodbye on the phone. Auf Wiedersehen is for meeting in person.', 'starter', 5),
  ('interview', null, 'Ich habe fünf Jahre Berufserfahrung als ...', 'I have five years of experience as ...', 'Introducing yourself.', 'starter', 1),
  ('interview', null, 'In meiner jetzigen Position bin ich verantwortlich für ...', 'In my current position I am responsible for ...', 'Describing your role.', 'starter', 2),
  ('interview', null, 'Darf ich mir kurz Notizen machen?', 'May I take a few notes?', 'At the start. It comes across as prepared, not unsure.', 'starter', 3),
  ('interview', null, 'Wie sieht die Einarbeitung aus?', 'What does the onboarding look like?', 'Your own question at the end.', 'starter', 4),
  ('interview', null, 'Wann kann ich mit einer Rückmeldung rechnen?', 'When can I expect to hear from you?', 'Closing question.', 'starter', 5),
  ('vocabulary', 'nursing_care', 'Schichtdienst', 'Shift work', 'Early, late and night shifts.', 'starter', 1),
  ('vocabulary', 'nursing_care', 'Übergabe', 'Handover', 'Between two shifts.', 'starter', 2),
  ('vocabulary', 'nursing_care', 'Pflegedokumentation', 'Care documentation', 'Everything you do is recorded.', 'starter', 3),
  ('vocabulary', 'nursing_care', 'Grundpflege', 'Basic care', 'Washing, dressing, eating.', 'starter', 4),
  ('vocabulary', 'nursing_care', 'Behandlungspflege', 'Medical care', 'Wound care, medication, injections.', 'starter', 5),
  ('vocabulary', 'nursing_care', 'Praxisanleitung', 'Practical supervision', 'Guidance from an experienced colleague.', 'starter', 6),
  ('vocabulary', 'it', 'Einarbeitung', 'Onboarding', 'The first weeks in the team.', 'starter', 1),
  ('vocabulary', 'it', 'Festanstellung', 'Permanent employment', 'As opposed to freelance work.', 'starter', 2),
  ('vocabulary', 'it', 'Mobiles Arbeiten', 'Remote work', 'Often also called Homeoffice.', 'starter', 3),
  ('vocabulary', 'it', 'Rufbereitschaft', 'On-call duty', 'Common in operations roles.', 'starter', 4),
  ('vocabulary', 'it', 'Fachbereich', 'Business department', 'The users you build for.', 'starter', 5),
  ('vocabulary', 'engineering', 'Lastenheft', 'Requirements specification', 'What the customer wants.', 'starter', 1),
  ('vocabulary', 'engineering', 'Pflichtenheft', 'Functional specification', 'How you will deliver it.', 'starter', 2),
  ('vocabulary', 'engineering', 'Konstruktion', 'Design engineering', 'The design department.', 'starter', 3),
  ('vocabulary', 'engineering', 'Inbetriebnahme', 'Commissioning', 'Putting a plant or machine into operation.', 'starter', 4),
  ('vocabulary', 'engineering', 'Instandhaltung', 'Maintenance', 'Servicing and repair.', 'starter', 5),
  ('vocabulary', null, 'Vorstellungsgespräch', 'Job interview', null, 'starter', 1),
  ('vocabulary', null, 'Gehaltsvorstellung', 'Salary expectation', 'Often asked for in the job ad.', 'starter', 2),
  ('vocabulary', null, 'Arbeitszeugnis', 'Employment reference', 'Written reference from a former employer.', 'starter', 3),
  ('vocabulary', null, 'Einarbeitung', 'Onboarding', 'The first weeks in a new job.', 'starter', 4),
  ('vocabulary', null, 'Probezeit', 'Probation period', 'The first months of employment.', 'starter', 5);

-- Vertragsglossar.
insert into public.glossary_terms (term_de, term_en, what, look_for, sort) values
  ('Probezeit', 'Probation period', 'The first months of employment, during which both sides can end the contract more easily.', 'how long it lasts and which notice period applies during it.', 1),
  ('Kündigungsfrist', 'Notice period', 'The time between giving notice and the end of employment.', 'the period for you and for the employer, and whether it refers to the law or a collective agreement.', 2),
  ('Befristung', 'Fixed term', 'A contract that ends on a set date or when a project ends.', 'the end date, and whether your residence permit depends on the duration of the contract.', 3),
  ('Arbeitszeit und Überstunden', 'Working hours and overtime', 'Weekly hours and how extra hours are treated.', 'whether overtime is paid, compensated with time off or included in the salary.', 4),
  ('Urlaub', 'Holiday', 'Your paid days off per year.', 'the number of days and whether they are working days or calendar days.', 5),
  ('Vergütung', 'Pay', 'Your gross salary and any extras such as bonuses, holiday pay or a 13th month.', 'the gross amount per month or year, and which parts are guaranteed.', 6),
  ('Tarifvertrag', 'Collective agreement', 'An agreement between employers and unions that sets pay and conditions for a sector.', 'whether the contract refers to one. Then many conditions are set there, not in the contract itself.', 7);

-- Jobbörsen: allgemeine in Free, alle anderen ab Starter.
insert into public.job_boards (name, website, category, focus, status, source, min_plan) values
  ('StepStone', 'https://stepstone.de', 'General', 'All industries, strong for professionals', 'published', 'prototype', 'free'),
  ('Indeed', 'https://indeed.de', 'General', 'All industries, large volume', 'published', 'prototype', 'free'),
  ('LinkedIn Jobs', 'https://linkedin.com/jobs', 'General', 'All industries, international employers', 'published', 'prototype', 'free'),
  ('XING Jobs', 'https://xing.com/jobs', 'General', 'All industries, German-speaking market', 'published', 'prototype', 'free'),
  ('Jobsuche der Bundesagentur für Arbeit', 'https://arbeitsagentur.de/jobsuche', 'General', 'Public job board of the Federal Employment Agency', 'published', 'prototype', 'free'),
  ('Make it in Germany', 'https://make-it-in-germany.com', 'International', 'Official portal for skilled workers from abroad', 'published', 'prototype', 'starter'),
  ('Arbeitnow', 'https://arbeitnow.com', 'International', 'Filters for English-speaking jobs and visa sponsorship', 'published', 'prototype', 'starter'),
  ('GermanTechJobs', 'https://germantechjobs.de', 'IT', 'Software development and IT', 'published', 'prototype', 'starter'),
  ('Berlin Startup Jobs', 'https://berlinstartupjobs.com', 'IT', 'Start-ups in Berlin', 'published', 'prototype', 'starter'),
  ('ingenieur.de', 'https://ingenieur.de', 'Engineering', 'Engineering jobs', 'published', 'prototype', 'starter'),
  ('academics', 'https://academics.de', 'Research', 'Research, universities and science', 'published', 'prototype', 'starter');

-- BEISPIELDATEN: Personaldienstleister. Generalisten ab Starter, spezialisierte in Plus.
insert into public.agencies (name, website, field, model, recruits_abroad, region, specialised, status, source, min_plan) values
  ('Beispiel Personal GmbH', 'https://example.com/agencies/personal-gmbh', null, 'both', false, 'Nationwide', false, 'published', 'example', 'starter'),
  ('Beispiel Executive Search', 'https://example.com/agencies/executive-search', null, 'direct', true, 'Nationwide', false, 'published', 'example', 'starter'),
  ('Beispiel Zeitarbeit AG', 'https://example.com/agencies/zeitarbeit-ag', null, 'temp', false, 'Nationwide', false, 'published', 'example', 'starter'),
  ('Beispiel IT Recruiting', 'https://example.com/agencies/it-recruiting', 'it', 'direct', true, 'Berlin, Munich', true, 'published', 'example', 'plus'),
  ('Beispiel Care Recruitment', 'https://example.com/agencies/care-recruitment', 'nursing_care', 'direct', true, 'Nationwide', true, 'published', 'example', 'plus'),
  ('Beispiel Engineering Talents', 'https://example.com/agencies/engineering-talents', 'engineering', 'direct', true, 'South Germany', true, 'published', 'example', 'plus'),
  ('Beispiel Tech Staffing', 'https://example.com/agencies/tech-staffing', 'it', 'temp', false, 'North Rhine-Westphalia', true, 'published', 'example', 'plus');

-- BEISPIELDATEN: Unternehmen. Das Prüfdatum bleibt relativ zum heutigen Tag, damit die Liste lokal aktuell wirkt.
insert into public.companies (id, name, website, domain, industry, employer_type, region, signals, status, source, checked_at) values
  (md5('seed:company:Beispiel Software AG')::uuid, 'Beispiel Software AG', 'https://beispiel-software.example', 'beispiel-software.example', 'it', null, 'Bavaria', '{english_ads,relocation_support}', 'published', 'example', public.portal_today() - 4),
  (md5('seed:company:Beispiel Cloud GmbH')::uuid, 'Beispiel Cloud GmbH', 'https://beispiel-cloud.example', 'beispiel-cloud.example', 'it', null, 'Berlin', '{english_ads,visa_support}', 'published', 'example', public.portal_today() - 7),
  (md5('seed:company:Beispiel Maschinenbau KG')::uuid, 'Beispiel Maschinenbau KG', 'https://beispiel-maschinenbau.example', 'beispiel-maschinenbau.example', 'engineering', null, 'Baden-Württemberg', '{relocation_support}', 'published', 'example', public.portal_today() - 9),
  (md5('seed:company:Beispiel Klinikum')::uuid, 'Beispiel Klinikum', 'https://beispiel-klinikum.example', 'beispiel-klinikum.example', 'nursing_care', 'hospital', 'North Rhine-Westphalia', '{relocation_support,recognition_partnership}', 'published', 'example', public.portal_today() - 11),
  (md5('seed:company:Beispiel Seniorenresidenz')::uuid, 'Beispiel Seniorenresidenz', 'https://beispiel-seniorenresidenz.example', 'beispiel-seniorenresidenz.example', 'nursing_care', 'care_home', 'Saxony', '{recognition_partnership}', 'published', 'example', public.portal_today() - 6),
  (md5('seed:company:Beispiel Pflegedienst')::uuid, 'Beispiel Pflegedienst', 'https://beispiel-pflegedienst.example', 'beispiel-pflegedienst.example', 'nursing_care', 'outpatient', 'Lower Saxony', '{relocation_support}', 'published', 'example', public.portal_today() - 13),
  (md5('seed:company:Beispiel Medizintechnik GmbH')::uuid, 'Beispiel Medizintechnik GmbH', 'https://beispiel-medizintechnik.example', 'beispiel-medizintechnik.example', 'healthcare', null, 'Schleswig-Holstein', '{english_ads}', 'published', 'example', public.portal_today() - 15),
  (md5('seed:company:Beispiel Logistik GmbH')::uuid, 'Beispiel Logistik GmbH', 'https://beispiel-logistik.example', 'beispiel-logistik.example', 'logistics', null, 'Hamburg', '{english_ads}', 'published', 'example', public.portal_today() - 14),
  (md5('seed:company:Beispiel Energie GmbH')::uuid, 'Beispiel Energie GmbH', 'https://beispiel-energie.example', 'beispiel-energie.example', 'engineering', null, 'Hesse', '{english_ads}', 'published', 'example', public.portal_today() - 18);

-- BEISPIELDATEN: Jobs. Das Datum bleibt relativ zum heutigen Tag, sonst wären sie nach 30 Tagen abgelaufen.
insert into public.jobs (title, company_name, company_id, location, industry, employer_type, signals, url, posted_on, status, source) values
  ('Senior Backend Engineer (Go)', 'Beispiel Cloud GmbH', md5('seed:company:Beispiel Cloud GmbH')::uuid, 'Berlin', 'it', null, '{english_ads,visa_support}', 'https://example.com/jobs/senior-backend-engineer-go', public.portal_today() - 1, 'published', 'example'),
  ('Data Analyst', 'Beispiel Software AG', md5('seed:company:Beispiel Software AG')::uuid, 'Munich', 'it', null, '{english_ads,relocation_support}', 'https://example.com/jobs/data-analyst', public.portal_today() - 2, 'published', 'example'),
  ('Pflegefachkraft Intensivstation', 'Beispiel Klinikum', md5('seed:company:Beispiel Klinikum')::uuid, 'Cologne', 'nursing_care', 'hospital', '{relocation_support,recognition_partnership}', 'https://example.com/jobs/pflegefachkraft-intensivstation', public.portal_today() - 3, 'published', 'example'),
  ('Pflegefachkraft Altenpflege', 'Beispiel Seniorenresidenz', md5('seed:company:Beispiel Seniorenresidenz')::uuid, 'Leipzig', 'nursing_care', 'care_home', '{recognition_partnership}', 'https://example.com/jobs/pflegefachkraft-altenpflege', public.portal_today() - 1, 'published', 'example'),
  ('Registered Nurse, Outpatient Care', 'Beispiel Pflegedienst', md5('seed:company:Beispiel Pflegedienst')::uuid, 'Hanover', 'nursing_care', 'outpatient', '{english_ads,relocation_support}', 'https://example.com/jobs/registered-nurse-outpatient-care', public.portal_today() - 4, 'published', 'example'),
  ('Pflegefachkraft Kardiologie', 'Beispiel Klinikum', md5('seed:company:Beispiel Klinikum')::uuid, 'Cologne', 'nursing_care', 'hospital', '{recognition_partnership,visa_support}', 'https://example.com/jobs/pflegefachkraft-kardiologie', public.portal_today() - 7, 'published', 'example'),
  ('Mechanical Design Engineer', 'Beispiel Maschinenbau KG', md5('seed:company:Beispiel Maschinenbau KG')::uuid, 'Stuttgart', 'engineering', null, '{english_ads,relocation_support}', 'https://example.com/jobs/mechanical-design-engineer', public.portal_today() - 5, 'published', 'example'),
  ('Logistics Planner', 'Beispiel Logistik GmbH', md5('seed:company:Beispiel Logistik GmbH')::uuid, 'Hamburg', 'logistics', null, '{english_ads}', 'https://example.com/jobs/logistics-planner', public.portal_today() - 8, 'published', 'example'),
  ('Electrical Engineer, Grid Projects', 'Beispiel Energie GmbH', md5('seed:company:Beispiel Energie GmbH')::uuid, 'Frankfurt', 'engineering', null, '{english_ads}', 'https://example.com/jobs/electrical-engineer-grid-projects', public.portal_today() - 11, 'published', 'example');

-- ---------------------------------------------------------------------------------------------
-- LOKALE TESTKONTEN – nur für die Entwicklung, nie für die Produktion.
-- Diese Datei wird ausschließlich von der Supabase CLI in die lokale Datenbank geladen.
-- Passwort und TOTP-Geheimnis stehen hier im Klartext und sind deshalb außerhalb der lokalen
-- Umgebung wertlos zu halten: nie auf einem erreichbaren Server verwenden.
--
--   free@example.com     Kandidat, Free
--   starter@example.com  Kandidat, Starter-Pass (1 Monat, noch 20 Tage)
--   plus@example.com     Kandidat, Plus-Pass (3 Monate, noch 60 Tage)
--   admin@example.com    Admin, zweiter Faktor (TOTP) bereits eingerichtet
-- ---------------------------------------------------------------------------------------------
do $$
declare
  dev_password constant text := 'onboard-local-dev';
  -- In eine Authenticator-App eintragen (manuelle Eingabe, Typ zeitbasiert), Konto admin@example.com.
  admin_totp_secret constant text := 'IAQGPKJAV4G5UMORXBNV4B63M4UTO2VG';
  today constant date := public.portal_today();
  u record;
  uid uuid;
begin
  for u in
    select * from (values
      ('free@example.com', 'Fiona', 'Free'),
      ('starter@example.com', 'Sam', 'Starter'),
      ('plus@example.com', 'Priya', 'Plus'),
      ('admin@example.com', 'Patrick', 'Admin')
    ) as t (email, first_name, last_name)
  loop
    uid := md5('seed:user:' || u.email)::uuid;

    insert into auth.users
      (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change, email_change_token_new)
    values
      (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email,
       extensions.crypt(dev_password, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}',
       jsonb_build_object('first_name', u.first_name, 'last_name', u.last_name, 'registration_source', 'seed'),
       now(), now(), '', '', '', '');

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, 'email',
            jsonb_build_object('sub', uid::text, 'email', u.email, 'email_verified', true), now(), now(), now());
  end loop;

  -- Starter: 1-Monats-Pass, vor 10 Tagen gekauft
  uid := md5('seed:user:starter@example.com')::uuid;
  update public.plan_access
     set plan = 'starter', source = 'pass', pass_length = 'month', valid_until = today + 19
   where user_id = uid;
  insert into public.plan_periods (user_id, plan, source, pass_length, starts_on, ends_on, amount_cents, granted_by)
  values (uid, 'starter', 'pass', 'month', today - 10, today + 19, 1400, 'seed');

  -- Plus: 3-Monats-Pass, vor 30 Tagen gekauft
  uid := md5('seed:user:plus@example.com')::uuid;
  update public.plan_access
     set plan = 'plus', source = 'pass', pass_length = 'quarter', valid_until = today + 59
   where user_id = uid;
  insert into public.plan_periods (user_id, plan, source, pass_length, starts_on, ends_on, amount_cents, granted_by)
  values (uid, 'plus', 'pass', 'quarter', today - 30, today + 59, 7500, 'seed');

  -- Admin: Rolle per Hand, wie im Datenmodell vorgesehen, und ein bestätigter TOTP-Faktor
  uid := md5('seed:user:admin@example.com')::uuid;
  update public.profiles set role = 'admin' where user_id = uid;
  insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
  values (md5('seed:factor:admin@example.com')::uuid, uid, 'Local development', 'totp', 'verified', now(), now(), admin_totp_secret);
end;
$$;