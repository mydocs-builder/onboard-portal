// Nächste Schritte der Übersicht. Abgeleitet, nicht gespeichert (docs/datenmodell.md):
// Aufgaben (CV, LinkedIn, XING, Visa-Unterlagen) wandern nach "Completed", wenn ihre Checkliste
// vollständig ist oder der Kandidat sie mit "Mark as done" abschließt. Ereignisse (fällige
// Schritte, neue Jobs) lassen sich nicht abschließen; sie verschwinden, wenn sie erledigt sind.

export type TaskKey = "cv" | "linkedin" | "xing" | "visa";
export type Progress = { done: number; total: number };

export type OverviewInput = {
  /** Fortschritt je Aufgabe; gezählt wird nur, was die Stufe sehen darf. Fehlt die Checkliste, fehlt die Aufgabe. */
  progress: Partial<Record<TaskKey, Progress>>;
  /** Von Hand abgeschlossene Aufgaben (dismissed_tasks). */
  dismissed: TaskKey[];
  dueCount: number;
  newJobs: number;
};

export type Step =
  | { kind: "task"; key: TaskKey; progress: Progress }
  | { kind: "event"; key: "followups" | "jobs"; count: number };

export type CompletedTask = { key: TaskKey; progress: Progress; /** von Hand abgeschlossen, lässt sich zurückholen */ manual: boolean };

const TASK_ORDER: TaskKey[] = ["cv", "linkedin", "xing", "visa"];

const isComplete = (p: Progress) => p.total > 0 && p.done >= p.total;

export function overviewSteps(input: OverviewInput): { steps: Step[]; completed: CompletedTask[] } {
  const tasks = TASK_ORDER.flatMap((key) => {
    const progress = input.progress[key];
    return progress ? [{ key, progress, complete: isComplete(progress), dismissed: input.dismissed.includes(key) }] : [];
  });
  const open = tasks.filter((task) => !task.complete && !task.dismissed).map((task): Step => ({ kind: "task", key: task.key, progress: task.progress }));

  const events: Step[] = [];
  if (input.dueCount > 0) events.push({ kind: "event", key: "followups", count: input.dueCount });
  if (input.newJobs > 0) events.push({ kind: "event", key: "jobs", count: input.newJobs });

  // Reihenfolge wie im Prototyp: erst Profil-Aufgaben, dann Ereignisse, die Visa-Unterlagen zuletzt.
  const isVisa = (step: Step) => step.kind === "task" && step.key === "visa";
  const steps = [...open.filter((step) => !isVisa(step)), ...events, ...open.filter(isVisa)];

  const completed = tasks
    .filter((task) => task.complete || task.dismissed)
    .map((task) => ({ key: task.key, progress: task.progress, manual: !task.complete }));

  return { steps, completed };
}
