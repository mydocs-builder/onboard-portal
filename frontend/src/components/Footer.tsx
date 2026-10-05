import { useTranslation } from "react-i18next";
import { IMPRINT_URL, MAIN_URL, PRIVACY_URL, TERMS_URL } from "../lib/links";
import { ExternalLink } from "./ExternalLink";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="pfoot">
      <ExternalLink className="" arrow={false} href={MAIN_URL}>{t("footer.website")}</ExternalLink>
      <ExternalLink className="" arrow={false} href={IMPRINT_URL}>{t("footer.imprint")}</ExternalLink>
      <ExternalLink className="" arrow={false} href={PRIVACY_URL}>{t("footer.privacy")}</ExternalLink>
      <ExternalLink className="" arrow={false} href={TERMS_URL}>{t("footer.terms")}</ExternalLink>
    </footer>
  );
}
