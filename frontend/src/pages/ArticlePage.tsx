import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Markdown } from "../components/Markdown";
import { PageStatus } from "../components/PageStatus";
import { supabase, type Tables } from "../lib/supabase";
import { NAV_PATH, type NavId } from "../portal/nav";
import { NotFoundPage } from "./PlaceholderPage";

/** Ein Leitfaden zum Lesen. parent ist der Menüpunkt, zu dem "zurück" führt. */
export function ArticlePage({ parent }: { parent: NavId }) {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const [state, setState] = useState<{ status: "loading" | "error" | "ready"; article: Tables<"articles"> | null }>({ status: "loading", article: null });

  useEffect(() => {
    setState({ status: "loading", article: null });
    supabase.from("articles").select("*").eq("slug", slug).eq("language", "en").eq("published", true).maybeSingle()
      .then(({ data, error }) => setState({ status: error ? "error" : "ready", article: data }));
  }, [slug]);

  const back = <Link className="back" to={NAV_PATH[parent]}>{t(`nav.items.${parent}`)}</Link>;
  if (state.status !== "ready") return <>{back}<PageStatus status={state.status} /></>;
  // Gesperrte und unbekannte Leitfäden liefert die Datenbank nicht aus.
  if (!state.article) return <>{back}<NotFoundPage /></>;

  const { article } = state;
  return (
    <>
      {back}
      <div className="eyebrow">{t("article.eyebrow", { area: t(`nav.items.${parent}`) })}</div>
      <h1 className="t1">{article.title}</h1>
      {article.lead && <p className="lead">{article.lead}</p>}
      <Markdown>{article.body}</Markdown>
    </>
  );
}
