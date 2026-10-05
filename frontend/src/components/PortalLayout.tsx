import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { usePortal } from "../portal/PortalProvider";
import { withChecklists, type ChecklistRef } from "../portal/checklistNav";
import { NAV, NAV_PATH, type NavItem } from "../portal/nav";
import { PATHS, ownChecklistPath } from "../routes";
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

  // Welche Einträge es gibt und in welcher Reihenfolge, steht in src/portal/nav.ts. Checklisten aus
  // der Datenbank, die nicht auf einer bestehenden Seite erscheinen, bekommen dazwischen ihren eigenen
  // Eintrag (src/portal/checklistNav.ts).
  const visible = (item: NavItem) => !item.showIf || portal[item.showIf];
  const groups = NAV.map(({ group, items }) => {
    const shown = items.filter(visible);
    const entries = withChecklists(group, shown.map((item) => item.id), portal.checklists).map((entry) =>
      entry.type === "page" ? shown.find((item) => item.id === entry.id)! : entry.list,
    );
    return { group, entries };
  });
  const all = groups.flatMap(({ entries }) => entries);
  const isPage = (entry: NavItem | ChecklistRef): entry is NavItem => "id" in entry;
  const mobileMain = all.filter(isPage).filter((item) => item.mobileMain);
  const mobileMore = all.filter((entry) => !isPage(entry) || !entry.mobileMain);
  const pathOf = (entry: NavItem | ChecklistRef) => (isPage(entry) ? NAV_PATH[entry.id] : ownChecklistPath(entry.key));

  const navLink = (entry: NavItem | ChecklistRef) => {
    const locked = isPage(entry) ? !!entry.lock && portal.lockedAreas[entry.lock] : portal.checklists.some((list) => list.key === entry.key && list.locked);
    return (
      <NavLink key={pathOf(entry)} to={pathOf(entry)} end={pathOf(entry) === PATHS.overview} className={({ isActive }) => "nav" + (isActive ? " on" : "")}>
        {/* Seiten tragen ihre Beschriftung in den Texten, Checklisten ihren Titel aus der Datenbank. */}
        <span>{isPage(entry) ? t(`nav.items.${entry.id}`) : entry.title}</span>
        {locked && <LockIcon label={t("nav.locked")} />}
      </NavLink>
    );
  };
  const inMore = mobileMore.some((entry) => location.pathname.startsWith(pathOf(entry)));
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
          {groups.map(({ group, entries }) => (
            <div key={group ?? "top"} style={{ marginBottom: 18 }}>
              {group && <div className="grp">{t(`nav.groups.${group}`)}</div>}
              {entries.map(navLink)}
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
