import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./auth/AuthProvider";
import { AuthLayout } from "./components/AuthLayout";
import { PortalLayout, SIGNED_OUT_KEY } from "./components/PortalLayout";
import { PortalProvider } from "./portal/PortalProvider";
import { NAV_PATH, type NavId } from "./portal/nav";
import { LoginPage } from "./pages/auth/LoginPage";
import { NotFoundPage, PlaceholderPage } from "./pages/PlaceholderPage";

function Loading() {
  const { t } = useTranslation();
  return <div className="loading" role="status">{t("common.loading")}</div>;
}

/** Alles im Portal braucht eine Anmeldung; nicht angemeldete Besucher sehen nur Login und Registrierung. */
function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session) {
    // Nach dem Abmelden merkt sich das Login die letzte Seite nicht; das nächste Konto startet auf der Übersicht.
    const signedOut = sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
    return <Navigate to="/login" replace state={signedOut ? null : { from: location.pathname + location.search }} />;
  }
  return <PortalProvider><Outlet /></PortalProvider>;
}

/** Login und Registrierung: Wer schon angemeldet ist, landet direkt im Portal. */
function GuestOnly() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (session) return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/"} replace />;
  return <Outlet />;
}

const PLACEHOLDERS: NavId[] = [
  "overview", "cv", "linkedin", "applications", "jobs", "companies", "boards", "agencies",
  "checklist", "german", "knowledge", "contract", "arrival", "plan", "account",
];

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<PortalLayout />}>
          {PLACEHOLDERS.map((id) => (
            <Route key={id} path={NAV_PATH[id]} element={<PlaceholderPage id={id} />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
