import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PLAN_NAME } from "../lib/plan";
import { supabase, type Enums, type Tables } from "../lib/supabase";
import { usePortal } from "../portal/PortalProvider";
import { LockHint } from "./LockHint";
import { useToast } from "./Toast";

export type ContentArea = Enums<"article_area">;

/**
 * Vorlagen zum Download für die Bereiche einer Seite (templates.area). Eine Vorlage erscheint auf der
 * Seite ihres Bereichs, ohne Änderung am Code. Ohne Vorlagen entfällt der Abschnitt, außer mit always.
 */
export function Templates({ areas, always = false, first = false }: { areas: ContentArea[]; always?: boolean; first?: boolean }) {
  const { t } = useTranslation();
  const flash = useToast();
  const { locked } = usePortal();
  const [templates, setTemplates] = useState<Tables<"templates">[] | null>(null);
  const areaKey = areas.join(",");

  useEffect(() => {
    supabase.from("templates").select("*").in("area", areaKey.split(",") as ContentArea[]).eq("active", true).eq("language", "en").order("sort")
      .then(({ data }) => setTemplates(data ?? []));
  }, [areaKey]);

  // Der Link gilt eine Minute und wird nur ausgestellt, wenn die Stufe die Datei abrufen darf.
  async function download(template: Tables<"templates">) {
    const { data, error } = await supabase.storage.from("templates").createSignedUrl(template.file_path, 60, { download: true });
    if (error || !data) return flash(t("templates.downloadError"));
    window.location.assign(data.signedUrl);
  }

  const lockedTemplates = locked.filter((row) => row.kind === "template" && (areas as string[]).includes(row.area));
  const visible = templates ?? [];
  if (!always && visible.length === 0 && lockedTemplates.length === 0) return null;

  return (
    <>
      <h2 className="t2" style={first ? { marginTop: 0 } : undefined}>{t("templates.title")}</h2>
      {visible.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line)", maxWidth: 900 }}>
          {visible.map((template) => (
            <div className="dl" key={template.id}>
              <div><div className="dt">{template.title}</div>{template.description && <div className="dd">{template.description}</div>}</div>
              <div>
                <span className="fmt">{template.format.toUpperCase()}</span>
                <button className="btn2" onClick={() => download(template)} aria-label={t("templates.downloadAria", { title: template.title })}>{t("templates.download")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {lockedTemplates.length > 0 && (
        <LockHint title={t("lock.fromPlan", { plan: PLAN_NAME[lockedTemplates[0].min_plan] })} style={visible.length > 0 ? { marginTop: 32 } : undefined}>
          {lockedTemplates.map((row) => row.title).join(", ")}.
        </LockHint>
      )}
      {templates && visible.length === 0 && lockedTemplates.length === 0 && <p className="empty">{t("common.nothingYet")}</p>}
    </>
  );
}
