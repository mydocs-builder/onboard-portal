// Logik des Bewerbungstrackers: Vorschläge beim Statuswechsel, Fälligkeit, "What happened?" und
// Dublettenwarnung. Die Datenbank speichert nur Ergebnis und Verlaufseintrag (docs/datenmodell.md).
// Reine Funktionen ohne Zugriff auf Supabase oder die Uhr; "heute" kommt immer als Parameter.

import { addDays } from "../lib/dates";
import type { Enums } from "../lib/supabase";

export type Status = Enums<"application_status">;
export type NextType = Enums<"next_step_type">;

export type AppLike = { status: Status; next_type: NextType; next_on: string | null };

export const OPEN_STATUSES: Status[] = ["planned", "applied", "interview", "offer"];
export const ALL_STATUSES: Status[] = [...OPEN_STATUSES, "accepted", "rejected", "no_response", "withdrawn"];
export const NEXT_TYPES: NextType[] = ["apply", "follow_up", "interview", "documents", "decision", "offer_reply", "none"];

export const isOpen = (status: Status) => OPEN_STATUSES.includes(status);

// Vorschlag je Status: Art des nächsten Schritts und Abstand in Tagen.
const SUGGESTION: Record<Status, [NextType, number]> = {
  planned: ["apply", 3],
  applied: ["follow_up", 7],
  interview: ["interview", 7],
  offer: ["offer_reply", 7],
  accepted: ["none", 0],
  rejected: ["none", 0],
  no_response: ["none", 0],
  withdrawn: ["none", 0],
};

export function suggestNext(status: Status, today: string): { next_type: NextType; next_on: string | null } {
  const [type, days] = SUGGESTION[status];
  return { next_type: type, next_on: type === "none" ? null : addDays(today, days) };
}

/** Fällig: laufende Bewerbung, deren nächster Schritt heute oder früher ansteht. */
export function isDue(app: AppLike, today: string): boolean {
  return isOpen(app.status) && app.next_type !== "none" && !!app.next_on && app.next_on <= today;
}

// --- "What happened?" ---------------------------------------------------------------------------

export type Choice =
  | "applied" | "skip" | "waiting" | "reply" | "later" | "close" | "done" | "sent" | "accept" | "decline";
export type Answer = "interview" | "documents" | "offer" | "rejected";
export type Channel = "email" | "phone" | "linkedin" | "xing";

/** Antwortmöglichkeiten je Art des fälligen Schritts, in der Reihenfolge der Anzeige. */
export const CHOICES: Record<Exclude<NextType, "none">, Choice[]> = {
  apply: ["applied", "later", "skip"],
  follow_up: ["waiting", "reply", "later", "close"],
  decision: ["waiting", "reply", "later", "close"],
  interview: ["done", "reply", "later"],
  documents: ["sent", "later"],
  offer_reply: ["accept", "decline", "later"],
};

export const ANSWERS: Answer[] = ["interview", "documents", "offer", "rejected"];
export const CHANNELS: Channel[] = ["email", "phone", "linkedin", "xing"];

/** Vorgeschlagener Abstand für das Datum: "später" in 3 Tagen, alles andere in 7. */
export const defaultOutcomeDate = (choice: Choice, today: string) => addDays(today, choice === "later" ? 3 : 7);

/** Braucht die Antwort ein Datum (und damit einen Folgeschritt)? */
export function needsDate(choice: Choice | null, answer: Answer): boolean {
  if (!choice) return false;
  if (choice === "reply") return answer !== "rejected";
  return ["waiting", "later", "applied", "done", "sent"].includes(choice);
}

export type Outcome = {
  /** Geänderte Felder der Bewerbung; nicht genannte bleiben. */
  patch: Partial<{ status: Status; next_type: NextType; next_on: string | null; applied_on: string }>;
  /** Schlüssel des Verlaufstexts unter tracker.outcome.* */
  event: string;
};

export function resolveOutcome(input: {
  currentType: NextType;
  choice: Choice;
  answer: Answer;
  date: string;
  today: string;
}): Outcome {
  const { currentType, choice, answer, date, today } = input;
  const closed = { next_type: "none" as const, next_on: null };
  switch (choice) {
    case "applied":
      return { patch: { status: "applied", next_type: "follow_up", next_on: date, applied_on: today }, event: "applied" };
    case "skip":
      return { patch: { status: "withdrawn", ...closed }, event: "skip" };
    case "waiting":
      // Nach einem Gespräch bleibt es bei der Frage nach der Entscheidung.
      return currentType === "decision"
        ? { patch: { next_type: "decision", next_on: date }, event: "waitingDecision" }
        : { patch: { next_type: "follow_up", next_on: date }, event: "waiting" };
    case "later":
      return { patch: { next_on: date }, event: "later" };
    case "close":
      return { patch: { status: "no_response", ...closed }, event: "close" };
    case "done":
      return { patch: { next_type: "decision", next_on: date }, event: "done" };
    case "sent":
      return { patch: { next_type: "follow_up", next_on: date }, event: "sent" };
    case "accept":
      return { patch: { status: "accepted", ...closed }, event: "accept" };
    case "decline":
      return { patch: { status: "withdrawn", ...closed }, event: "decline" };
    case "reply":
      if (answer === "interview") return { patch: { status: "interview", next_type: "interview", next_on: date }, event: "replyInterview" };
      if (answer === "documents") return { patch: { next_type: "documents", next_on: date }, event: "replyDocuments" };
      if (answer === "offer") return { patch: { status: "offer", next_type: "offer_reply", next_on: date }, event: "replyOffer" };
      return { patch: { status: "rejected", ...closed }, event: "replyRejected" };
  }
}

// --- Bearbeiten -----------------------------------------------------------------------------------

/** Welche Verlaufseinträge eine Bearbeitung erzeugt: Statuswechsel und geänderter nächster Schritt. */
export function editEvents(before: AppLike, after: AppLike): ("status" | "next")[] {
  const events: ("status" | "next")[] = [];
  if (after.status !== before.status) events.push("status");
  const nextChanged = after.next_type !== before.next_type || (after.next_on ?? null) !== (before.next_on ?? null);
  if (nextChanged && after.next_type !== "none") events.push("next");
  return events;
}

// --- Dubletten ------------------------------------------------------------------------------------

const normalise = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** Laufende Bewerbung beim selben Unternehmen, falls es eine gibt. */
export function findDuplicate<T extends { company: string; status: Status }>(apps: T[], company: string): T | undefined {
  const wanted = normalise(company);
  return wanted ? apps.find((app) => isOpen(app.status) && normalise(app.company) === wanted) : undefined;
}
