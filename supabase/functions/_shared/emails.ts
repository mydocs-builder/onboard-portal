// Texte der Mails der täglichen Funktion. Englisch; die deutsche Fassung folgt mit der
// deutschen Fassung des Portals. Allgemeine Information, keine rechtlichen Aussagen.
// Entwurf, von Patrick zu prüfen.

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

const wrap = (firstName: string, lines: string[]) =>
  [`Hi ${firstName},`, "", ...lines, "", "Onboard Germany", PORTAL_URL].join("\n");

const role = (a: Data) => (a.position ? `${a.company}, ${a.position}` : `${a.company}`);

export function buildMail(kind: string, to: string, firstName: string, data: Data): Mail {
  switch (kind) {
    case "pass_started": {
      const plan = PLAN[data.plan as string];
      return {
        to,
        subject: `Your ${plan} pass is active`,
        text: wrap(firstName, [
          `Your ${plan} pass has started today and runs until ${date(data.ends_on)}.`,
          "It ends automatically. There is nothing to cancel.",
        ]),
      };
    }
    case "pass_ending": {
      const plan = PLAN[data.plan as string];
      const paid = data.source === "pass";
      const lines = [
        paid
          ? `Your ${plan} pass ends on ${date(data.valid_until)}.`
          : `Your free ${plan} access ends on ${date(data.valid_until)}.`,
        "After that your account continues on the Free plan. Your applications, checklists and profile stay as they are.",
      ];
      if (data.sales_enabled) {
        lines.push(
          "",
          `If you would like to keep ${plan}, you can buy a pass here: ${PORTAL_URL}/plan`,
          "A new pass starts when your current access ends, so no day is lost.",
        );
      }
      return { to, subject: `Your ${plan} access ends on ${date(data.valid_until)}`, text: wrap(firstName, lines) };
    }
    case "pass_ended": {
      const lines = [
        `Your pass ended on ${date(data.ended_on)}. Your account is now on the Free plan.`,
        "Your applications, checklists and profile are still there. In the tracker you can keep working with your existing applications.",
      ];
      if (data.sales_enabled) lines.push("", `You can buy a new pass at any time: ${PORTAL_URL}/plan`);
      return { to, subject: "Your pass has ended", text: wrap(firstName, lines) };
    }
    case "reminder_next_step": {
      const apps = data.applications as Data[];
      return {
        to,
        subject: apps.length === 1 ? `Due today: ${role(apps[0])}` : `${apps.length} application steps are due today`,
        text: wrap(firstName, [
          apps.length === 1 ? "One step in your application tracker is due today:" : "These steps in your application tracker are due today:",
          "",
          ...apps.map((a) => `- ${STEP[a.next_type as string] ?? "Next step"}: ${role(a)}`),
          "",
          `Open your tracker: ${PORTAL_URL}/applications`,
          "",
          `You can switch these reminders off under Account settings: ${PORTAL_URL}/account`,
        ]),
      };
    }
    case "interview_tomorrow":
      return {
        to,
        subject: `Interview tomorrow: ${data.company}`,
        text: wrap(firstName, [
          `Your interview with ${role(data)} is tomorrow, ${date(data.on)}.`,
          "",
          `Your notes and the history of this application: ${PORTAL_URL}/applications`,
        ]),
      };
    default:
      throw new Error(`Unknown mail kind ${kind}`);
  }
}
