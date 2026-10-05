import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Checkbox } from "../components/Checkbox";
import { useToast } from "../components/Toast";
import { FIELDS, isField } from "../lib/fields";
import { supabase } from "../lib/supabase";
import { usePortal } from "../portal/PortalProvider";
import { callbackUrl, MIN_PASSWORD_LENGTH } from "./auth/RegisterPage";

export const ACCOUNT_DELETED_KEY = "og.accountDeleted";

export function AccountPage() {
  const { t } = useTranslation();
  const flash = useToast();
  const [search, setSearch] = useSearchParams();

  // Rückkehr vom Bestätigungslink der neuen E-Mail-Adresse.
  useEffect(() => {
    if (search.get("changed") !== "email") return;
    flash(t("account.emailChanged"));
    setSearch({}, { replace: true });
  }, [search, setSearch, flash, t]);

  return (
    <>
      <div className="eyebrow">{t("nav.items.account")}</div>
      <h1 className="t1">{t("nav.items.account")}</h1>
      <p className="lead">{t("account.lead")}</p>
      <div className="acc">
        <PersonalDetails />
        <EmailAddress />
        <Password />
        <DeleteAccount />
      </div>
    </>
  );
}

function PersonalDetails() {
  const { t } = useTranslation();
  const flash = useToast();
  const portal = usePortal();
  const { profile } = portal;
  const [form, setForm] = useState({ first: profile.first_name, last: profile.last_name, field: profile.field ?? "", reminders: profile.reminders_enabled });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.first.trim()) return setError(t("auth.register.errorFirst"));
    if (!form.last.trim()) return setError(t("auth.register.errorLast"));
    setBusy(true);
    setError("");
    const { error: failure } = await supabase.from("profiles").update({
      first_name: form.first.trim(),
      last_name: form.last.trim(),
      field: isField(form.field) ? form.field : null,
      reminders_enabled: form.reminders,
    }).eq("user_id", portal.userId);
    setBusy(false);
    if (failure) return flash(t("common.saveError"));
    // Der Vorname steht auch in den Angaben der Anmeldung; die Mails von Supabase nehmen die Anrede von dort.
    supabase.auth.updateUser({ data: { first_name: form.first.trim(), last_name: form.last.trim() } });
    flash(t("account.detailsSaved"));
    await portal.refresh();
  }

  return (
    <form onSubmit={save} noValidate>
      <h2 className="t2" style={{ marginTop: 0 }}>{t("account.details")}</h2>
      <div className="pgrid">
        <div><label className="fl" htmlFor="p-first">{t("auth.register.first")}</label><input id="p-first" className="fi" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} autoComplete="given-name" /></div>
        <div><label className="fl" htmlFor="p-last">{t("auth.register.last")}</label><input id="p-last" className="fi" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} autoComplete="family-name" /></div>
        <div>
          <label className="fl" htmlFor="p-field">{t("account.field")}</label>
          <select id="p-field" className="fi" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })}>
            <option value="">{t("account.fieldNotSet")}</option>
            {FIELDS.map((field) => <option key={field} value={field}>{t(`fields.${field}`)}</option>)}
          </select>
        </div>
        <div className="full" style={{ marginTop: -20 }}>
          <Checkbox checked={form.reminders} onChange={(reminders) => setForm({ ...form, reminders })}>{t("account.reminders")}</Checkbox>
        </div>
        {error && <div className="full ferr" role="alert">{error}</div>}
      </div>
      <button className="btn2" type="submit" disabled={busy}>{t("account.saveDetails")}</button>
    </form>
  );
}

function EmailAddress() {
  const { t } = useTranslation();
  const flash = useToast();
  const { email } = usePortal();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) return setError(t("auth.register.errorEmail"));
    if (next.toLowerCase() === email.toLowerCase()) return setError(t("account.emailSame"));
    setBusy(true);
    setError("");
    const { error: failure } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: callbackUrl("/account?changed=email") });
    setBusy(false);
    if (failure) {
      if (failure.code === "email_exists") return setError(t("account.emailTaken"));
      if (failure.code === "over_email_send_rate_limit") return setError(t("auth.register.errorRate"));
      return setError(t("common.saveError"));
    }
    setValue("");
    flash(t("account.emailSent", { email: next }));
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="t2">{t("account.email")}</h2>
      <div className="kv"><div>{t("account.emailCurrent")}</div><div>{email}</div></div>
      <div className="pgrid">
        <div className="full">
          <label className="fl" htmlFor="p-mail">{t("account.emailNew")}</label>
          <input id="p-mail" type="email" className="fi" value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} autoComplete="email" />
          {error && <div className="ferr" role="alert">{error}</div>}
        </div>
      </div>
      <p className="tip" style={{ marginBottom: 20 }}>{t("account.emailHint")}</p>
      <button className="btn2" type="submit" disabled={busy}>{t("account.emailSubmit")}</button>
    </form>
  );
}

