import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHS } from "../routes";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="t1">{t("common.notFoundTitle")}</h1>
      <p className="lead">{t("common.notFoundText")}</p>
      <Link className="btn2" to={PATHS.overview}>{t("common.backToOverview")}</Link>
    </>
  );
}
