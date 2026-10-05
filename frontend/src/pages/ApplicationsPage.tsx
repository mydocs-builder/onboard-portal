import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, safeUrl } from "../components/ExternalLink";
import { LockHint } from "../components/LockHint";
import { PageStatus } from "../components/PageStatus";
import { useToast } from "../components/Toast";
import { formatDate, formatShort } from "../lib/dates";
import { usePortal } from "../portal/PortalProvider";
import {
  addApplication, deleteApplication, listApplications, listEvents, updateApplication,
  type Application, type ApplicationEvent,
} from "../tracker/api";
import {
  ALL_STATUSES, ANSWERS, CHANNELS, CHOICES, NEXT_TYPES, OPEN_STATUSES, defaultOutcomeDate, editEvents, findDuplicate,
  isDue, needsDate, resolveOutcome, suggestNext, type Answer, type Channel, type Choice, type NextType, type Status,
} from "../tracker/logic";

const TAG_CLASS: Record<Status, string> = {
  planned: "tag planned", applied: "tag", interview: "tag", offer: "tag offer", accepted: "tag offer",
  rejected: "tag rejected", no_response: "tag rejected", withdrawn: "tag rejected",
};

type Panel = { kind: "add" } | { kind: "edit"; app: Application } | { kind: "outcome"; app: Application } | null;

/** Rahmen eines Formulars über der Liste; rückt beim Öffnen ins Bild und nimmt den Fokus. */
function PanelBox({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="panel" ref={ref} tabIndex={-1} style={{ scrollMarginTop: 16 }}>
      <h2 className="ph">{title}</h2>
      <p className="pm">{intro}</p>
      <div className="pgrid">{children}</div>
    </div>
  );
}

