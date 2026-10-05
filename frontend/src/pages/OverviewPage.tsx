import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckIcon } from "../components/Icons";
import { PageStatus } from "../components/PageStatus";
import { useToast } from "../components/Toast";
import { addDays } from "../lib/dates";
import { FIELDS, type Field } from "../lib/fields";
import { supabase } from "../lib/supabase";
import { overviewSteps, type Progress, type TaskKey } from "../overview/steps";
import { usePortal } from "../portal/PortalProvider";
import { isDue, isOpen } from "../tracker/logic";
import { shouldChoosePlan } from "./billing/WelcomePage";
import { PATHS, checklistTabPath } from "../routes";

const TASK_PATH: Record<TaskKey | "followups" | "jobs", string> = {
  cv: PATHS.cv,
  linkedin: checklistTabPath("linkedin", "linkedin"),
  xing: checklistTabPath("linkedin", "xing"),
  visa: PATHS.checklist,
  followups: PATHS.applications,
  jobs: PATHS.jobs,
};

type Data = {
  openCount: number;
  dueCount: number;
  newJobs: number;
  progress: Partial<Record<TaskKey, Progress>>;
  visaTitle: string;
  dismissed: TaskKey[];
};

function StatBar({ progress }: { progress: Progress }) {
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return <div className="bar"><span style={{ width: `${percent}%` }} /></div>;
}

