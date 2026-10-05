import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SIGNED_OUT_KEY } from "../../components/PortalLayout";
import { MAIN_URL } from "../../lib/links";
import { supabase } from "../../lib/supabase";
import { ACCOUNT_DELETED_KEY } from "../AccountPage";
import { PATHS } from "../../routes";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Hinweis nach dem Abmelden, einmalig.
  const [signedOut] = useState(() => {
    const flag = sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
    sessionStorage.removeItem(SIGNED_OUT_KEY);
    return flag;
  });

  const [deleted] = useState(() => {
    const flag = sessionStorage.getItem(ACCOUNT_DELETED_KEY) === "1";
    sessionStorage.removeItem(ACCOUNT_DELETED_KEY);
    return flag;
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError(t("auth.login.errorMissing"));
      return;
    }
    setBusy(true);
    setError("");
    const { error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (!failure) return; // Die Weiterleitung übernimmt GuestOnly, sobald die Sitzung da ist.
    if (failure.code === "email_not_confirmed") setError(t("auth.login.errorUnconfirmed"));
    else if (failure.code === "invalid_credentials") setError(t("auth.login.errorInvalid"));
    else setError(t("auth.login.errorOther"));
  }

  return (
    <>
      {signedOut && (
        <div className="hint" style={{ marginBottom: 28 }}>
          <p><strong>{t("auth.login.signedOut")}</strong> <a href={MAIN_URL}>{t("auth.login.backToWebsite")}</a></p>
        </div>
      )}
      {deleted && (
        <div className="hint" style={{ marginBottom: 28 }}>
          <p><strong>{t("account.deleted")}</strong> <a href={MAIN_URL}>{t("auth.login.backToWebsite")}</a></p>
        </div>
      )}
      <h1 className="t1">{t("auth.login.title")}</h1>
      <p className="pm">{t("auth.login.lead")}</p>
      <form className="aform" onSubmit={submit} noValidate>
        <div>
          <label className="fl" htmlFor="l-mail">{t("auth.login.email")}</label>
          <input id="l-mail" type="email" className="fi" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="fl" htmlFor="l-pw">{t("auth.login.password")}</label>
          <input id="l-pw" type="password" className="fi" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <div className="ferr" role="alert">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>{t("auth.login.submit")}</button>
        <Link className="linkbtn" to={PATHS.forgotPassword}>{t("auth.login.forgot")}</Link>
      </form>
      <p className="aswitch">{t("auth.login.noAccount")} <Link className="linkbtn" to={PATHS.register}>{t("auth.login.create")}</Link></p>
    </>
  );
}
