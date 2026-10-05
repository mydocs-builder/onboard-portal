import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, displayUrl, safeUrl } from "../components/ExternalLink";
import { LockHint } from "../components/LockHint";
import { Markdown } from "../components/Markdown";
import { PageStatus } from "../components/PageStatus";
import { SIGNALS, Signals, type Signal } from "../components/Signals";
import { Templates } from "../components/Templates";
import { useToast } from "../components/Toast";
import { daysBetween, formatDate } from "../lib/dates";
import { FIELDS, type Field } from "../lib/fields";
import { PLAN_NAME, PLAN_RANK } from "../lib/plan";
import { supabase, type Enums, type Tables } from "../lib/supabase";
import { useList } from "../lists/useList";
import { usePortal } from "../portal/PortalProvider";
import { addApplication } from "../tracker/api";
import { suggestNext } from "../tracker/logic";

const EMPLOYER_TYPES: Enums<"employer_type">[] = ["hospital", "care_home", "outpatient"];

function Select({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div>
      <label className="fl" htmlFor={id}>{label}</label>
      <select id={id} className="fi" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </div>
  );
}

function Website({ url }: { url: string | null }) {
  const safe = safeUrl(url);
  return safe ? <ExternalLink href={safe}>{displayUrl(safe)}</ExternalLink> : <>-</>;
}

type ListName = "companies" | "boards" | "agencies" | "jobs";

/**
 * Zähler über einer Liste: "48 companies", mit Filter "12 of 48 companies", ohne Treffer ein Hinweis
 * mit "Clear filters". total sind die Einträge, die die Stufe sehen darf; anderes liefert die Datenbank nicht.
 */
function ListCount({ list, shown, total, onClear }: { list: ListName; shown: number; total: number; onClear: () => void }) {
  const { t } = useTranslation();
  if (shown === 0) {
    return (
      <p className="empty" role="status">
        {t(`lists.none.${list}`)} <button className="linkbtn" onClick={onClear}>{t("lists.clear")}</button>
      </p>
    );
  }
  return (
    <p className="meta listcount" role="status">
      {shown === total ? t(`lists.count.${list}`, { count: total }) : t(`lists.countOf.${list}`, { count: total, shown })}
    </p>
  );
}

// --- Job boards ---------------------------------------------------------------------------------

