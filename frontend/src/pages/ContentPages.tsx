import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LockHint } from "../components/LockHint";
import { Markdown } from "../components/Markdown";
import { PageStatus } from "../components/PageStatus";
import { Templates } from "../components/Templates";
import { PLAN_NAME } from "../lib/plan";
import { supabase, type Enums, type Tables } from "../lib/supabase";
import { usePortal } from "../portal/PortalProvider";
import { guidePath } from "../routes";

type Status = "loading" | "error" | "ready";
type Category = Enums<"phrase_category">;
const CATEGORIES: Category[] = ["cover_letter", "phone", "interview", "vocabulary"];

// --- German for the job -------------------------------------------------------------------------

export function GermanPage() {
  const { t } = useTranslation();
  const { locked, profile } = usePortal();
  const [state, setState] = useState<{ status: Status; phrases: Tables<"phrases">[] }>({ status: "loading", phrases: [] });
  const [tab, setTab] = useState<Category>("cover_letter");

  useEffect(() => {
    supabase.from("phrases").select("*").eq("language", "en").order("sort")
      .then(({ data, error }) => setState({ status: error ? "error" : "ready", phrases: data ?? [] }));
  }, []);

  // Fachvokabular: das eigene Berufsfeld, wenn es dafür Einträge gibt, sonst das allgemeine.
  const ownVocabulary = state.phrases.filter((row) => row.category === "vocabulary" && profile.field && row.field === profile.field);
  const hasOwn = ownVocabulary.length > 0;
  const rows = tab === "vocabulary"
    ? (hasOwn ? ownVocabulary : state.phrases.filter((row) => row.category === "vocabulary" && !row.field))
    : state.phrases.filter((row) => row.category === tab);
  const lockedHere = locked.filter((row) => row.kind === "phrase" && row.area === tab);
  const intro = tab === "vocabulary" ? t(hasOwn ? "german.intro.vocabularyOwn" : "german.intro.vocabularyGeneral") : t(`german.intro.${tab}`);

  return (
    <>
      <div className="eyebrow">{t("nav.items.german")}</div>
      <h1 className="t1">{t("german.title")}</h1>
      <p className="lead">{t("german.lead")}</p>
      <div className="tabs">
        {CATEGORIES.map((category) => (
          <button key={category} className={"tab" + (tab === category ? " on" : "")} aria-pressed={tab === category} onClick={() => setTab(category)}>
            {category === "vocabulary"
              ? t("german.tab.vocabulary", { field: hasOwn && profile.field ? t(`fields.${profile.field}`) : t("german.general") })
              : t(`german.tab.${category}`)}
          </button>
        ))}
      </div>
      <PageStatus status={state.status} />
      {rows.length > 0 && (
        <>
          <div className="sec"><p>{intro}</p></div>
          <div className="tbox">
            <table className="tbl">
              <thead><tr><th>{t("german.col.german")}</th><th>{t("german.col.english")}</th><th>{t("german.col.usage")}</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label={t("german.col.german")} lang="de">{row.german}</td>
                    <td data-label={t("german.col.english")}>{row.english}</td>
                    <td data-label={t("german.col.usage")}>{row.usage || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {state.status === "ready" && rows.length === 0 && lockedHere.length > 0 && (
        <LockHint title={t("lock.fromPlan", { plan: PLAN_NAME[lockedHere[0].min_plan] })}>{t("german.lock")}</LockHint>
      )}
      {state.status === "ready" && rows.length === 0 && lockedHere.length === 0 && <p className="empty">{t("common.nothingYet")}</p>}
    </>
  );
}

// --- Interview and guide ------------------------------------------------------------------------

export function KnowledgePage() {
  const { t } = useTranslation();
  const { locked, lockedAreas } = usePortal();
  const [state, setState] = useState<{ status: Status; articles: Tables<"articles">[] }>({ status: "loading", articles: [] });

  useEffect(() => {
    supabase.from("articles").select("*").in("area", ["interview", "guide"]).eq("published", true).eq("language", "en").order("area", { ascending: false }).order("sort")
      .then(({ data, error }) => setState({ status: error ? "error" : "ready", articles: data ?? [] }));
  }, []);

  const lockedArticles = locked.filter((row) => row.kind === "article" && ["interview", "guide"].includes(row.area));

  return (
    <>
      <div className="eyebrow">{t("nav.items.knowledge")}</div>
      <h1 className="t1">{t("knowledge.title")}</h1>
      <p className="lead">{t("knowledge.lead")}</p>
      <PageStatus status={state.status} />
      <div className="steps">
        {state.articles.map((article, index) => (
          <div className="step" key={article.id}>
            <div className="num">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <Link className="linkh" to={guidePath("knowledge", article.slug)}>{article.title}</Link>
              {article.lead && <p className="sdesc">{article.lead}</p>}
            </div>
          </div>
        ))}
      </div>
      <Templates areas={["interview", "guide"]} />
      {lockedAreas.knowledge && <LockHint title={t("lock.fromPlan", { plan: PLAN_NAME[lockedArticles[0].min_plan] })}>{t("knowledge.lock")}</LockHint>}
    </>
  );
}

// --- Employment contract ------------------------------------------------------------------------

export function ContractPage() {
  const { t } = useTranslation();
  const { locked, lockedAreas } = usePortal();
  const [state, setState] = useState<{ status: Status; terms: Tables<"glossary_terms">[]; articles: Tables<"articles">[] }>({ status: "loading", terms: [], articles: [] });

  useEffect(() => {
    Promise.all([
      supabase.from("glossary_terms").select("*").eq("language", "en").order("sort"),
      supabase.from("articles").select("*").eq("area", "contract").eq("published", true).eq("language", "en").order("sort"),
    ]).then(([terms, articles]) => setState({ status: terms.error ? "error" : "ready", terms: terms.data ?? [], articles: articles.data ?? [] }));
  }, []);

  const lockedTerms = locked.filter((row) => row.kind === "glossary_term");

  return (
    <>
      <div className="eyebrow">{t("nav.items.contract")}</div>
      <h1 className="t1">{t("contract.title")}</h1>
      <p className="lead">{t("contract.lead")}</p>
      <PageStatus status={state.status} />
      {lockedAreas.contract && <LockHint title={t("lock.fromPlan", { plan: PLAN_NAME[lockedTerms[0].min_plan] })}>{t("contract.lock")}</LockHint>}
      {state.terms.length > 0 && (
        <>
          <div className="hint"><p><strong>{t("contract.generalTitle")}</strong> {t("contract.generalText")}</p></div>
          <div className="docs">
            {state.terms.map((term) => (
              <div className="doc" key={term.id} style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                <div>
                  <div className="dt"><span lang="de">{term.term_de}</span> <span style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--grey)" }}>{term.term_en}</span></div>
                  <div className="dd">{term.what}</div>
                  {term.look_for && <div className="dd" style={{ marginTop: 8 }}><strong style={{ fontWeight: 600 }}>{t("contract.lookFor")}</strong> {term.look_for}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {state.articles.map((article) => (
        <div key={article.id}>
          <h2 className="t2">{article.title}</h2>
          <Markdown>{article.body}</Markdown>
        </div>
      ))}
      <Templates areas={["contract"]} />
      {state.status === "ready" && state.terms.length === 0 && state.articles.length === 0 && !lockedAreas.contract && <p className="empty">{t("common.nothingYet")}</p>}
    </>
  );
}
