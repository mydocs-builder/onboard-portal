import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatEuro, isPaidPlan, PASS_LENGTHS, usePrices, type PassLength } from "../../billing/prices";
import { PageStatus } from "../../components/PageStatus";
import type { PlanLevel } from "../../lib/supabase";
import { usePortal } from "../../portal/PortalProvider";
import { PRESELECTED_PLAN_KEY } from "../auth/RegisterPage";

export const WELCOME_SEEN_KEY = "og.welcomeSeen";

/** Die Stufenwahl gibt es einmal, nach der ersten Anmeldung, und nur wenn der Verkauf läuft und das Konto auf Free steht. */
export function shouldChoosePlan(portal: { firstSession: boolean; salesEnabled: boolean; plan: PlanLevel }): boolean {
  return portal.firstSession && portal.salesEnabled && portal.plan === "free" && sessionStorage.getItem(WELCOME_SEEN_KEY) !== "1";
}

/** Stufenwahl nach der Bestätigung der E-Mail-Adresse: Free, Starter oder Plus. */
export function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const portal = usePortal();
  const { status, prices } = usePrices();
  const [length, setLength] = useState<PassLength>("month");
  const [plan, setPlan] = useState<PlanLevel>(() => {
    const preselected = localStorage.getItem(PRESELECTED_PLAN_KEY);
    return isPaidPlan(preselected) ? preselected : "free";
  });

  if (!portal.salesEnabled || portal.plan !== "free") return <Navigate to="/" replace />;

  function proceed() {
    sessionStorage.setItem(WELCOME_SEEN_KEY, "1");
    localStorage.removeItem(PRESELECTED_PLAN_KEY);
    navigate(plan === "free" ? "/" : `/checkout?plan=${plan}&length=${length}`, { replace: true });
  }

  const options: PlanLevel[] = ["free", "starter", "plus"];
  const priceOf = (id: PlanLevel) => (id === "free" ? 0 : prices[id]?.[length]);

  return (
    <>
      <h1 className="t1">{t("welcome.title")}</h1>
      <p className="pm">{t("welcome.lead")}</p>
      <PageStatus status={status} />
      <div className="tabs" style={{ marginBottom: 20 }}>
        {PASS_LENGTHS.map((value) => (
          <button key={value} className={"tab" + (length === value ? " on" : "")} aria-pressed={length === value} onClick={() => setLength(value)}>{t(`plan.pass.${value}`)}</button>
        ))}
      </div>
      <div className="opts" role="radiogroup" aria-label={t("welcome.title")}>
        {options.filter((id) => priceOf(id) !== undefined).map((id) => (
          <button key={id} className={"opt" + (plan === id ? " on" : "")} role="radio" aria-checked={plan === id} onClick={() => setPlan(id)}>
            <span className="dot" />
            <span style={{ flex: 1 }}><strong style={{ fontWeight: 600 }}>{t(`plans.${id}`)}</strong> · {t(`welcome.sub.${id}`)}</span>
            <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              {id === "free" ? formatEuro(0) : t(`welcome.price.${length}`, { price: formatEuro(priceOf(id)!) })}
            </span>
          </button>
        ))}
      </div>
      <div className="aform" style={{ marginTop: 24 }}>
        <button className="btn" onClick={proceed}>{plan === "free" ? t("welcome.startFree") : t("welcome.continueWith", { plan: t(`plans.${plan}`) })}</button>
        <Link className="linkbtn" to="/plan" onClick={() => sessionStorage.setItem(WELCOME_SEEN_KEY, "1")}>{t("welcome.included")}</Link>
      </div>
    </>
  );
}
