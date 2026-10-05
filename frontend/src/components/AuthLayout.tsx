import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MAIN_URL } from "../lib/links";
import { Footer } from "./Footer";

/** Rahmen für Anmeldung, Registrierung und Kauf: eine schmale Spalte, Logo führt zur Website. */
export function AuthLayout() {
  const { t } = useTranslation();
  return (
    <div className="authwrap">
      <div className="authcol">
        <a className="brandlink" href={MAIN_URL} aria-label={t("brand.homeAria")}>
          <div className="brand" style={{ marginBottom: 40 }}>{t("brand.name")}<span>{t("brand.portal")}</span></div>
        </a>
        <main><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}
