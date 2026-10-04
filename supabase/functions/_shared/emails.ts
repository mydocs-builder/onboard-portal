// Texte der Mails des Portals: die fünf Mails der täglichen Funktion und die Kaufbestätigung.
// Englisch; die deutsche Fassung folgt mit der deutschen Fassung des Portals.
// Allgemeine Information, keine rechtlichen Aussagen. Die Texte der täglichen Funktion sind von
// Patrick freigegeben (5. Oktober 2026).

import { PORTAL_URL } from "./http.ts";
import type { Mail } from "./mail.ts";

type Data = Record<string, unknown>;

const PLAN: Record<string, string> = { starter: "Starter", plus: "Plus" };
const STEP: Record<string, string> = {
  apply: "Apply",
  follow_up: "Follow up",
  interview: "Interview",
  documents: "Send documents",
  decision: "Ask about the decision",
  offer_reply: "Reply to the offer",
};

const date = (iso: unknown) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Absätze sind durch eine Leerzeile getrennt; leere Einträge (entfallende Varianten) fallen weg.
const body = (firstName: string, paragraphs: (string | false | null | undefined)[], closing = "Best regards") =>
  [`Hi ${firstName},`, ...paragraphs.filter(Boolean), `${closing}\nOnboard Germany`].join("\n\n");

const step = (a: Data) => STEP[a.next_type as string] ?? "Next step";
// Die Position nur nennen, wenn sie eingetragen ist.
const role = (a: Data) => (a.position ? `${a.company}, ${a.position}` : `${a.company}`);

// Die fünf Mails der täglichen Funktion. kind und data kommen aus daily_mails().
export function buildMail(kind: string, to: string, firstName: string, data: Data): Mail {
  switch (kind) {
    case "pass_started": {
      const plan = PLAN[data.plan as string];
      return {
        to,
        subject: `Your ${plan} pass starts today`,
        text: body(firstName, [
          `Your ${plan} pass starts today and runs until ${date(data.ends_on)}.\nIt ends automatically, so there is nothing to cancel.`,
          `Go to your portal: ${PORTAL_URL}`,
        ]),
      };
    }
    case "pass_ending": {
      const plan = PLAN[data.plan as string];
      // Kostenlose Freischaltung (Pilot oder manuell) statt gekauftem Pass
      const what = data.source === "pass" ? `${plan} pass` : `free ${plan} access`;
      return {
        to,
        subject: `Your ${plan} access ends on ${date(data.valid_until)}`,
        text: body(firstName, [
          `Your ${what} ends on ${date(data.valid_until)}. After that, your account continues on the Free plan. Your applications, checklists and profile stay exactly as they are.`,
          // Ohne Verkauf entfällt der Kaufabsatz.
          data.sales_enabled &&
          `Still searching? You can buy a new pass here: ${PORTAL_URL}/plan\nIt starts when your current access ends, so you don't lose a day.`,
        ]),
      };
    }
    case "pass_ended": {
      // Die abgelaufene Stufe ist bekannt, solange es die zugehörige Planphase gibt.
      const plan = PLAN[data.plan as string];
      const what = !plan ? "pass" : data.source === "pass" ? `${plan} pass` : `free ${plan} access`;
      return {
        to,
        subject: `Your ${what} has ended`,
        text: body(firstName, [
          `Your ${what} ended on ${date(data.ended_on)}, and your account is now on the Free plan. Nothing has been deleted: your applications, checklists and profile are all still there.`,
          data.sales_enabled &&
          `If you need ${plan ?? "a pass"} again, you can buy a new pass at any time: ${PORTAL_URL}/plan`,
        ]),
      };
    }
    case "reminder_next_step": {
      const apps = data.applications as Data[];
      const one = apps.length === 1;
      return {
        to,
        subject: one ? `Due today: ${step(apps[0])} at ${apps[0].company}` : `${apps.length} steps in your job search are due today`,
        text: [
          body(firstName, [
            one ? "One step is due today:" : "These steps are due today:",
            apps.map((a) => `- ${step(a)}: ${role(a)}`).join("\n"),
            `Open your tracker: ${PORTAL_URL}/applications`,
          ]),
          `You receive these reminders because they are switched on in your Account settings. You can turn them off there: ${PORTAL_URL}/account`,
        ].join("\n\n"),
      };
    }
    case "interview_tomorrow":
      return {
        to,
        subject: `Interview tomorrow: ${data.company}`,
        text: body(firstName, [
          data.position
            ? `Your interview with ${data.company} for the ${data.position} position is tomorrow, ${date(data.on)}.`
            : `Your interview with ${data.company} is tomorrow, ${date(data.on)}.`,
          `Your notes and the history of this application are in your tracker: ${PORTAL_URL}/applications`,
        ], "Good luck!"),
      };
    default:
      throw new Error(`Unknown mail kind ${kind}`);
  }
}

// Kaufbestätigung direkt nach der Zahlung. Entwurf, von Patrick zu prüfen.
// grant ist das Ergebnis von grant_pass(), length die Laufzeit (month, quarter), today das heutige
// Datum in deutscher Zeit.
export function buildPurchaseMail(
  to: string, firstName: string,
  grant: { plan: string; starts_on: string; ends_on: string; credit_days: number },
  length: string,
  today: string,
): Mail {
  const plan = PLAN[grant.plan];
  const pass = `${length === "quarter" ? "3-month" : "1-month"} ${plan} pass`;
  const days = grant.credit_days === 1 ? "1 extra day" : `${grant.credit_days} extra days`;
  return {
    to,
    subject: `Your ${plan} pass is confirmed`,
    text: body(firstName, [
      "Thank you for your purchase.",
      (grant.starts_on <= today
        ? `Your ${pass} starts today and runs until ${date(grant.ends_on)}.`
        : `Your ${pass} starts on ${date(grant.starts_on)}, when your current access ends, and runs until ${date(grant.ends_on)}.`) +
      "\nIt ends automatically, so there is nothing to cancel.",
      grant.credit_days > 0 &&
      `The remaining value of your previous pass has been converted into ${days} of ${plan}, already included in this end date.`,
      "Your invoice comes from Stripe, our payment provider.",
      `Go to your portal: ${PORTAL_URL}`,
    ]),
  };
}
