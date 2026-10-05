import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatEuro, isPaidPlan, isPassLength, PASS_LENGTHS, usePrices, type PassLength } from "../../billing/prices";
import { Checkbox } from "../../components/Checkbox";
import { CheckIcon } from "../../components/Icons";
import { PageStatus } from "../../components/PageStatus";
import { formatDate } from "../../lib/dates";
import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { usePortal } from "../../portal/PortalProvider";

type Preview = Database["public"]["Functions"]["preview_pass"]["Returns"][number];
type Consent = { version: string; body: string };

/** Bestellübersicht: Passlänge wählen, Beginn und Ablauf sehen, zustimmen, weiter zur Bezahlseite von Stripe. */
export function CheckoutPage() {
  const { t } = useTranslation();
  const { salesEnabled, today, passReminderDays } = usePortal();
  const [search, setSearch] = useSearchParams();
  const plan = search.get("plan");
  const length: PassLength = isPassLength(search.get("length")) ? (search.get("length") as PassLength) : "month";
  const { status: priceStatus, prices } = usePrices();
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined);
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const paidPlan = isPaidPlan(plan) ? plan : null;

  const loadConsent = () =>
    supabase.from("consent_texts").select("version, body").eq("active", true).eq("language", "en").maybeSingle()
      .then(({ data }) => setConsent(data));
  useEffect(() => { loadConsent(); }, []);

  // Beginn, Ablaufdatum und Umrechnung kommen aus der Datenbank, aus derselben Rechnung wie die Freischaltung.
  useEffect(() => {
    if (!paidPlan) return;
    setPreview(undefined);
    supabase.rpc("preview_pass", { p_plan: paidPlan, p_length: length }).then(({ data }) => setPreview(data?.[0] ?? null));
  }, [paidPlan, length]);

  if (!paidPlan || !salesEnabled) return <Navigate to="/plan" replace />;

  const planName = t(`plans.${paidPlan}`);
  const own = prices[paidPlan] ?? {};

  async function pay() {
    if (!consent) return;
    if (!agreed) return setError(t("checkout.errorConsent"));
    setBusy(true);
    setError("");
    const { data, error: failure } = await supabase.functions.invoke("create-checkout", {
      body: { plan: paidPlan, length, consent_version: consent.version },
    });
    if (!failure && typeof data?.url === "string") {
      window.location.assign(data.url);
      return;
    }
    setBusy(false);
    const code = failure && "context" in failure ? (await (failure.context as Response).json().catch(() => null))?.error : null;
    if (code === "consent_required") {
      // Der Wortlaut hat sich seit dem Laden geändert: neu anzeigen und erneut zustimmen lassen.
      setAgreed(false);
      await loadConsent();
      return setError(t("checkout.errorConsentChanged"));
    }
    setError(t(["sales_disabled", "pass_not_available", "account_blocked"].includes(code) ? "checkout.errorUnavailable" : "checkout.errorOther"));
  }

  const note = !preview || !preview.current_plan ? null
    : preview.upgrade
      ? preview.credit_days > 0
        ? t("checkout.noteUpgradeCredit", { plan: planName, current: t(`plans.${preview.current_plan}`), count: preview.credit_days })
        : t(preview.current_source === "manual" ? "checkout.noteUpgradeFree" : "checkout.noteUpgrade", { plan: planName })
      : preview.current_source === "manual"
        ? t("checkout.noteAfterFree", { current: t(`plans.${preview.current_plan}`) })
        : preview.current_plan === paidPlan
          ? t("checkout.noteExtend")
          : t("checkout.noteAfterHigher", { plan: planName, current: t(`plans.${preview.current_plan}`) });

  return (
    <>
      <h1 className="t1">{t("checkout.title", { plan: planName })}</h1>
      <p className="pm">{t("checkout.lead")}</p>
      <PageStatus status={priceStatus} />

      <div className="passpick" role="radiogroup" aria-label={t("checkout.lengthAria")}>
        {PASS_LENGTHS.filter((value) => own[value] !== undefined).map((value) => {
          const price = own[value]!;
          const selected = value === length;
          const saving = own.month !== undefined ? own.month * 3 - price : 0;
          return (
            <button
              key={value}
              className={"pcard" + (value === "quarter" ? " best" : "") + (selected ? " sel" : "")}
              role="radio"
              aria-checked={selected}
              onClick={() => { setSearch({ plan: paidPlan, length: value }, { replace: true }); setError(""); }}
            >
              {value === "quarter" && saving > 0 && <span className="pbadge">{t("checkout.best")}</span>}
              <span className="ptitle">{t(`checkout.length.${value}`)}</span>
              <span className="pprice">{formatEuro(price)}</span>
              <span className="pper">{value === "month" ? t("checkout.oneTime") : t("checkout.perMonth", { price: formatEuro(Math.round(price / 3)) })}</span>
              {value === "quarter" && saving > 0 && <span className="psave">{t("checkout.save", { amount: formatEuro(saving) })}</span>}
              <span className="pmark" aria-hidden="true">{selected && <CheckIcon size={14} />}</span>
            </button>
          );
        })}
      </div>

      {preview === null && priceStatus === "ready" && <p className="ferr" role="alert" style={{ marginTop: 28 }}>{t("checkout.errorUnavailable")}</p>}
      {preview && (
        <>
          <div className="kv" style={{ marginTop: 28 }}>
            <div>{t("plan.kvPlan")}</div><div>{planName}</div>
            <div>{t("plan.kvPass")}</div><div>{t(`plan.pass.${length}`)}</div>
            <div>{t("checkout.price")}</div><div>{t("checkout.priceVat", { price: formatEuro(preview.amount_cents) })}</div>
            <div>{t("checkout.starts")}</div>
            <div>{preview.starts_on === today ? t("checkout.today") : t(preview.current_source === "manual" ? "checkout.startsAfterFree" : "checkout.startsAfter", { date: formatDate(preview.starts_on) })}</div>
            <div>{t("plan.kvUntil")}</div><div>{formatDate(preview.ends_on)}</div>
          </div>
          {note && <p className="tip" style={{ marginTop: 12 }}>{note}</p>}

          {consent === null && <p className="ferr" role="alert" style={{ marginTop: 20 }}>{t("checkout.errorUnavailable")}</p>}
          {consent && (
            <>
              {/* Der Wortlaut der Zustimmung kommt versioniert aus der Datenbank und wird unverändert angezeigt. */}
              <Checkbox checked={agreed} onChange={(value) => { setAgreed(value); setError(""); }}>{consent.body}</Checkbox>
              {error && <div className="ferr" role="alert" style={{ marginTop: 12 }}>{error}</div>}
              <div className="aform" style={{ marginTop: 24 }}>
                <button className="btn" onClick={pay} disabled={busy}>{t("checkout.pay", { price: formatEuro(preview.amount_cents) })}</button>
                <Link className="linkbtn" to="/plan">{t("checkout.changePlan")}</Link>
              </div>
            </>
          )}
          <p className="meta" style={{ marginTop: 20 }}>{t("checkout.footnote", { count: passReminderDays })}</p>
        </>
      )}
    </>
  );
}