function Password() {
  const { t } = useTranslation();
  const flash = useToast();
  const { email } = usePortal();
  const [form, setForm] = useState({ current: "", next: "", repeat: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => { setForm({ ...form, [key]: event.target.value }); setError(""); };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.current) return setError(t("account.pwErrorCurrent"));
    if (form.next.length < MIN_PASSWORD_LENGTH) return setError(t("auth.reset.errorLength"));
    if (form.next !== form.repeat) return setError(t("auth.reset.errorRepeat"));
    setBusy(true);
    setError("");
    // Das aktuelle Passwort wird mit einer Anmeldung geprüft, erst danach wird das neue gesetzt.
    const check = await supabase.auth.signInWithPassword({ email, password: form.current });
    if (check.error) {
      setBusy(false);
      return setError(t(check.error.code === "invalid_credentials" ? "account.pwErrorWrong" : "common.saveError"));
    }
    const { error: failure } = await supabase.auth.updateUser({ password: form.next });
    setBusy(false);
    if (failure) return setError(t(failure.code === "same_password" ? "auth.reset.errorSame" : "common.saveError"));
    setForm({ current: "", next: "", repeat: "" });
    flash(t("account.pwChanged"));
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="t2">{t("auth.login.password")}</h2>
      <div className="pgrid">
        <div className="full"><label className="fl" htmlFor="p-cur">{t("account.pwCurrent")}</label><input id="p-cur" type="password" className="fi" value={form.current} onChange={set("current")} autoComplete="current-password" /></div>
        <div><label className="fl" htmlFor="p-new">{t("auth.reset.new")}</label><input id="p-new" type="password" className="fi" value={form.next} onChange={set("next")} autoComplete="new-password" /></div>
        <div><label className="fl" htmlFor="p-rep">{t("auth.reset.repeat")}</label><input id="p-rep" type="password" className="fi" value={form.repeat} onChange={set("repeat")} autoComplete="new-password" /></div>
        {error && <div className="full ferr" role="alert">{error}</div>}
      </div>
      <p className="tip" style={{ marginBottom: 20 }}>{t("account.pwHint")}</p>
      <button className="btn2" type="submit" disabled={busy}>{t("account.pwSubmit")}</button>
    </form>
  );
}

function DeleteAccount() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) return setError(t("account.pwErrorCurrent"));
    setBusy(true);
    setError("");
    const { data, error: failure } = await supabase.functions.invoke("delete-account", { body: { password } });
    if (failure || !data?.deleted) {
      setBusy(false);
      const code = failure && "context" in failure ? (await (failure.context as Response).json().catch(() => null))?.error : null;
      return setError(t(code === "wrong_password" ? "account.pwErrorWrong" : "account.deleteError"));
    }
    // Das Konto gibt es nicht mehr; nur die Sitzung im Browser wird noch entfernt.
    sessionStorage.setItem(ACCOUNT_DELETED_KEY, "1");
    await supabase.auth.signOut({ scope: "local" });
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="t2">{t("account.delete")}</h2>
      <div className="sec"><p>{t("account.deleteText")}</p></div>
      {!open && <button type="button" className="danger" onClick={() => setOpen(true)}>{t("account.deleteOpen")}</button>}
      {open && (
        <>
          <div className="pgrid">
            <div className="full">
              <label className="fl" htmlFor="d-pw">{t("account.deletePassword")}</label>
              <input id="d-pw" type="password" className="fi" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} autoComplete="current-password" />
              {error && <div className="ferr" role="alert">{error}</div>}
            </div>
          </div>
          <div className="factions">
            <button className="btn2" type="submit" disabled={busy}>{t("account.deleteSubmit")}</button>
            <button className="linkbtn" type="button" onClick={() => { setOpen(false); setPassword(""); setError(""); }}>{t("common.cancel")}</button>
          </div>
        </>
      )}
    </form>
  );
}
