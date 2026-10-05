import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthProvider";
import { firstOfTwoConfirmations, initialLinkError } from "../../lib/initialUrl";

/**
 * Ziel aller Links aus Mails (Bestätigung, Passwort zurücksetzen, E-Mail-Änderung, Einladung).
 * supabase-js übernimmt die Anmeldung aus der Adresse; danach geht es zu ?next= oder zur Übersicht.
 */
export function AuthCallbackPage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const [search] = useSearchParams();
  const [waited, setWaited] = useState(false);

  // Kommt keine Sitzung zustande (Link schon benutzt oder ohne Angaben geöffnet), nicht ewig warten.
  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  // Nur Ziele im Portal, keine fremden Adressen.
  const next = search.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (firstOfTwoConfirmations) {
    return (
      <>
        <h1 className="t1">{t("auth.link.firstTitle")}</h1>
        <p className="pm">{t("auth.link.firstText")}</p>
        <div className="aform">
          <Link className="btn2" to={session ? "/account" : "/login"}>{session ? t("nav.items.account") : t("auth.backToLogin")}</Link>
        </div>
      </>
    );
  }
  if (session && !initialLinkError) return <Navigate to={target} replace />;
  if (!initialLinkError && (loading || !waited)) return <div className="loading" role="status">{t("common.loading")}</div>;

  return (
    <>
      <h1 className="t1">{t("auth.link.title")}</h1>
      <p className="pm">{t("auth.link.text")}</p>
      <div className="aform">
        <Link className="btn2" to={session ? "/" : "/login"}>{session ? t("common.backToOverview") : t("auth.backToLogin")}</Link>
        {!session && <Link className="linkbtn" to="/forgot-password">{t("auth.link.newReset")}</Link>}
      </div>
    </>
  );
}
