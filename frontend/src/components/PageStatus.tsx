import { useTranslation } from "react-i18next";

/** Lade- und Fehlerzustand im Inhaltsbereich einer Seite. Liefert null, wenn die Daten da sind. */
export function PageStatus({ status }: { status: "loading" | "error" | "ready" }) {
  const { t } = useTranslation();
  if (status === "loading") return <p className="meta" role="status">{t("common.loading")}</p>;
  if (status === "error") return <p className="ferr" role="alert">{t("common.loadError")}</p>;
  return null;
}
