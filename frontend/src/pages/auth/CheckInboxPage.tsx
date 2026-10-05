import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useToast } from "../../components/Toast";
import { supabase } from "../../lib/supabase";
import { callbackUrl, type RegistrationDetails } from "./RegisterPage";

// Der Bestätigungslink lässt sich je Konto drei Mal erneut senden. Durchgesetzt wird das in der
// Datenbank (app_settings.confirmation_resend_limit); Supabase Auth meldet die Ablehnung aber nur
// als allgemeinen Fehler. Die Seite zählt deshalb selbst mit, um den Hinweis gleich nach dem
// dritten Mal zu zeigen, und wertet auch den allgemeinen Fehler als erreichte Grenze.
const RESEND_LIMIT = 3;
const countKey = (email: string) => `og.resends:${email.toLowerCase()}`;
const resendsSoFar = (email: string) => Number(localStorage.getItem(countKey(email)) ?? 0);

export function CheckInboxPage() {
  const { t } = useTranslation();
  const flash = useToast();
  const state = useLocation().state as { email?: string; details?: RegistrationDetails } | null;
  const email = state?.email;
  const [busy, setBusy] = useState(false);
  const [limitReached, setLimitReached] = useState(() => !!email && resendsSoFar(email) >= RESEND_LIMIT);

  if (!email) return <Navigate to="/login" replace />;

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: email!, options: { emailRedirectTo: callbackUrl() } });
    setBusy(false);
    if (error?.code === "over_email_send_rate_limit") return flash(t("auth.inbox.resendError"));
    if (error) return setLimitReached(true);
    const count = resendsSoFar(email!) + 1;
    localStorage.setItem(countKey(email!), String(count));
    flash(t("auth.inbox.resent"));
    if (count >= RESEND_LIMIT) setLimitReached(true);
  }

  return (
    <>
      <h1 className="t1">{t("auth.inbox.title")}</h1>
      <p className="pm">
        <Trans
          i18nKey="auth.inbox.text"
          values={{ email }}
          components={{
            b: <strong style={{ fontWeight: 600 }} />,
            // Zurück zur Registrierung, mit den schon gemachten Angaben (ohne Passwort).
            change: <Link to="/register" state={{ prefill: state?.details ?? { first: "", last: "", email, code: "", field: "" } }} />,
          }}
        />
      </p>
      <div className="aform">
        {limitReached
          ? <div className="ferr" role="alert">{t("auth.inbox.resendLimit")}</div>
          : <button className="btn2" onClick={resend} disabled={busy}>{t("auth.inbox.resend")}</button>}
        <Link className="linkbtn" to="/login">{t("auth.backToLogin")}</Link>
      </div>
    </>
  );
}