export function OverviewPage() {
  const { t } = useTranslation();
  const flash = useToast();
  const portal = usePortal();
  const { profile, today, firstSession } = portal;
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [showCompleted, setShowCompleted] = useState(false);

  const load = useCallback(async () => {
    // Neue Jobs der letzten 7 Tage, im eigenen Berufsfeld, falls gesetzt. Ohne Plus liefert die Datenbank nichts.
    let jobs = supabase.from("jobs").select("id", { count: "exact", head: true }).gte("posted_on", addDays(today, -7));
    if (profile.field) jobs = jobs.eq("industry", profile.field);
    const [apps, lists, items, progress, dismissed, newJobs] = await Promise.all([
      supabase.from("applications").select("status, next_type, next_on"),
      supabase.from("checklists").select("id, key, area, title").eq("active", true).order("sort"),
      supabase.from("checklist_items").select("id, checklist_id").eq("active", true),
      supabase.from("checklist_progress").select("item_id"),
      supabase.from("dismissed_tasks").select("task_key"),
      jobs,
    ]);
    if (apps.error || lists.error || items.error || progress.error || dismissed.error) return setStatus("error");

    const done = new Set(progress.data.map((row) => row.item_id));
    const progressOf = (listId: string | undefined): Progress | undefined => {
      if (!listId) return undefined;
      const own = items.data.filter((item) => item.checklist_id === listId);
      return { done: own.filter((item) => done.has(item.id)).length, total: own.length };
    };
    const byKey = (key: string) => lists.data.find((list) => list.key === key)?.id;
    const visa = lists.data.find((list) => list.area === "checklist");

    setData({
      openCount: apps.data.filter((app) => isOpen(app.status)).length,
      dueCount: apps.data.filter((app) => isDue(app, today)).length,
      newJobs: newJobs.count ?? 0,
      progress: { cv: progressOf(byKey("cv")), linkedin: progressOf(byKey("linkedin")), xing: progressOf(byKey("xing")), visa: progressOf(visa?.id) },
      visaTitle: visa?.title ?? "",
      dismissed: dismissed.data.map((row) => row.task_key),
    });
    setStatus("ready");
  }, [today, profile.field]);
  useEffect(() => { load(); }, [load]);

  async function pickField(field: Field) {
    const { error } = await supabase.from("profiles").update({ field }).eq("user_id", portal.userId);
    if (error) return flash(t("common.saveError"));
    flash(t("overview.fieldSaved", { field: t(`fields.${field}`) }));
    await portal.refresh();
  }

  async function markDone(key: TaskKey) {
    const { error } = await supabase.from("dismissed_tasks").insert({ task_key: key });
    if (error && error.code !== "23505") return flash(t("common.saveError"));
    flash(t("overview.moved"));
    load();
  }

  async function reopen(key: TaskKey) {
    const { error } = await supabase.from("dismissed_tasks").delete().eq("task_key", key);
    if (error) return flash(t("common.saveError"));
    flash(t("overview.movedBack"));
    load();
  }

  const { steps, completed } = data
    ? overviewSteps({ progress: data.progress, dismissed: data.dismissed, dueCount: data.dueCount, newJobs: data.newJobs })
    : { steps: [], completed: [] };
  const taskText = (key: TaskKey, progress: Progress, variant: "desc" | "doneDesc") =>
    t(`overview.task.${key}.${variant}`, { done: progress.done, total: progress.total, list: data?.visaTitle });

  // Nach der ersten Anmeldung zuerst zur Stufenwahl, wenn der Verkauf läuft.
  if (shouldChoosePlan(portal)) return <Navigate to={PATHS.welcome} replace />;

  return (
    <>
      <div className="eyebrow">{t("nav.items.overview")}</div>
      <h1 className="t1">{t(firstSession ? "overview.welcomeAboard" : "overview.welcomeBack", { name: profile.first_name })}</h1>
      <p className="lead">{t(firstSession ? "overview.leadFirst" : "overview.lead")}</p>
      <PageStatus status={status} />

      {data && (
        <>
          <div className="stats stats4">
            <div className="stat"><div className="n">{data.openCount}</div><div className="l">{t("overview.statOpen")}</div></div>
            <div className="stat"><div className="n">{data.dueCount}</div><div className="l">{t("overview.statDue")}</div></div>
            {data.progress.linkedin && (
              <div className="stat">
                <div className="n">{data.progress.linkedin.done}/{data.progress.linkedin.total}</div>
                <div className="l">{t("overview.statLinkedin")}</div>
                <StatBar progress={data.progress.linkedin} />
              </div>
            )}
            {data.progress.visa && (
              <div className="stat">
                <div className="n">{data.progress.visa.done}/{data.progress.visa.total}</div>
                <div className="l">{t("overview.statVisa")}</div>
                <StatBar progress={data.progress.visa} />
              </div>
            )}
          </div>

          {!profile.field && (
            <div className="panel" style={{ marginTop: 40 }}>
              <h2 className="ph">{t("overview.fieldTitle")}</h2>
              <p className="pm">{t("overview.fieldText")}</p>
              <div className="act">
                {FIELDS.map((field) => <button key={field} className="sb" onClick={() => pickField(field)}>{t(`fields.${field}`)}</button>)}
              </div>
            </div>
          )}

          <h2 className="t2">{t("overview.nextSteps")}</h2>
          <div className="steps">
            {steps.map((step, index) => {
              const title = step.kind === "task"
                ? t(`overview.task.${step.key}.title`)
                : step.key === "jobs" && profile.field
                  ? t("overview.event.jobsField", { count: step.count, field: t(`fields.${profile.field}`) })
                  : t(`overview.event.${step.key}`, { count: step.count });
              return (
                <div className="step" key={step.key}>
                  <div className="num">{String(index + 1).padStart(2, "0")}</div>
                  <div className="stepbody">
                    <div>
                      <Link className="linkh" to={TASK_PATH[step.key]}>{title}</Link>
                      <p className="sdesc">{step.kind === "task" ? taskText(step.key, step.progress, "desc") : t(`overview.event.${step.key}Desc`)}</p>
                    </div>
                    {step.kind === "task" && (
                      <button className="hidebtn" onClick={() => markDone(step.key)} aria-label={t("overview.markDoneAria", { title })}>{t("overview.markDone")}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {steps.length === 0 && <p className="sdesc" style={{ marginTop: 20 }}>{t("overview.nothingOpen")}</p>}

          {completed.length > 0 && (
            <>
              <button className="donetoggle" onClick={() => setShowCompleted(!showCompleted)} aria-expanded={showCompleted}>
                {t(showCompleted ? "overview.hideCompleted" : "overview.showCompleted", { count: completed.length })}
              </button>
              {showCompleted && (
                <div className="steps">
                  {completed.map((task) => {
                    const title = t(`overview.task.${task.key}.title`);
                    return (
                      <div className="step" key={task.key}>
                        <div className="num"><span className="cb on" style={{ width: 26, height: 26 }}><CheckIcon /></span></div>
                        <div className="stepbody">
                          <div>
                            <Link className="linkh donet" to={TASK_PATH[task.key]}>{title}</Link>
                            <p className="sdesc">{task.manual ? t("overview.markedByYou") : taskText(task.key, task.progress, "doneDesc")}</p>
                          </div>
                          {task.manual && (
                            <button className="hidebtn" onClick={() => reopen(task.key)} aria-label={t("overview.reopenAria", { title })}>{t("overview.reopen")}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
