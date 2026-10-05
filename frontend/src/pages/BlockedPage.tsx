import { useTranslation } from "react-i18next";
import { signOut } from "../components/PortalLayout";

export function BlockedPage() {
  const { t } = useTranslation();
  return (
    <div className="authwrap">
      <div className="authcol">
        <div className="brand" style={{ marginBottom: 40 }}>{t("brand.name")}<span>{t("brand.portal")}</span></div>
        <h1 className="t1">{t("blocked.title")}</h1>
        <p className="pm">{t("blocked.text")}</p>
        <button className="btn2" onClick={signOut}>{t("common.signOut")}</button>
      </div>
    </div>
  );
}
