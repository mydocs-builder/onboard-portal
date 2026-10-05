import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Enums } from "../lib/supabase";

export type Signal = Enums<"company_signal">;
export const SIGNALS: Signal[] = ["english_ads", "relocation_support", "visa_support", "recognition_partnership"];

/**
 * Signale eines Unternehmens oder Jobs als Marken. "Recognition partnership" trägt eine Erklärung
 * mit Fundstelle, die sich per Fragezeichen öffnen lässt. labels wählt die Wortwahl (Unternehmen oder Jobs).
 */
export function Signals({ signals, labels }: { signals: Signal[]; labels: "companies" | "jobs" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="act">
        {signals.map((signal) => (
          <span className="sigw" key={signal}>
            <span className="tag">{t(`signals.${labels}.${signal}`)}</span>
            {signal === "recognition_partnership" && (
              <button className="tipbtn" aria-expanded={open} aria-label={t("signals.tipAria")} onClick={() => setOpen(!open)}>?</button>
            )}
          </span>
        ))}
      </div>
      {open && (
        <div className="tipbox" role="note">
          <strong>{t("signals.tipTitle")}</strong> {t("signals.tipText")}
          <span className="tipsrc">{t("signals.tipSource")}</span>
        </div>
      )}
    </>
  );
}
