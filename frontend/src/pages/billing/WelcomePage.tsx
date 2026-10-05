import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatEuro, isPaidPlan, monthlyFrom, quarterSavingPercent, usePrices } from "../../billing/prices";
import { PageStatus } from "../../components/PageStatus";
import type { PlanLevel } from "../../lib/supabase";
import { usePortal } from "../../portal/PortalProvider";
import { PRESELECTED_PLAN_KEY } from "../auth/RegisterPage";
import { PATHS, checkoutPath } from "../../routes";

export const WELCOME_SEEN_KEY = "og.welcomeSeen";

/** Die Stufenwahl gibt es einmal, nach der ersten Anmeldung, und nur wenn der Verkauf läuft und das Konto auf Free steht. */
export function shouldChoosePlan(portal: { firstSession: boolean; salesEnabled: boolean; plan: PlanLevel }): boolean {
  return portal.firstSession && portal.salesEnabled && portal.plan === "free" && sessionStorage.getItem(WELCOME_SEEN_KEY) !== "1";
}

/**
 * Stufenwahl nach der Bestätigung der E-Mail-Adresse: Free, Starter oder Plus. Hier wird nur die Stufe
 * gewählt; die Laufzeit (1 oder 3 Monate) folgt auf der Bestellübersicht.
 */
export function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const portal = usePortal();
  const { status, prices } = usePrices();
  const [plan, setPlan] = useState<PlanLevel>(() => {
    const preselected = localStorage.getItem(PRESELECTED_PLAN_KEY);
    return isPaidPlan(preselected) ? preselected : "free";
  });

  if (!portal.salesEnabled || portal.plan !== "free") return <Navigate to={PATHS.overview} replace />;

  function proceed() {
    sessionStorage.setItem(WELCOME_SEEN_KEY, "1");
    localStorage.removeItem(PRESELECTED_PLAN_KEY);
    navigate(plan === "free" ? PATHS.overview : checkoutPath(plan), { replace: true });
  }

  const options: PlanLevel[] = ["free", "starter", "plus"];
  // Preisangabe je Stufe: der Monatspreis des 3-Monats-Passes. Eine Stufe ohne Preis gibt es nicht zu kaufen.
  const fromPrice = (id: PlanLevel) => (id === "free" ? 0 : monthlyFrom(prices[id]));
  const saving = quarterSavingPercent(prices);

  return (
    <>
      <h1 className="t1">{t("welcome.title")}</h1>
      <p className="pm">{t("welcome.lead")}</p>
      <PageStatus status={status} />
      <div className="opts" role="radiogroup" aria-label={t("welcome.title")}>
        {options.filter((id) => fromPrice(id) !== undefined).map((id) => (
          <button key={id} className={"opt" + (plan === id ? " on" : "")} role="radio" aria-checked={plan === id} onClick={() => setPlan(id)}>
            <span className="dot" />
            <span style={{ flex: 1 }}><strong style={{ fontWeight: 600 }}>{t(`plans.${id}`)}</strong> · {t(`welcome.sub.${id}`)}</span>
            <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              {id === "free" ? formatEuro(0) : t("welcome.fromPrice", { price: formatEuro(fromPrice(id)!) })}
            </span>
          </button>
        ))}
      </div>
      {status === "ready" && (
        <p className="meta" style={{ marginTop: 16 }}>
          {t("welcome.lengthNote")}{saving !== null && " " + t("welcome.saving", { percent: saving })}
        </p>
      )}
      <div className="aform" style={{ marginTop: 24 }}>
        <button className="btn" onClick={proceed}>{plan === "free" ? t("welcome.startFree") : t("welcome.continueWith", { plan: t(`plans.${plan}`) })}</button>
        <Link className="linkbtn" to={PATHS.plan} onClick={() => sessionStorage.setItem(WELCOME_SEEN_KEY, "1")}>{t("welcome.included")}</Link>
      </div>
    </>
  );
}
