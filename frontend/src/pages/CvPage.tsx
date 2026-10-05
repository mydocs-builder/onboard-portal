import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChecklists } from "../checklists/useChecklists";
import { ChecklistItems, ChecklistProgress } from "../components/Checklist";
import { LockHint } from "../components/LockHint";
import { PageStatus } from "../components/PageStatus";
import { useToast } from "../components/Toast";
import { supabase, type Tables } from "../lib/supabase";
import { PLAN_NAME } from "../lib/plan";
import { usePortal } from "../portal/PortalProvider";
import { PATHS, guidePath } from "../routes";

type Content = { templates: Tables<"templates">[]; articles: Tables<"articles">[] };

export function CvPage() {
  const { t } = useTranslation();
  const flash = useToast();
  const { locked } = usePortal();
  const { status, lists, done, toggle } = useChecklists("cv");
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("templates").select("*").eq("active", true).eq("language", "en").order("sort"),
      supabase.from("articles").select("*").eq("area", "cv").eq("published", true).eq("language", "en").order("sort"),
    ]).then(([templates, articles]) => setContent({ templates: templates.data ?? [], articles: articles.data ?? [] }));
  }, []);

  // Der Link gilt eine Minute und wird nur ausgestellt, wenn die Stufe die Datei abrufen darf.
  async function download(template: Tables<"templates">) {
    const { data, error } = await supabase.storage.from("templates").createSignedUrl(template.file_path, 60, { download: true });
    if (error || !data) {
      flash(t("cv.downloadError"));
      return;
    }
    window.location.assign(data.signedUrl);
  }

  const lockedTemplates = locked.filter((row) => row.kind === "template");
  const lockedArticles = locked.filter((row) => row.kind === "article" && row.area === "cv");
  const guides = [
    ...(content?.articles ?? []).map((article) => ({ key: article.slug, title: article.title, lead: article.lead, slug: article.slug as string | null, minPlan: null as string | null })),
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

      <h2 className="t2">{t("cv.templates")}</h2>
      {content && content.templates.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line)", maxWidth: 900 }}>
          {content.templates.map((template) => (
            <div className="dl" key={template.id}>
              <div><div className="dt">{template.title}</div>{template.description && <div className="dd">{template.description}</div>}</div>
              <div>
                <span className="fmt">{template.format.toUpperCase()}</span>
                <button className="btn2" onClick={() => download(template)} aria-label={t("cv.downloadAria", { title: template.title })}>{t("cv.download")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {lockedTemplates.length > 0 && (
        <LockHint title={t("lock.fromPlan", { plan: PLAN_NAME[lockedTemplates[0].min_plan] })}>
          {lockedTemplates.map((row) => row.title).join(", ")}.
        </LockHint>
      )}
      {content && content.templates.length === 0 && lockedTemplates.length === 0 && <p className="empty">{t("common.nothingYet")}</p>}

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
              {guide.minPlan && <div className="lockline">{t("lock.fromPlanShort", { plan: guide.minPlan })}</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
