import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHS } from "../routes";

/** Stufen-Hinweis für gesperrte Inhalte, mit Link zur Stufenwahl. */
export function LockHint({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  const { t } = useTranslation();
  return (
    <div className="hint" style={style}>
      <p><strong>{title}</strong> {children}</p>
      <Link className="btn2" to={PATHS.plan}>{t("common.seePlans")}</Link>
    </div>
  );
}