export function JobBoardsPage() {
  const { t } = useTranslation();
  const { locked } = usePortal();
  const { status, rows } = useList("job_boards", "name");
  const [category, setCategory] = useState("all");
  const categories = [...new Set(rows.map((row) => row.category).filter((value): value is string => !!value))];
  const lockedBoards = locked.filter((row) => row.kind === "job_board");
  // Die allgemeinen Börsen (für alle Stufen) zuerst, danach nach Fachgebiet und Name.
  const shown = rows
    .filter((row) => category === "all" || row.category === category)
    .sort((a, b) => PLAN_RANK[a.min_plan] - PLAN_RANK[b.min_plan] || (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name));

  return (
    <>
      <div className="eyebrow">{t("nav.items.boards")}</div>
      <h1 className="t1">{t("boards.title")}</h1>
      <p className="lead">{t("boards.lead")}</p>
      <PageStatus status={status} />
      {rows.length > 0 && (
        <>
          {categories.length > 1 && (
            <div className="filters">
              <Select id="f-cat" label={t("boards.field")} value={category} onChange={setCategory}>
                <option value="all">{t("boards.allFields")}</option>
                {categories.map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
            </div>
          )}
          <ListCount list="boards" shown={shown.length} total={rows.length} onClear={() => setCategory("all")} />
          {shown.length > 0 && <div className="tbox">
            <table className="tbl">
              <thead><tr><th>{t("boards.col.name")}</th><th>{t("boards.col.field")}</th><th>{t("boards.col.focus")}</th><th>{t("lists.website")}</th></tr></thead>
              <tbody>
                {shown.map((board) => (
                  <tr key={board.id}>
                    <td data-label={t("boards.col.name")}>{board.name}</td>
                    <td data-label={t("boards.col.field")}>{board.category ?? "-"}</td>
                    <td data-label={t("boards.col.focus")}>{board.focus ?? "-"}</td>
                    <td data-label={t("lists.website")}><Website url={board.website} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </>
      )}
      {lockedBoards.length > 0 && (
        <LockHint title={t("boards.lockTitle")} style={{ marginTop: 32 }}>{t("boards.lockText", { plan: PLAN_NAME[lockedBoards[0].min_plan] })}</LockHint>
      )}
    </>
  );
}

// --- Recruitment agencies -----------------------------------------------------------------------

export function AgenciesPage() {
  const { t } = useTranslation();
  const { locked, lockedAreas, profile } = usePortal();
  const { status, rows } = useList("agencies", "name");
  const [guide, setGuide] = useState<Tables<"articles"> | null>(null);
  const [field, setField] = useState<string>("all");
  const [model, setModel] = useState("all");
  const [abroad, setAbroad] = useState("all");

  useEffect(() => {
    supabase.from("articles").select("*").eq("area", "agencies").eq("published", true).eq("language", "en").order("sort").limit(1).maybeSingle()
      .then(({ data }) => setGuide(data));
  }, []);

  // Filter gibt es, sobald spezialisierte Agenturen sichtbar sind. Das Berufsfeld aus dem Profil ist vorgewählt.
  const hasSpecialised = rows.some((row) => row.specialised);
  const fields = FIELDS.filter((value) => rows.some((row) => row.field === value));
  useEffect(() => {
    if (profile.field && rows.some((row) => row.field === profile.field)) setField(profile.field);
  }, [profile.field, rows]);

  const shown = !hasSpecialised ? rows : rows
    .filter((row) => field === "all" || (field === "general" ? !row.field : row.field === field))
    .filter((row) => model === "all" || row.model === model || row.model === "both")
    .filter((row) => abroad === "all" || row.recruits_abroad);
  const lockedAgencies = locked.filter((row) => row.kind === "agency");

  return (
    <>
      <div className="eyebrow">{t("nav.items.agencies")}</div>
      <h1 className="t1">{t("agencies.title")}</h1>
      <p className="lead">{t("agencies.lead")}</p>
      <PageStatus status={status} />
      {lockedAreas.agencies && <LockHint title={t("lock.fromPlan", { plan: PLAN_NAME[lockedAgencies[0].min_plan] })}>{t("agencies.lockAll")}</LockHint>}

      {guide && <Markdown className="read sec">{guide.body}</Markdown>}
      <Templates areas={["agencies"]} />

      {rows.length > 0 && (
        <>
          <h2 className="t2">{t("agencies.list")}</h2>
          {hasSpecialised && (
            <div className="filters">
              <Select id="g-field" label={t("agencies.field")} value={field} onChange={setField}>
                <option value="all">{t("agencies.allFields")}</option>
                <option value="general">{t("agencies.generalists")}</option>
                {fields.map((value) => <option key={value} value={value}>{t(`fields.${value}`)}</option>)}
              </Select>
              <Select id="g-model" label={t("agencies.model")} value={model} onChange={setModel}>
                <option value="all">{t("lists.all")}</option>
                <option value="direct">{t("agencies.models.direct")}</option>
                <option value="temp">{t("agencies.models.temp")}</option>
              </Select>
              <Select id="g-abroad" label={t("agencies.abroadFilter")} value={abroad} onChange={setAbroad}>
                <option value="all">{t("lists.all")}</option>
                <option value="yes">{t("agencies.abroadYes")}</option>
              </Select>
            </div>
          )}
          <ListCount list="agencies" shown={shown.length} total={rows.length} onClear={() => { setField("all"); setModel("all"); setAbroad("all"); }} />
          {shown.length > 0 && <div className="tbox">
            <table className="tbl wide">
              <thead>
                <tr><th>{t("agencies.col.name")}</th><th>{t("agencies.field")}</th><th>{t("agencies.model")}</th><th>{t("agencies.col.abroad")}</th><th>{t("lists.region")}</th><th>{t("lists.website")}</th></tr>
              </thead>
              <tbody>
                {shown.map((agency) => (
                  <tr key={agency.id}>
                    <td data-label={t("agencies.col.name")}>{agency.name}</td>
                    <td data-label={t("agencies.field")}>{agency.field ? t(`fields.${agency.field}`) : t("agencies.allFields")}</td>
                    <td data-label={t("agencies.model")}>{agency.model ? t(`agencies.models.${agency.model}`) : "-"}</td>
                    <td data-label={t("agencies.col.abroad")}>{t(agency.recruits_abroad ? "lists.yes" : "lists.no")}</td>
                    <td data-label={t("lists.region")}>{agency.region ?? "-"}</td>
                    <td data-label={t("lists.website")}><Website url={agency.website} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          {lockedAgencies.length > 0 && (
            <LockHint title={t("agencies.lockSomeTitle")} style={{ marginTop: 32 }}>{t("agencies.lockSome", { plan: PLAN_NAME[lockedAgencies[0].min_plan] })}</LockHint>
          )}
        </>
      )}
    </>
  );
}

// --- Companies ----------------------------------------------------------------------------------

function IndustryFilters({ prefix, industry, setIndustry, type, setType, signal, setSignal, labels, children }: {
  prefix: string; industry: string; setIndustry: (value: string) => void; type: string; setType: (value: string) => void;
  signal: string; setSignal: (value: string) => void; labels: "companies" | "jobs"; children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="filters">
      <Select id={`${prefix}-ind`} label={t("lists.industry")} value={industry} onChange={(value) => { setIndustry(value); setType("all"); }}>
        <option value="all">{t("lists.allIndustries")}</option>
        {FIELDS.map((value) => <option key={value} value={value}>{t(`fields.${value}`)}</option>)}
      </Select>
      {/* Der Arbeitgebertyp gilt nur für die Pflege. */}
      {industry === "nursing_care" && (
        <Select id={`${prefix}-type`} label={t("lists.employerType")} value={type} onChange={setType}>
          <option value="all">{t("lists.allTypes")}</option>
          {EMPLOYER_TYPES.map((value) => <option key={value} value={value}>{t(`lists.employerTypes.${value}`)}</option>)}
        </Select>
      )}
      <Select id={`${prefix}-sig`} label={t("lists.signal")} value={signal} onChange={setSignal}>
        <option value="all">{t("lists.allSignals")}</option>
        {SIGNALS.map((value) => <option key={value} value={value}>{t(`signals.${labels}.${value}`)}</option>)}
      </Select>
      {children}
    </div>
  );
}

type Filterable = { industry: Field | null; employer_type: Enums<"employer_type"> | null; signals: Signal[] };
const matches = (row: Filterable, industry: string, type: string, signal: string) =>
  (industry === "all" || row.industry === industry)
  && (industry !== "nursing_care" || type === "all" || row.employer_type === type)
  && (signal === "all" || row.signals.includes(signal as Signal));

export function CompaniesPage() {
  const { t } = useTranslation();
  const { locked, lockedAreas, profile } = usePortal();
  const { status, rows } = useList("companies", "name");
  const [industry, setIndustry] = useState<string>(profile.field ?? "all");
  const [type, setType] = useState("all");
  const [signal, setSignal] = useState("all");
  const shown = rows.filter((row) => matches(row, industry, type, signal));
  const lockedCompanies = locked.filter((row) => row.kind === "company");

  return (
    <>
      <div className="eyebrow">{t("nav.items.companies")}</div>
      <h1 className="t1">{t("companies.title")}</h1>
      <p className="lead">{t("companies.lead")}</p>
      <PageStatus status={status} />
      {lockedAreas.companies && <LockHint title={t("lock.inPlan", { plan: PLAN_NAME[lockedCompanies[0].min_plan] })}>{t("companies.lock")}</LockHint>}
      {rows.length > 0 && (
        <>
          <IndustryFilters prefix="c" labels="companies" industry={industry} setIndustry={setIndustry} type={type} setType={setType} signal={signal} setSignal={setSignal} />
          <ListCount list="companies" shown={shown.length} total={rows.length} onClear={() => { setIndustry("all"); setType("all"); setSignal("all"); }} />
          {shown.length > 0 && <div className="tbox">
            <table className="tbl wide">
              <thead>
                <tr><th>{t("companies.col.name")}</th><th>{t("lists.industry")}</th><th>{t("lists.region")}</th><th>{t("lists.signals")}</th><th>{t("lists.website")}</th><th>{t("companies.col.checked")}</th></tr>
              </thead>
              <tbody>
                {shown.map((company) => (
                  <tr key={company.id}>
                    <td data-label={t("companies.col.name")}>{company.name}</td>
                    <td data-label={t("lists.industry")}>{company.industry ? t(`fields.${company.industry}`) : "-"}</td>
                    <td data-label={t("lists.region")}>{company.region ?? "-"}</td>
                    <td data-label={t("lists.signals")}><Signals signals={company.signals} labels="companies" /></td>
                    <td data-label={t("lists.website")}><Website url={company.website} /></td>
                    <td data-label={t("companies.col.checked")}>{formatDate(company.checked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          <p className="sample">{t("companies.note")}</p>
        </>
      )}
    </>
  );
}

// --- Jobs for internationals --------------------------------------------------------------------

export function JobsPage() {
  const { t } = useTranslation();
  const flash = useToast();
  const { locked, lockedAreas, profile, today } = usePortal();
  const { status, rows } = useList("jobs", "posted_on", false);
  const [industry, setIndustry] = useState<string>(profile.field ?? "all");
  const [type, setType] = useState("all");
  const [signal, setSignal] = useState("all");
  const [age, setAge] = useState("all");
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("applications").select("job_id").not("job_id", "is", null)
      .then(({ data }) => setTracked(new Set((data ?? []).map((row) => row.job_id as string))));
  }, []);

  const shown = rows
    .filter((row) => matches(row, industry, type, signal))
    .filter((row) => age === "all" || daysBetween(row.posted_on, today) <= Number(age));
  const lockedJobs = locked.filter((row) => row.kind === "job");

  async function track(job: Tables<"jobs">) {
    setBusy(job.id);
    const next = suggestNext("planned", today);
    const result = await addApplication({
      company: job.company_name, position: job.title, location: job.location, job_url: safeUrl(job.url),
      status: "planned", ...next, source: "job_list", job_id: job.id, company_id: job.company_id,
    }, t("tracker.event.addedFromJobs"));
    setBusy(null);
    if (!result.ok) return flash(result.reason === "limit" ? t("tracker.limitToast") : t("common.saveError"));
    setTracked(new Set(tracked).add(job.id));
    flash(t("jobs.added"));
  }

  const posted = (iso: string) => {
    const days = daysBetween(iso, today);
    return days <= 0 ? t("jobs.today") : days === 1 ? t("jobs.yesterday") : t("jobs.daysAgo", { count: days });
  };

  return (
    <>
      <div className="eyebrow">{t("nav.items.jobs")}</div>
      <h1 className="t1">{t("jobs.title")}</h1>
      <p className="lead">{t("jobs.lead")}</p>
      {profile.field && industry === profile.field && rows.length > 0 && (
        <p className="meta" style={{ margin: "-24px 0 32px" }}>{t("jobs.fieldNote", { field: t(`fields.${profile.field}`) })}</p>
      )}
      <PageStatus status={status} />
      {lockedAreas.jobs && <LockHint title={t("lock.inPlan", { plan: PLAN_NAME[lockedJobs[0].min_plan] })}>{t("jobs.lock")}</LockHint>}
      {rows.length > 0 && (
        <>
          <IndustryFilters prefix="j" labels="jobs" industry={industry} setIndustry={setIndustry} type={type} setType={setType} signal={signal} setSignal={setSignal}>
            <Select id="j-age" label={t("jobs.posted")} value={age} onChange={setAge}>
              <option value="all">{t("jobs.anyTime")}</option>
              <option value="7">{t("jobs.last7")}</option>
              <option value="3">{t("jobs.last3")}</option>
            </Select>
          </IndustryFilters>
          <ListCount list="jobs" shown={shown.length} total={rows.length} onClear={() => { setIndustry("all"); setType("all"); setSignal("all"); setAge("all"); }} />
          {shown.length > 0 && <div className="tbox">
            <table className="tbl wide">
              <thead>
                <tr><th>{t("tracker.col.position")}</th><th>{t("tracker.col.company")}</th><th>{t("tracker.location")}</th><th>{t("lists.signals")}</th><th>{t("jobs.posted")}</th><th><span className="sr-only">{t("tracker.col.actions")}</span></th></tr>
              </thead>
              <tbody>
                {shown.map((job) => {
                  const url = safeUrl(job.url);
                  return (
                    <tr key={job.id}>
                      <td data-label={t("tracker.col.position")}>{job.title}</td>
                      <td data-label={t("tracker.col.company")}>{job.company_name}</td>
                      <td data-label={t("tracker.location")}>{job.location ?? "-"}</td>
                      <td data-label={t("lists.signals")}><Signals signals={job.signals} labels="jobs" /></td>
                      <td data-label={t("jobs.posted")}>{posted(job.posted_on)}</td>
                      <td data-label={t("tracker.col.actions")}>
                        <div className="act">
                          {url && <ExternalLink className="sb" href={url}>{t("jobs.viewAd")}</ExternalLink>}
                          {tracked.has(job.id)
                            ? <span className="meta" style={{ alignSelf: "center" }}>{t("jobs.inApplications")}</span>
                            : <button className="sb pri" onClick={() => track(job)} disabled={busy === job.id} aria-label={`${t("jobs.addToApplications")}: ${job.title}`}>{t("jobs.addToApplications")}</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>}
          <p className="sample">{t("jobs.note")}</p>
        </>
      )}
    </>
  );
}