export function ApplicationsPage() {
  const { t } = useTranslation();
  const flash = useToast();
  const { plan, today, freeApplicationLimit } = usePortal();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [panel, setPanel] = useState<Panel>(null);

  const reload = useCallback(async () => {
    const data = await listApplications();
    if (!data) return setStatus("error");
    setApps(data);
    setStatus("ready");
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const list = apps ?? [];
  const limited = plan === "free";
  const limitReached = limited && list.length >= freeApplicationLimit;
  const close = () => setPanel(null);
  const saved = (message: string) => { close(); flash(message); reload(); };

  return (
    <>
      <div className="eyebrow">{t("nav.items.applications")}</div>
      <h1 className="t1">{t("tracker.title")}</h1>
      <p className="lead">{t("tracker.lead")}</p>
      <div className="row">
        <span className="meta">
          {limited ? t("tracker.countFree", { count: list.length, limit: freeApplicationLimit }) : t("tracker.count", { count: list.length })}
        </span>
        <button className="btn" onClick={() => setPanel({ kind: "add" })} disabled={limitReached}>{t("tracker.add")}</button>
      </div>

      {panel?.kind === "add" && <AddPanel apps={list} today={today} onClose={close} onSaved={saved} />}
      {panel?.kind === "edit" && <EditPanel key={panel.app.id} app={panel.app} today={today} onClose={close} onSaved={saved} />}
      {panel?.kind === "outcome" && <OutcomePanel key={panel.app.id} app={panel.app} today={today} onClose={close} onSaved={saved} />}

      {limitReached && (
        <LockHint title={t("tracker.limitTitle")}>{t("tracker.limitText", { limit: freeApplicationLimit })}</LockHint>
      )}

      <PageStatus status={status} />
      {status === "ready" && list.length === 0 && <p className="empty">{t("tracker.empty")}</p>}
      {list.length > 0 && (
        <div className="tbox">
          <table className="tbl wide">
            <thead>
              <tr>
                <th>{t("tracker.col.company")}</th><th>{t("tracker.col.position")}</th><th>{t("tracker.col.status")}</th>
                <th>{t("tracker.col.applied")}</th><th>{t("tracker.col.next")}</th><th><span className="sr-only">{t("tracker.col.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((app) => {
                const due = isDue(app, today);
                const url = safeUrl(app.job_url);
                const hasNext = app.next_type !== "none" && !!app.next_on;
                return (
                  <tr key={app.id}>
                    <td data-label={t("tracker.col.company")}>{app.company}</td>
                    <td data-label={t("tracker.col.position")}>
                      {app.position || "-"}
                      {(app.location || url) && (
                        <div className="meta">
                          {app.location}{app.location && url && " · "}
                          {url && <ExternalLink href={url}>{t("tracker.jobAd")}</ExternalLink>}
                        </div>
                      )}
                    </td>
                    <td data-label={t("tracker.col.status")}><span className={TAG_CLASS[app.status]}>{t(`tracker.status.${app.status}`)}</span></td>
                    <td data-label={t("tracker.col.applied")}>{formatDate(app.applied_on)}</td>
                    <td data-label={t("tracker.col.next")}>
                      <div className={due ? "duelbl" : ""}>{t(`tracker.next.${app.next_type}.label`)}</div>
                      {hasNext && (
                        <div className="meta">
                          {!due ? formatDate(app.next_on) : app.next_on === today ? t("tracker.dueToday") : t("tracker.dueSince", { date: formatShort(app.next_on!) })}
                        </div>
                      )}
                    </td>
                    <td data-label={t("tracker.col.actions")}>
                      <div className="act">
                        {due && (
                          <button className="sb pri" onClick={() => setPanel({ kind: "outcome", app })} aria-label={`${t(`tracker.next.${app.next_type}.button`)}: ${app.company}`}>
                            {t(`tracker.next.${app.next_type}.button`)}
                          </button>
                        )}
                        <button className="sb" onClick={() => setPanel({ kind: "edit", app })} aria-label={t("tracker.editAria", { company: app.company })}>{t("tracker.edit")}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

type PanelProps = { today: string; onClose: () => void; onSaved: (message: string) => void };

/** Prüft den Link zur Anzeige: leer ist erlaubt, sonst nur eine vollständige http(s)-Adresse. */
function checkedUrl(value: string): { ok: boolean; url: string | null } {
  if (!value.trim()) return { ok: true, url: null };
  const url = safeUrl(value);
  return { ok: !!url, url };
}

function AddPanel({ apps, today, onClose, onSaved }: PanelProps & { apps: Application[] }) {
  const { t } = useTranslation();
  const flash = useToast();
  const [form, setForm] = useState({ company: "", position: "", location: "", jobUrl: "", status: "applied" as Status, nextOn: suggestNext("applied", today).next_on ?? "" });
  const [error, setError] = useState<"company" | "url" | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = suggestNext(form.status, today);

  async function save() {
    const link = checkedUrl(form.jobUrl);
    if (!form.company.trim()) return setError("company");
    if (!link.ok) return setError("url");
    const existing = findDuplicate(apps, form.company);
    // Dublettenwarnung: beim ersten Speichern warnen, beim zweiten trotzdem anlegen.
    if (existing && duplicate !== existing.id) return setDuplicate(existing.id);

    setBusy(true);
    const result = await addApplication({
      company: form.company.trim(),
      position: form.position.trim() || null,
      location: form.location.trim() || null,
      job_url: link.url,
      status: form.status,
      applied_on: form.status === "planned" ? null : today,
      next_type: next.next_type,
      next_on: next.next_type === "none" ? null : form.nextOn || null,
    }, form.status === "planned" ? t("tracker.event.addedPlanned") : t("tracker.event.added", { status: t(`tracker.status.${form.status}`) }));
    setBusy(false);
    if (!result.ok) return flash(result.reason === "limit" ? t("tracker.limitToast") : t("common.saveError"));
    onSaved(t("tracker.saved"));
  }

  const duplicateApp = duplicate ? apps.find((app) => app.id === duplicate) : null;
  return (
    <PanelBox title={t("tracker.addTitle")} intro={t("tracker.addIntro")}>
      <div>
        <label className="fl" htmlFor="a-company">{t("tracker.col.company")}</label>
        <input id="a-company" className="fi" value={form.company} onChange={(e) => { setForm({ ...form, company: e.target.value }); setError(null); setDuplicate(null); }} />
        {error === "company" && <div className="ferr" role="alert">{t("tracker.errorCompany")}</div>}
      </div>
      <div><label className="fl" htmlFor="a-role">{t("tracker.col.position")}</label><input id="a-role" className="fi" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
      <div><label className="fl" htmlFor="a-loc">{t("tracker.location")}</label><input id="a-loc" className="fi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
      <div>
        <label className="fl" htmlFor="a-link">{t("tracker.linkOptional")}</label>
        <input id="a-link" type="url" className="fi" value={form.jobUrl} onChange={(e) => { setForm({ ...form, jobUrl: e.target.value }); setError(null); }} placeholder="https://" />
        {error === "url" && <div className="ferr" role="alert">{t("tracker.errorUrl")}</div>}
      </div>
      <div>
        <label className="fl" htmlFor="a-status">{t("tracker.col.status")}</label>
        <select id="a-status" className="fi" value={form.status} onChange={(e) => { const value = e.target.value as Status; setForm({ ...form, status: value, nextOn: suggestNext(value, today).next_on ?? "" }); }}>
          {OPEN_STATUSES.map((value) => <option key={value} value={value}>{t(`tracker.status.${value}`)}</option>)}
        </select>
      </div>
      <div>
        <label className="fl" htmlFor="a-next">{t(`tracker.next.${next.next_type}.date`)}</label>
        <input id="a-next" type="date" className="fi" value={form.nextOn} onChange={(e) => setForm({ ...form, nextOn: e.target.value })} />
      </div>
      <div className="full"><p className="tip">{t("tracker.nextIntro", { step: t(`tracker.next.${next.next_type}.label`) })} {t(`tracker.next.${next.next_type}.hint`)}</p></div>
      {duplicateApp && <div className="full ferr" role="alert">{t("tracker.duplicate", { company: duplicateApp.company })}</div>}
      <div className="factions">
        <button className="btn" onClick={save} disabled={busy}>{duplicateApp ? t("tracker.saveAnyway") : t("tracker.saveNew")}</button>
        <button className="btn2" onClick={onClose}>{t("common.cancel")}</button>
      </div>
    </PanelBox>
  );
}

function EditPanel({ app, today, onClose, onSaved }: PanelProps & { app: Application }) {
  const { t } = useTranslation();
  const flash = useToast();
  const [form, setForm] = useState({
    company: app.company, position: app.position ?? "", location: app.location ?? "", jobUrl: app.job_url ?? "", contact: app.contact ?? "",
    status: app.status, nextType: app.next_type, nextOn: app.next_on ?? "", notes: app.notes ?? "",
  });
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [error, setError] = useState<"company" | "url" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { listEvents(app.id).then(setEvents); }, [app.id]);

  async function save() {
    const link = checkedUrl(form.jobUrl);
    if (!form.company.trim()) return setError("company");
    if (!link.ok) return setError("url");
    const nextOn = form.nextType === "none" ? null : form.nextOn || null;
    const after = { status: form.status, next_type: form.nextType, next_on: nextOn };
    const texts = editEvents(app, after).map((kind) => {
      if (kind === "status") return t("tracker.event.status", { status: t(`tracker.status.${form.status}`) });
      const step = t(`tracker.next.${form.nextType}.label`).toLowerCase();
      return nextOn ? t("tracker.event.next", { step, date: formatDate(nextOn) }) : t("tracker.event.nextNoDate", { step });
    });
    setBusy(true);
    const result = await updateApplication(app.id, {
      company: form.company.trim(),
      position: form.position.trim() || null,
      location: form.location.trim() || null,
      job_url: link.url,
      contact: form.contact.trim() || null,
      notes: form.notes.trim() || null,
      // Wer von "geplant" auf einen späteren Status wechselt, hat sich heute beworben.
      applied_on: app.applied_on ?? (form.status === "planned" ? null : today),
      ...after,
    }, texts);
    setBusy(false);
    if (!result.ok) return flash(t("common.saveError"));
    onSaved(t("tracker.changesSaved"));
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    const ok = await deleteApplication(app.id);
    setBusy(false);
    if (!ok) return flash(t("common.saveError"));
    onSaved(t("tracker.deleted"));
  }

  return (
    <PanelBox title={t("tracker.editTitle", { company: app.company })} intro={t("tracker.editIntro")}>
      <div>
        <label className="fl" htmlFor="e-company">{t("tracker.col.company")}</label>
        <input id="e-company" className="fi" value={form.company} onChange={(e) => { setForm({ ...form, company: e.target.value }); setError(null); }} />
        {error === "company" && <div className="ferr" role="alert">{t("tracker.errorCompany")}</div>}
      </div>
      <div><label className="fl" htmlFor="e-role">{t("tracker.col.position")}</label><input id="e-role" className="fi" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
      <div><label className="fl" htmlFor="e-loc">{t("tracker.location")}</label><input id="e-loc" className="fi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
      <div>
        <label className="fl" htmlFor="e-link">{t("tracker.link")}</label>
        <input id="e-link" type="url" className="fi" value={form.jobUrl} onChange={(e) => { setForm({ ...form, jobUrl: e.target.value }); setError(null); }} placeholder="https://" />
        {error === "url" && <div className="ferr" role="alert">{t("tracker.errorUrl")}</div>}
      </div>
      <div className="full">
        <label className="fl" htmlFor="e-contact">{t("tracker.contact")}</label>
        <input id="e-contact" className="fi" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} aria-describedby="e-contact-hint" />
        <div className="meta" id="e-contact-hint" style={{ marginTop: 6 }}>{t("tracker.contactHint")}</div>
      </div>
      <div>
        <label className="fl" htmlFor="e-status">{t("tracker.col.status")}</label>
        <select id="e-status" className="fi" value={form.status} onChange={(e) => { const value = e.target.value as Status; const next = suggestNext(value, today); setForm({ ...form, status: value, nextType: next.next_type, nextOn: next.next_on ?? "" }); }}>
          {ALL_STATUSES.map((value) => <option key={value} value={value}>{t(`tracker.status.${value}`)}</option>)}
        </select>
      </div>
      <div>
        <label className="fl" htmlFor="e-ntype">{t("tracker.col.next")}</label>
        <select id="e-ntype" className="fi" value={form.nextType} onChange={(e) => { const value = e.target.value as NextType; setForm({ ...form, nextType: value, nextOn: value === "none" ? "" : form.nextOn || defaultOutcomeDate("waiting", today) }); }}>
          {NEXT_TYPES.map((value) => <option key={value} value={value}>{t(`tracker.next.${value}.label`)}</option>)}
        </select>
      </div>
      {form.nextType !== "none" && (
        <div>
          <label className="fl" htmlFor="e-next">{t(`tracker.next.${form.nextType}.date`)}</label>
          <input id="e-next" type="date" className="fi" value={form.nextOn} onChange={(e) => setForm({ ...form, nextOn: e.target.value })} />
        </div>
      )}
      <div className="full"><p className="tip">{t(`tracker.next.${form.nextType}.hint`)}</p></div>
      <div className="full">
        <label className="fl" htmlFor="e-notes">{t("tracker.notes")}</label>
        <textarea id="e-notes" className="fi" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} aria-describedby="e-notes-hint" />
        <div className="meta" id="e-notes-hint" style={{ marginTop: 6 }}>{t("tracker.notesHint")}</div>
      </div>
      <div className="full">
        <span className="fl2">{t("tracker.history")}</span>
        <ul className="hist">
          {events.map((event) => <li key={event.id}><span>{formatDate(event.happened_on)}</span><span>{event.text}</span></li>)}
        </ul>
      </div>
      <div className="factions">
        <button className="btn" onClick={save} disabled={busy}>{t("tracker.saveChanges")}</button>
        <button className="btn2" onClick={onClose}>{t("common.cancel")}</button>
        <button className="danger" onClick={remove} disabled={busy}>{confirmDelete ? t("tracker.deleteConfirm") : t("tracker.delete")}</button>
      </div>
    </PanelBox>
  );
}

function OutcomePanel({ app, today, onClose, onSaved }: PanelProps & { app: Application }) {
  const { t } = useTranslation();
  const flash = useToast();
  const type = app.next_type as Exclude<NextType, "none">;
  const [choice, setChoice] = useState<Choice | null>(null);
  const [channel, setChannel] = useState<Channel>("email");
  const [answer, setAnswer] = useState<Answer>("interview");
  const [date, setDate] = useState(defaultOutcomeDate("waiting", today));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const showDate = needsDate(choice, answer);
  const outcome = choice ? resolveOutcome({ currentType: type, choice, answer, date, today }) : null;
  const outcomeText = outcome ? t(`tracker.outcome.${outcome.event}`, { date: formatDate(date), channel: t(`tracker.channel.${channel}`) }) : "";
  const dateLabel = choice === "reply" ? t(`tracker.answerDate.${answer}`) : choice ? t(`tracker.choiceDate.${choice}`, { defaultValue: t("tracker.date") }) : "";

  async function save() {
    if (!outcome) return flash(t("tracker.chooseFirst"));
    if (showDate && !date) return flash(t("tracker.errorDate"));
    setBusy(true);
    const text = outcomeText + (note.trim() ? t("tracker.outcome.note", { note: note.trim() }) : "");
    const result = await updateApplication(app.id, outcome.patch, [text]);
    setBusy(false);
    if (!result.ok) return flash(t("common.saveError"));
    onSaved(t("tracker.outcomeSaved"));
  }

  return (
    <PanelBox title={t(`tracker.outcomeTitle.${type}`, { company: app.company })} intro={t(`tracker.outcomeIntro.${type}`, { date: formatDate(app.next_on) })}>
      <div className="full opts" role="radiogroup" aria-label={t("tracker.whatHappened")}>
        {CHOICES[type].map((id) => (
          <button key={id} className={"opt" + (choice === id ? " on" : "")} role="radio" aria-checked={choice === id} onClick={() => { setChoice(id); setDate(defaultOutcomeDate(id, today)); }}>
            <span className="dot" /><span>{t(`tracker.choices.${type}.${id}`)}</span>
          </button>
        ))}
      </div>
      {choice === "waiting" && (
        <div>
          <label className="fl" htmlFor="u-ch">{t("tracker.channelLabel")}</label>
          <select id="u-ch" className="fi" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            {CHANNELS.map((value) => <option key={value} value={value}>{t(`tracker.channelOption.${value}`)}</option>)}
          </select>
        </div>
      )}
      {choice === "reply" && (
        <div>
          <label className="fl" htmlFor="u-st">{t("tracker.answerLabel")}</label>
          <select id="u-st" className="fi" value={answer} onChange={(e) => setAnswer(e.target.value as Answer)}>
            {ANSWERS.map((value) => <option key={value} value={value}>{t(`tracker.answer.${value}`)}</option>)}
          </select>
        </div>
      )}
      {showDate && (
        <div>
          <label className="fl" htmlFor="u-next">{dateLabel}</label>
          <input id="u-next" type="date" className="fi" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      )}
      {choice && (
        <>
          <div className="full"><label className="fl" htmlFor="u-note">{t("tracker.noteOptional")}</label><input id="u-note" className="fi" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="full"><p className="tip">{t("tracker.willBeSaved", { text: outcomeText })}</p></div>
        </>
      )}
      <div className="factions">
        <button className="btn" onClick={save} disabled={busy}>{t("common.save")}</button>
        <button className="btn2" onClick={onClose}>{t("common.cancel")}</button>
      </div>
    </PanelBox>
  );
}
