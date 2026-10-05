import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Checkbox } from "../../components/Checkbox";
import { ExternalLink } from "../../components/ExternalLink";
import { FIELDS } from "../../lib/fields";
import { PRIVACY_URL, TERMS_URL } from "../../lib/links";
import { supabase } from "../../lib/supabase";

export const MIN_PASSWORD_LENGTH = 10;
// Auf der Website vorgewählte Stufe (/register?plan=plus); die Stufenwahl nach der Bestätigung liest sie.
export const PRESELECTED_PLAN_KEY = "og.preselectedPlan";
export const callbackUrl = (next?: string) =>
  `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [form, setForm] = useState({ first: "", last: "", email: "", password: "", code: "", field: "" });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ inviteOnly: boolean; salesEnabled: boolean } | null>(null);

  useEffect(() => {
    supabase.rpc("registration_info").then(({ data }) => {
      const row = data?.[0];
      setInfo({ inviteOnly: row?.registration_mode === "invite", salesEnabled: row?.sales_enabled ?? false });
    });
  }, []);

  useEffect(() => {
    const plan = search.get("plan");
    if (plan === "starter" || plan === "plus") localStorage.setItem(PRESELECTED_PLAN_KEY, plan);
  }, [search]);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const email = form.email.trim();
    let problem = "";
    if (!form.first.trim()) problem = t("auth.register.errorFirst");
    else if (!form.last.trim()) problem = t("auth.register.errorLast");
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problem = t("auth.register.errorEmail");
    else if (form.password.length < MIN_PASSWORD_LENGTH) problem = t("auth.register.errorPassword");
    else if (info?.inviteOnly && !form.code.trim()) problem = t("auth.register.errorCode");
    else if (!terms) problem = t("auth.register.errorTerms");
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError("");
    const { error: failure } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: callbackUrl(),
        data: {
          first_name: form.first.trim(),
          last_name: form.last.trim(),
          ...(form.field ? { field: form.field } : {}),
          ...(info?.inviteOnly ? { invite_code: form.code.trim() } : {}),
          registration_source: "website",
        },
      },
    });
    setBusy(false);
    if (failure) {
      if (failure.code === "weak_password") setError(t("auth.register.errorPassword"));
      else if (failure.code === "over_email_send_rate_limit") setError(t("auth.register.errorRate"));
      // Die Datenbank weist die Registrierung ab, wenn der Einladungscode nicht stimmt.
      else if (info?.inviteOnly && failure.code === "unexpected_failure") setError(t("auth.register.errorCodeInvalid"));
      else setError(t("auth.register.errorOther"));
      return;
    }
    navigate("/check-inbox", { state: { email } });
  }

  return (
    <>
      <h1 className="t1">{t("auth.register.title")}</h1>
      <p className="pm">{info?.salesEnabled ? t("auth.register.leadSales") : t("auth.register.lead")}</p>
      <form className="aform" onSubmit={submit} noValidate>
        <div>
          <label className="fl" htmlFor="r-first">{t("auth.register.first")}</label>
          <input id="r-first" className="fi" value={form.first} onChange={set("first")} autoComplete="given-name" />
        </div>
        <div>
          <label className="fl" htmlFor="r-last">{t("auth.register.last")}</label>
          <input id="r-last" className="fi" value={form.last} onChange={set("last")} autoComplete="family-name" />
        </div>
        <div>
          <label className="fl" htmlFor="r-mail">{t("auth.login.email")}</label>
          <input id="r-mail" type="email" className="fi" value={form.email} onChange={set("email")} autoComplete="email" />
        </div>
        <div>
          <label className="fl" htmlFor="r-pw">{t("auth.login.password")}</label>
          <input id="r-pw" type="password" className="fi" value={form.password} onChange={set("password")} autoComplete="new-password" aria-describedby="r-pw-hint" />
          <div className="meta" id="r-pw-hint" style={{ marginTop: 6 }}>{t("auth.register.passwordHint")}</div>
        </div>
        {info?.inviteOnly && (
          <div>
            <label className="fl" htmlFor="r-code">{t("auth.register.code")}</label>
            <input id="r-code" className="fi" value={form.code} onChange={set("code")} aria-describedby="r-code-hint" />
            <div className="meta" id="r-code-hint" style={{ marginTop: 6 }}>{t("auth.register.codeHint")}</div>
          </div>
        )}
        <div>
          <label className="fl" htmlFor="r-field">{t("auth.register.field")}</label>
          <select id="r-field" className="fi" value={form.field} onChange={set("field")}>
            <option value="">{t("auth.register.fieldLater")}</option>
            {FIELDS.map((field) => <option key={field} value={field}>{t(`fields.${field}`)}</option>)}
          </select>
        </div>
        <Checkbox checked={terms} onChange={setTerms}>
          <Trans
            i18nKey="auth.register.terms"
            components={{ terms: <ExternalLink className="" arrow={false} href={TERMS_URL}>{""}</ExternalLink>, privacy: <ExternalLink className="" arrow={false} href={PRIVACY_URL}>{""}</ExternalLink> }}
          />
        </Checkbox>
        {error && <div className="ferr" role="alert">{error}</div>}
        <button className="btn" type="submit" disabled={busy || !info}>{t("auth.register.submit")}</button>
      </form>
      <p className="aswitch">{t("auth.register.already")} <Link className="linkbtn" to="/login">{t("auth.login.submit")}</Link></p>
    </>
  );
}
