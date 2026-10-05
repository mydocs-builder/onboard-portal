import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { usePortal } from "../portal/PortalProvider";
import { NAV, NAV_PATH, type NavItem } from "../portal/nav";
import { PATHS } from "../routes";
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

  // Welche Einträge es gibt und in welcher Reihenfolge, steht in src/portal/nav.ts.
  const visible = (item: NavItem) => !item.showIf || portal[item.showIf];
  const groups = NAV.map(({ group, items }) => ({ group, items: items.filter(visible) }));
  const all = groups.flatMap(({ items }) => items);
  const mobileMain = all.filter((item) => item.mobileMain);
  const mobileMore = all.filter((item) => !item.mobileMain);

  const navLink = (item: NavItem) => (
    <NavLink key={item.id} to={NAV_PATH[item.id]} end={NAV_PATH[item.id] === PATHS.overview} className={({ isActive }) => "nav" + (isActive ? " on" : "")}>
      <span>{t(`nav.items.${item.id}`)}</span>
      {item.lock && portal.lockedAreas[item.lock] && <LockIcon label={t("nav.locked")} />}
    </NavLink>
  );
  const inMore = mobileMore.some((item) => location.pathname.startsWith(NAV_PATH[item.id]));
  const { profile } = portal;

  return (
    <>
      <header className="header">
        <Link className="brandlink" to={PATHS.overview}><div className="brand">{t("brand.name")}<span>{t("brand.portal")}</span></div></Link>
        <div className="hright">
          <Link className="who" to={PATHS.account}>
            <span className="ini">{(profile.first_name || "?").charAt(0).toUpperCase()}</span>
            <span className="whoname">{profile.first_name} {profile.last_name} · {t(`plans.${portal.plan}`)}</span>
          </Link>
          <button className="planlink" onClick={signOut}>{t("common.signOut")}</button>
        </div>
      </header>

      <div className="frame">
        <nav className="side" aria-label={t("nav.aria")}>
          {groups.map(({ group, items }) => (
            <div key={group ?? "top"} style={{ marginBottom: 18 }}>
              {group && <div className="grp">{t(`nav.groups.${group}`)}</div>}
              {items.map(navLink)}
            </div>
          ))}
        </nav>
        <main className="main">
          <div className="wrap"><Outlet /></div>
        </main>
      </div>

      <nav className="mnav" aria-label={t("nav.aria")}>
        {mobileMain.map((item) => (
          <NavLink key={item.id} to={NAV_PATH[item.id]} end={NAV_PATH[item.id] === PATHS.overview} className={({ isActive }) => (isActive && !moreOpen ? "on" : "")}>
            {t(`nav.short.${item.id}`)}
          </NavLink>
        ))}
        <button className={moreOpen || inMore ? "on" : ""} aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
          {t("nav.more")}
        </button>
      </nav>
      {moreOpen && <div className="sheet">{mobileMore.map(navLink)}</div>}

      <div className="footwrap"><Footer /></div>
    </>
  );
}
