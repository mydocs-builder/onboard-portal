import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./auth/AuthProvider";
import { AuthLayout } from "./components/AuthLayout";
import { PortalLayout, SIGNED_OUT_KEY } from "./components/PortalLayout";
import { PortalProvider } from "./portal/PortalProvider";
import { AuthCallbackPage } from "./pages/auth/AuthCallbackPage";
import { CheckInboxPage } from "./pages/auth/CheckInboxPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { AccountPage, ACCOUNT_DELETED_KEY } from "./pages/AccountPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ArticlePage } from "./pages/ArticlePage";
import { FirstDayPage, ProfilesPage, VisaPage } from "./pages/ChecklistPages";
import { BillingSuccessPage } from "./pages/billing/BillingSuccessPage";
import { CheckoutPage } from "./pages/billing/CheckoutPage";
import { PlanPage } from "./pages/billing/PlanPage";
import { WelcomePage } from "./pages/billing/WelcomePage";
import { ContractPage, GermanPage, KnowledgePage } from "./pages/ContentPages";
import { CvPage } from "./pages/CvPage";
import { AgenciesPage, CompaniesPage, JobBoardsPage, JobsPage } from "./pages/ListPages";
import { OverviewPage } from "./pages/OverviewPage";
import { NotFoundPage } from "./pages/PlaceholderPage";
import { PATHS, REDIRECTS, redirectTarget } from "./routes";

/** Weiterleitung einer früheren Adresse auf die heutige (REDIRECTS in src/routes.ts). */
function Redirect({ to }: { to: string }) {
  const params = useParams();
  const location = useLocation();
  return <Navigate to={redirectTarget(to, params, location.search, location.hash)} replace />;
}

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
    const signedOut = sessionStorage.getItem(SIGNED_OUT_KEY) === "1" || sessionStorage.getItem(ACCOUNT_DELETED_KEY) === "1";
    return <Navigate to={PATHS.login} replace state={signedOut ? null : { from: location.pathname + location.search }} />;
  }
  return <PortalProvider><Outlet /></PortalProvider>;
}

/** Login und Registrierung: Wer schon angemeldet ist, landet direkt im Portal. */
function GuestOnly() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (session) return <Navigate to={(location.state as { from?: string } | null)?.from ?? PATHS.overview} replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      {REDIRECTS.map(({ from, to }) => <Route key={from} path={from} element={<Redirect to={to} />} />)}

      <Route element={<AuthLayout />}>
        <Route element={<GuestOnly />}>
          <Route path={PATHS.login} element={<LoginPage />} />
          <Route path={PATHS.register} element={<RegisterPage />} />
          <Route path={PATHS.checkInbox} element={<CheckInboxPage />} />
          <Route path={PATHS.forgotPassword} element={<ForgotPasswordPage />} />
        </Route>
        <Route path={PATHS.authCallback} element={<AuthCallbackPage />} />
        <Route element={<RequireAuth />}>
          <Route path={PATHS.resetPassword} element={<ResetPasswordPage />} />
          <Route path={PATHS.welcome} element={<WelcomePage />} />
          <Route path={PATHS.checkout} element={<CheckoutPage />} />
          <Route path={PATHS.billingSuccess} element={<BillingSuccessPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<PortalLayout />}>
          <Route path={PATHS.overview} element={<OverviewPage />} />
          <Route path={PATHS.applications} element={<ApplicationsPage />} />
          <Route path={PATHS.jobs} element={<JobsPage />} />
          <Route path={PATHS.companies} element={<CompaniesPage />} />
          <Route path={PATHS.boards} element={<JobBoardsPage />} />
          <Route path={PATHS.agencies} element={<AgenciesPage />} />
          <Route path={PATHS.german} element={<GermanPage />} />
          <Route path={PATHS.knowledge} element={<KnowledgePage />} />
          <Route path={PATHS.knowledgeGuide} element={<ArticlePage parent="knowledge" />} />
          <Route path={PATHS.contract} element={<ContractPage />} />
          <Route path={PATHS.plan} element={<PlanPage />} />
          <Route path={PATHS.account} element={<AccountPage />} />
          <Route path={PATHS.cv} element={<CvPage />} />
          <Route path={PATHS.cvGuide} element={<ArticlePage parent="cv" />} />
          <Route path={PATHS.linkedin} element={<ProfilesPage />} />
          <Route path={PATHS.checklist} element={<VisaPage />} />
          <Route path={PATHS.arrival} element={<FirstDayPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
