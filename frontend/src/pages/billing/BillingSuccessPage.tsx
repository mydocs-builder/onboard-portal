import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../lib/dates";
import { supabase, type Tables } from "../../lib/supabase";
import { usePortal } from "../../portal/PortalProvider";

const ATTEMPTS = 15;
const INTERVAL_MS = 2000;

/**
 * Rückkehr von der Bezahlseite. Freigeschaltet wird nur durch die Meldung von Stripe an den Server;
 * diese Seite wartet darauf und zeigt dann Beginn und Ablaufdatum des Passes.
 */
export function BillingSuccessPage() {
  const { t } = useTranslation();
  const { today, refresh } = usePortal();
  const [search] = useSearchParams();
  const sessionId = search.get("session_id");
  const [period, setPeriod] = useState<Tables<"plan_periods"> | null>(null);
  const [waiting, setWaiting] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < ATTEMPTS && !cancelled; attempt++) {
        const { data } = await supabase.from("plan_periods").select("*").eq("stripe_session_id", sessionId).maybeSingle();
        if (cancelled) return;
        if (data) {
          setPeriod(data);
          setWaiting(false);
          await refresh(); // Stufe und Navigation gelten ab jetzt.
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, INTERVAL_MS));
      }
      if (!cancelled) setWaiting(false);
    })();
    return () => { cancelled = true; };
    // refresh gehört bewusst nicht zu den Abhängigkeiten: Es ändert sich mit jedem Laden des Portals
    // und soll die Abfrage nicht neu starten.
  }, [sessionId]);

  if (waiting) {
    return (
      <>
        <h1 className="t1">{t("success.waitingTitle")}</h1>
        <p className="pm" role="status">{t("success.waitingText")}</p>
      </>
    );
  }

  if (!period) {
    return (
      <>
        <h1 className="t1">{t("success.pendingTitle")}</h1>
        <p className="pm">{t("success.pendingText")}</p>
        <div className="aform"><Link className="btn2" to="/plan">{t("nav.items.plan")}</Link></div>
      </>
    );
  }

  const plan = t(`plans.${period.plan}`);
  const startsToday = period.starts_on <= today;
  return (
    <>
      <h1 className="t1">{t(startsToday ? "success.title" : "success.titleQueued", { plan })}</h1>
      <p className="pm">
        {startsToday
          ? t("success.text", { date: formatDate(period.ends_on) })
          : t("success.textQueued", { plan, from: formatDate(period.starts_on), until: formatDate(period.ends_on) })}
        {(period.credit_days ?? 0) > 0 && " " + t("success.credit", { count: period.credit_days! })}
        {" "}{t("success.invoice")}
      </p>
      <div className="aform"><Link className="btn" to="/">{t("success.enter")}</Link></div>
    </>
  );
}
