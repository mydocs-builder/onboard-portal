import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { supabase, type PlanLevel, type Tables } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import { BlockedPage } from "../pages/BlockedPage";

export type LockedRow = Database["public"]["Functions"]["locked_content"]["Returns"][number];

// Bereiche, deren Menüpunkt ein Schloss trägt, wenn die Stufe dort nichts sehen darf.
export type LockArea = "knowledge" | "companies" | "agencies" | "jobs" | "contract";

export type Portal = {
  userId: string;
  email: string;
  profile: Tables<"profiles">;
  access: Tables<"plan_access"> | null;
  /** Gültige Stufe laut Datenbank (effective_plan). */
  plan: PlanLevel;
  /** Heute in deutscher Zeit (portal_today). */
  today: string;
  freeApplicationLimit: number;
  passReminderDays: number;
  salesEnabled: boolean;
  locked: LockedRow[];
  lockedAreas: Record<LockArea, boolean>;
  /** "Jobs for internationals" erscheint erst, wenn ein Job veröffentlicht ist. */
  showJobs: boolean;
  /** "Interview and guide" erscheint erst, wenn dort ein Leitfaden veröffentlicht ist. */
  showKnowledge: boolean;
  /** Erste Sitzung nach dem ersten Login: "Welcome aboard". */
  firstSession: boolean;
  refresh: () => Promise<void>;
};

const PortalContext = createContext<Portal | null>(null);

const FIRST_SESSION_KEY = "og.firstSession";

type State = { status: "loading" } | { status: "blocked" } | { status: "error" } | { status: "ready"; portal: Omit<Portal, "refresh"> };

const count = (table: "companies" | "jobs" | "agencies" | "glossary_terms") =>
  supabase.from(table).select("id", { count: "exact", head: true });

export function PortalProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ status: "loading" });
  const user = session?.user;
  const userId = user?.id;
  const email = user?.email ?? "";
  const firstLoginMarked = useRef(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const [profile, access, plan, today, settings, registration, locked, companies, jobs, agencies, glossary, knowledge] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("plan_access").select("*").eq("user_id", userId).maybeSingle(),
        supabase.rpc("effective_plan", { uid: userId }),
        supabase.rpc("portal_today"),
        supabase.rpc("public_settings"),
        supabase.rpc("registration_info"),
        supabase.rpc("locked_content"),
        count("companies"),
        count("jobs"),
        count("agencies"),
        count("glossary_terms"),
        supabase.from("articles").select("id", { count: "exact", head: true }).in("area", ["interview", "guide"]),
      ]);

    if (profile.error || today.error) {
      setState({ status: "error" });
      return;
    }
    // Gesperrte Konten verlieren jeden Lesezugriff, auch auf das eigene Profil.
    if (!profile.data || !plan.data) {
      setState({ status: "blocked" });
      return;
    }

    const lockedRows = locked.data ?? [];
    const hasLocked = (kind: string, areas?: string[]) =>
      lockedRows.some((row) => row.kind === kind && (!areas || areas.includes(row.area ?? "")));
    const nothingVisible = (result: { count: number | null }) => (result.count ?? 0) === 0;

    // Die erste Sitzung bleibt es bis zum Schließen des Tabs, auch nach dem Neuladen.
    const firstSession = !profile.data.first_login_at || sessionStorage.getItem(FIRST_SESSION_KEY) === userId;
    if (!profile.data.first_login_at && !firstLoginMarked.current) {
      firstLoginMarked.current = true;
      sessionStorage.setItem(FIRST_SESSION_KEY, userId);
      await supabase.rpc("mark_first_login");
    }

    const limits = settings.data?.[0];
    setState({
      status: "ready",
      portal: {
        userId,
        email,
        profile: profile.data,
        access: access.data,
        plan: plan.data,
        today: today.data,
        freeApplicationLimit: limits?.free_application_limit ?? 10,
        passReminderDays: limits?.pass_reminder_days ?? 7,
        salesEnabled: registration.data?.[0]?.sales_enabled ?? false,
        locked: lockedRows,
        lockedAreas: {
          companies: nothingVisible(companies) && hasLocked("company"),
          jobs: nothingVisible(jobs) && hasLocked("job"),
          agencies: nothingVisible(agencies) && hasLocked("agency"),
          contract: nothingVisible(glossary) && hasLocked("glossary_term"),
          knowledge: nothingVisible(knowledge) && hasLocked("article", ["interview", "guide"]),
        },
        showJobs: !nothingVisible(jobs) || hasLocked("job"),
        showKnowledge: !nothingVisible(knowledge) || hasLocked("article", ["interview", "guide"]),
        firstSession,
      },
    });
  }, [userId, email]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === "loading") return <div className="loading" role="status">{t("common.loading")}</div>;
  if (state.status === "blocked") return <BlockedPage />;
  if (state.status === "error") {
    return (
      <div className="loading" role="alert">
        <p>{t("common.loadError")}</p>
        <button className="btn2" onClick={() => { setState({ status: "loading" }); load(); }}>{t("common.retry")}</button>
      </div>
    );
  }
  return <PortalContext.Provider value={{ ...state.portal, refresh: load }}>{children}</PortalContext.Provider>;
}

export function usePortal(): Portal {
  const portal = useContext(PortalContext);
  if (!portal) throw new Error("usePortal outside PortalProvider");
  return portal;
}
