import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { PATHS } from "../routes";

/**
 * Ziel des Links aus der Bestätigungsmail zum Newsletter (Double-Opt-in). Der Link gilt auch ohne
 * Anmeldung, etwa auf einem anderen Gerät; erst mit dem Einlösen ist der Newsletter bestellt.
 */
export function NewsletterConfirmPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [search] = useSearchParams();
  const token = search.get("token") ?? "";
  const [status, setStatus] = useState<"working" | "active" | "invalid" | "error">(token ? "working" : "invalid");
  const started = useRef(false);

  useEffect(() => {
    // Der Link gilt nur einmal; im Entwicklungsmodus läuft der Effekt zweimal.
    if (!token || started.current) return;
    started.current = true;
    supabase.functions.invoke("newsletter", { body: { action: "confirm", token } })
      .then(({ data, error }) => setStatus(error ? "error" : data?.status === "active" ? "active" : "invalid"));
  }, [token]);

  if (status === "working") return <div className="loading" role="status">{t("common.loading")}</div>;

  return (
    <>
      <h1 className="t1">{t(`emails.confirm.${status}Title`)}</h1>
      <p className="pm">{t(`emails.confirm.${status}Text`)}</p>
      <div className="aform">
        <Link className="btn2" to={session ? PATHS.account : PATHS.login}>{session ? t("nav.items.account") : t("auth.backToLogin")}</Link>
      </div>
    </>
  );
}
