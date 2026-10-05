import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useToast } from "../../components/Toast";
import { supabase } from "../../lib/supabase";
import { MIN_PASSWORD_LENGTH } from "./RegisterPage";

/** Neues Passwort setzen, nach dem Link aus der Mail (Passwort vergessen oder Einladung). */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const flash = useToast();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("auth.reset.errorLength"));
      return;
    }
    if (password !== repeat) {
      setError(t("auth.reset.errorRepeat"));
      return;
    }
    setBusy(true);
    setError("");
    const { error: failure } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (failure) {
      if (failure.code === "same_password") setError(t("auth.reset.errorSame"));
      else if (failure.code === "weak_password") setError(t("auth.reset.errorLength"));
      else setError(t("auth.reset.errorOther"));
      return;
    }
    flash(t("auth.reset.done"));
    navigate("/", { replace: true });
  }

  return (
    <>
      <h1 className="t1">{t("auth.reset.title")}</h1>
      <p className="pm">{t("auth.reset.text")}</p>
      <form className="aform" onSubmit={submit} noValidate>
        <div>
          <label className="fl" htmlFor="n-pw">{t("auth.reset.new")}</label>
          <input id="n-pw" type="password" className="fi" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="fl" htmlFor="n-rep">{t("auth.reset.repeat")}</label>
          <input id="n-rep" type="password" className="fi" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
        </div>
        {error && <div className="ferr" role="alert">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>{t("auth.reset.submit")}</button>
      </form>
    </>
  );
}
