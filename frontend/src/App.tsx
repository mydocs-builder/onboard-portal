import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
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

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check-inbox" element={<CheckInboxPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/billing/success" element={<BillingSuccessPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<PortalLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/job-boards" element={<JobBoardsPage />} />
          <Route path="/agencies" element={<AgenciesPage />} />
          <Route path="/german" element={<GermanPage />} />
          <Route path="/interview-guide" element={<KnowledgePage />} />
          <Route path="/interview-guide/:slug" element={<ArticlePage parent="knowledge" />} />
          <Route path="/contract" element={<ContractPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/cv" element={<CvPage />} />
          <Route path="/cv/guides/:slug" element={<ArticlePage parent="cv" />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/visa" element={<VisaPage />} />
          <Route path="/first-day" element={<FirstDayPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
