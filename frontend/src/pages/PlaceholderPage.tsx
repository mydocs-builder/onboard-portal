import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { NavId } from "../portal/nav";

/** Platzhalter für Seiten, die in einem späteren Block gebaut werden. */
export function PlaceholderPage({ id }: { id: NavId }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="eyebrow">{t(`nav.items.${id}`)}</div>
      <h1 className="t1">{t(`nav.items.${id}`)}</h1>
      <p className="lead">{t("common.comingSoon")}</p>
    </>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="t1">{t("common.notFoundTitle")}</h1>
      <p className="lead">{t("common.notFoundText")}</p>
      <Link className="btn2" to="/">{t("common.backToOverview")}</Link>
    </>
  );
}
