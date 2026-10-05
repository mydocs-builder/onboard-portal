import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatEuro, PAID_PLANS, usePrices } from "../../billing/prices";
import { CheckIcon } from "../../components/Icons";
import { PageStatus } from "../../components/PageStatus";
import { useToast } from "../../components/Toast";
import { formatDate } from "../../lib/dates";
import { PLAN_RANK } from "../../lib/plan";
import { supabase, type PlanLevel, type Tables } from "../../lib/supabase";
import { usePortal } from "../../portal/PortalProvider";
import { checkoutPath } from "../../routes";

type Period = Tables<"plan_periods">;
const fullyRefunded = (period: Period) => period.amount_cents !== null && (period.refunded_cents ?? 0) >= period.amount_cents && period.amount_cents > 0;

export function PlanPage() {
  const { t } = useTranslation();
  const flash = useToast();
  const { plan, access, today, salesEnabled } = usePortal();
  const [search, setSearch] = useSearchParams();
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const { status: priceStatus, prices } = usePrices();
  const cancelled = search.get("checkout") === "cancelled";

  useEffect(() => {
    supabase.from("plan_periods").select("*").order("created_at", { ascending: false }).then(({ data }) => setPeriods(data ?? []));
  }, []);

  const purchases = (periods ?? []).filter((period) => period.source === "pass");
  // Vorgemerkt: beginnt später, wurde nicht durch ein Upgrade ersetzt und nicht voll erstattet.
  const queued = (periods ?? [])
    .filter((period) => period.starts_on > today && !period.superseded_by && !fullyRefunded(period))
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  const hasAccess = plan !== "free" && !!access?.valid_until;
  const passText = !hasAccess
    ? t("plan.passFree")
    : access?.source === "manual" ? t("plan.passManual") : t(`plan.pass.${access?.pass_length ?? "month"}`);
  const untilText = !hasAccess
    ? t("plan.noEnd")
    : queued.length > 0 ? formatDate(access!.valid_until) : t("plan.untilThenFree", { date: formatDate(access!.valid_until) });

  return (
    <>
      <div className="eyebrow">{t("nav.items.plan")}</div>
      <h1 className="t1">{t("plan.title")}</h1>

      {cancelled && (
        <div className="hint">
          <p><strong>{t("plan.cancelledTitle")}</strong> {t("plan.cancelledText")}</p>
          <button className="linkbtn" onClick={() => setSearch({}, { replace: true })}>{t("plan.cancelledClose")}</button>
        </div>
      )}

      <div className="acc" style={{ marginBottom: 56 }}>
        <h2 className="t2" style={{ marginTop: 0 }}>{t("plan.current")}</h2>
        <div className="kv">
          <div>{t("plan.kvPlan")}</div><div>{t(`plans.${plan}`)}</div>
          <div>{t("plan.kvPass")}</div><div>{passText}</div>
          <div>{t("plan.kvUntil")}</div><div>{untilText}</div>
          {queued.map((period) => (
            <FragmentRow key={period.id} label={t("plan.kvNext")} value={t("plan.nextPass", { plan: t(`plans.${period.plan}`), from: formatDate(period.starts_on), until: formatDate(period.ends_on) })} />
          ))}
        </div>

        <h2 className="t2">{t("plan.purchases")}</h2>
        {periods && purchases.length === 0 && <p className="empty">{t("plan.noPurchases")}</p>}
        {purchases.length > 0 && (
          <>
            <div className="tbox">
              <table className="tbl" style={{ minWidth: 0 }}>
                <thead><tr><th>{t("plan.col.date")}</th><th>{t("plan.col.pass")}</th><th>{t("plan.col.amount")}</th></tr></thead>
                <tbody>
                  {purchases.map((period) => (
                    <tr key={period.id}>
                      <td data-label={t("plan.col.date")}>{formatDate(period.created_at)}</td>
                      <td data-label={t("plan.col.pass")}>{t("plan.passLine", { plan: t(`plans.${period.plan}`), length: t(`plan.length.${period.pass_length ?? "month"}`) })}</td>
                      <td data-label={t("plan.col.amount")}>
                        {period.amount_cents === null ? "-" : formatEuro(period.amount_cents)}
                        {(period.refunded_cents ?? 0) > 0 && <div className="meta">{t("plan.refunded", { amount: formatEuro(period.refunded_cents!) })}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sample">{t("plan.invoiceNote")}</p>
          </>
        )}
      </div>

      <h2 className="t2">{t("plan.change")}</h2>
      {!salesEnabled && (
        <div className="hint">
          <p>
            <strong>{t("plan.pilotTitle")}</strong> {t("plan.pilotText")}{" "}
            {plan === "plus" && access?.source === "manual" ? t("plan.pilotPlus", { date: formatDate(access.valid_until) }) : t("plan.pilotOther")}
          </p>
        </div>
      )}
      {salesEnabled && (
        <>
          <p className="lead">{t("plan.changeLead")}</p>
          <PageStatus status={priceStatus} />
          <div className="plans">
            <PlanCard id="free" current={plan} onFree={() => flash(t(plan === "free" ? "plan.onFree" : "plan.backToFree"))} />
            {PAID_PLANS.map((id) => <PlanCard key={id} id={id} current={plan} month={prices[id]?.month} quarter={prices[id]?.quarter} />)}
          </div>
          <p className="intro-note">{t("plan.priceNote")}</p>
        </>
      )}
    </>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return <><div>{label}</div><div>{value}</div></>;
}

function PlanCard({ id, current, month, quarter, onFree }: { id: PlanLevel; current: PlanLevel; month?: number; quarter?: number; onFree?: () => void }) {
  const { t } = useTranslation();
  const isCurrent = id === current;
  const higher = PLAN_RANK[id] > PLAN_RANK[current];
  const features = t(`plan.features.${id}`, { returnObjects: true }) as string[];
  const available = id === "free" || month !== undefined || quarter !== undefined;

  return (
    <div className={"card" + (id === "plus" ? " hl" : "")}>
      {id === "plus" && <div className="badge">{t("plan.badge")}</div>}
      <h3 className="ct">{t(`plans.${id}`)}</h3>
      <div className="cd">{t(`plan.sub.${id}`)}</div>
      <div className="price">
        {id === "free" ? formatEuro(0) : month !== undefined ? formatEuro(month) : quarter !== undefined ? formatEuro(quarter) : "-"}
        {id !== "free" && <small>{t(month !== undefined ? "plan.forMonth" : "plan.forQuarter")}</small>}
      </div>
      <div className="alt">{id !== "free" && month !== undefined && quarter !== undefined ? t("plan.orQuarter", { price: formatEuro(quarter) }) : ""}</div>
      <ul className="checks">
        {features.map((feature) => <li key={feature}><CheckIcon width={2.5} /><span>{feature}</span></li>)}
      </ul>
      {id === "free" && isCurrent && <button className="btn2" disabled>{t("plan.currentPlan")}</button>}
      {id === "free" && !isCurrent && <button className="btn2" onClick={onFree}>{t("plan.continueFree")}</button>}
      {id !== "free" && available && (
        <Link className={higher || isCurrent ? "btn" : "btn2"} to={checkoutPath(id)}>
          {isCurrent ? t("plan.extend") : higher ? t("plan.get", { plan: t(`plans.${id}`) }) : t("plan.getAfter", { plan: t(`plans.${id}`) })}
        </Link>
      )}
    </div>
  );
}
