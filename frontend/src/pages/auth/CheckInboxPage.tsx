import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useToast } from "../../components/Toast";
import { supabase } from "../../lib/supabase";
import { callbackUrl } from "./RegisterPage";

export function CheckInboxPage() {
  const { t } = useTranslation();
  const flash = useToast();
  const email = (useLocation().state as { email?: string } | null)?.email;
  const [busy, setBusy] = useState(false);

  if (!email) return <Navigate to="/login" replace />;

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: email!, options: { emailRedirectTo: callbackUrl() } });
    setBusy(false);
    flash(error ? t("auth.inbox.resendError") : t("auth.inbox.resent"));
  }

  return (
    <>
      <h1 className="t1">{t("auth.inbox.title")}</h1>
      <p className="pm"><Trans i18nKey="auth.inbox.text" values={{ email }} components={{ b: <strong style={{ fontWeight: 600 }} /> }} /></p>
      <div className="aform">
        <button className="btn2" onClick={resend} disabled={busy}>{t("auth.inbox.resend")}</button>
        <Link className="linkbtn" to="/login">{t("auth.backToLogin")}</Link>
      </div>
    </>
  );
}
