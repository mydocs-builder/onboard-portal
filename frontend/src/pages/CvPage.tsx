import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChecklists } from "../checklists/useChecklists";
import { ChecklistItems, ChecklistProgress } from "../components/Checklist";
import { LockIcon } from "../components/Icons";
import { PageStatus } from "../components/PageStatus";
import { Templates } from "../components/Templates";
import { supabase, type Tables } from "../lib/supabase";
import { PLAN_NAME } from "../lib/plan";
import { usePortal } from "../portal/PortalProvider";
import { PATHS, guidePath } from "../routes";

export function CvPage() {
  const { t } = useTranslation();
  const { locked } = usePortal();
  const { status, lists, done, toggle } = useChecklists("cv");
  const [articles, setArticles] = useState<Tables<"articles">[]>([]);

  useEffect(() => {
    supabase.from("articles").select("*").eq("area", "cv").eq("published", true).eq("language", "en").order("sort")
      .then(({ data }) => setArticles(data ?? []));
  }, []);

  const lockedArticles = locked.filter((row) => row.kind === "article" && row.area === "cv");
  const guides = [
    ...articles.map((article) => ({ key: article.slug, title: article.title, lead: article.lead, slug: article.slug as string | null, minPlan: null as string | null })),
    ...lockedArticles.map((row) => ({ key: row.title, title: row.title, lead: null, slug: null, minPlan: PLAN_NAME[row.min_plan] })),
  ];

  return (
    <>
      <div className="eyebrow">{t("nav.items.cv")}</div>
      <h1 className="t1">{t("cv.title")}</h1>
      <p className="lead">{t("cv.lead")}</p>

      <h2 className="t2" style={{ marginTop: 0 }}>{t("cv.checklist")}</h2>
      <PageStatus status={status} />
      {lists.map((list) => (
        <div key={list.id}>
          <ChecklistProgress list={list} />
          <ChecklistItems list={list} done={done} onToggle={toggle} />
        </div>
      ))}

      <Templates areas={["cv"]} always />

      <h2 className="t2">{t("cv.guides")}</h2>
      <div className="steps">
        {guides.map((guide, index) => (
          <div className="step" key={guide.key}>
            <div className="num">{String(index + 1).padStart(2, "0")}</div>
            <div>
              {guide.slug
                ? <Link className="linkh" to={guidePath("cv", guide.slug)}>{guide.title}</Link>
                : <Link className="linkh" to={PATHS.plan}>{guide.title}</Link>}
              {guide.lead && <p className="sdesc">{guide.lead}</p>}
              {guide.minPlan && (
                <div className="lockline"><LockIcon label={t("nav.locked")} /> {t("lock.fromPlanShort", { plan: guide.minPlan })}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
