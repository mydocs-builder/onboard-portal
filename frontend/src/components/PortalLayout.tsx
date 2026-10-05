import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { usePortal } from "../portal/PortalProvider";
import { LOCK_AREA, MOBILE_MAIN, MOBILE_MORE, NAV_GROUPS, NAV_PATH, type NavId } from "../portal/nav";
import { Footer } from "./Footer";
import { LockIcon } from "./Icons";

export const SIGNED_OUT_KEY = "og.signedOut";

export async function signOut() {
  sessionStorage.setItem(SIGNED_OUT_KEY, "1");
  await supabase.auth.signOut();
}

export function PortalLayout() {
  const { t } = useTranslation();
  const portal = usePortal();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Nach jedem Seitenwechsel: Blatt "More" schließen, an den Seitenanfang.
  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Jobs und "Interview and guide" erscheinen erst, wenn es dort veröffentlichte Einträge gibt.
  const visible = (id: NavId) => (id === "jobs" ? portal.showJobs : id === "knowledge" ? portal.showKnowledge : true);
  const navItem = (id: NavId) => {
    const area = LOCK_AREA[id];
    return (
      <NavLink key={id} to={NAV_PATH[id]} end={id === "overview"} className={({ isActive }) => "nav" + (isActive ? " on" : "")}>
        <span>{t(`nav.items.${id}`)}</span>
        {area && portal.lockedAreas[area] && <LockIcon label={t("nav.locked")} />}
      </NavLink>
    );
  };
  const inMore = MOBILE_MORE.some((id) => location.pathname.startsWith(NAV_PATH[id]));
  const { profile } = portal;

  return (
    <>
      <header className="header">
        <Link className="brandlink" to="/"><div className="brand">{t("brand.name")}<span>{t("brand.portal")}</span></div></Link>
        <div className="hright">
          <Link className="who" to="/account">
            <span className="ini">{(profile.first_name || "?").charAt(0).toUpperCase()}</span>
            <span className="whoname">{profile.first_name} {profile.last_name} · {t(`plans.${portal.plan}`)}</span>
          </Link>
          <button className="planlink" onClick={signOut}>{t("common.signOut")}</button>
        </div>
      </header>

      <div className="frame">
        <nav className="side" aria-label={t("nav.aria")}>
          {NAV_GROUPS.map(({ group, items }) => (
            <div key={group ?? "top"} style={{ marginBottom: 18 }}>
              {group && <div className="grp">{t(`nav.groups.${group}`)}</div>}
              {items.filter(visible).map(navItem)}
            </div>
          ))}
        </nav>
        <main className="main">
          <div className="wrap"><Outlet /></div>
        </main>
      </div>

      <nav className="mnav" aria-label={t("nav.aria")}>
        {MOBILE_MAIN.map((id) => (
          <NavLink key={id} to={NAV_PATH[id]} end={id === "overview"} className={({ isActive }) => (isActive && !moreOpen ? "on" : "")}>
            {t(`nav.short.${id}`)}
          </NavLink>
        ))}
        <button className={moreOpen || inMore ? "on" : ""} aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
          {t("nav.more")}
        </button>
      </nav>
      {moreOpen && <div className="sheet">{MOBILE_MORE.filter(visible).map(navItem)}</div>}

      <div className="footwrap"><Footer /></div>
    </>
  );
}
