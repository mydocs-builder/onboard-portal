import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { callbackUrl } from "./RegisterPage";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError(t("auth.register.errorEmail"));
      return;
    }
    setBusy(true);
    setError("");
    const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl("/reset-password") });
    setBusy(false);
    // Neutral bestätigen, ohne zu verraten, ob die Adresse registriert ist. Nur die Sendebegrenzung wird gemeldet.
    if (failure?.code === "over_email_send_rate_limit") setError(t("auth.register.errorRate"));
    else setSent(true);
  }

  if (sent) {
    return (
      <>
        <h1 className="t1">{t("auth.forgot.sentTitle")}</h1>
        <p className="pm">{t("auth.forgot.sentText")}</p>
        <div className="aform"><Link className="btn2" to="/login">{t("auth.backToLogin")}</Link></div>
      </>
    );
  }

  return (
    <>
      <h1 className="t1">{t("auth.forgot.title")}</h1>
      <p className="pm">{t("auth.forgot.text")}</p>
      <form className="aform" onSubmit={submit} noValidate>
        <div>
          <label className="fl" htmlFor="f-mail">{t("auth.login.email")}</label>
          <input id="f-mail" type="email" className="fi" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        {error && <div className="ferr" role="alert">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>{t("auth.forgot.submit")}</button>
        <Link className="linkbtn" to="/login">{t("auth.backToLogin")}</Link>
      </form>
    </>
  );
}
