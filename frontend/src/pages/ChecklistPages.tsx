import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChecklists, type Checklist } from "../checklists/useChecklists";
import { ChecklistItems, ChecklistProgress } from "../components/Checklist";
import { ExternalLink } from "../components/ExternalLink";
import { LockHint } from "../components/LockHint";
import { PageStatus } from "../components/PageStatus";
import { IMMIGRATION_CALL_URL } from "../lib/links";
import { PLAN_NAME } from "../lib/plan";
import { usePortal } from "../portal/PortalProvider";

/** Reiter je Checkliste; erscheinen nur, wenn ein Menüpunkt mehr als eine aktive Checkliste hat. */
function ListTabs({ lists, current }: { lists: Checklist[]; current: Checklist }) {
  if (lists.length < 2) return null;
  return (
    <div className="tabs">
      {lists.map((list) => (
        <Link key={list.id} className={"tab" + (list.id === current.id ? " on" : "")} to={`?list=${list.key}`} replace aria-current={list.id === current.id ? "page" : undefined}>
          {list.title}
        </Link>
      ))}
    </div>
  );
}

function useCurrentList(lists: Checklist[]) {
  const [search] = useSearchParams();
  return lists.find((list) => list.key === search.get("list")) ?? lists[0];
}

export function ProfilesPage() {
  const { t, i18n } = useTranslation();
  const { locked } = usePortal();
  const { status, lists, done, toggle } = useChecklists("linkedin");
  const current = useCurrentList(lists);
  const lockedItems = current ? locked.filter((row) => row.kind === "checklist_item" && row.area === current.key) : [];
  const introKey = current ? `profiles.intro.${current.key}` : "";

  return (
    <>
      <div className="eyebrow">{t("nav.items.linkedin")}</div>
      <h1 className="t1">{t("profiles.title")}</h1>
      <p className="lead">{t("profiles.lead")}</p>
      <PageStatus status={status} />
      {current && (
        <>
          <ListTabs lists={lists} current={current} />
          {i18n.exists(introKey) && <div className="sec"><p>{t(introKey)}</p></div>}
          <ChecklistProgress list={current} />
          <ChecklistItems list={current} done={done} onToggle={toggle} />
          {lockedItems.length > 0 && (
            <LockHint title={t("profiles.lockTitle")} style={{ marginTop: 32 }}>
              {t("profiles.lockText", { plan: PLAN_NAME[lockedItems[0].min_plan] })}
            </LockHint>
          )}
        </>
      )}
    </>
  );
}

export function VisaPage() {
  const { t } = useTranslation();
  const { status, lists, done, toggle } = useChecklists("checklist");
  const current = useCurrentList(lists);

  return (
    <>
      <div className="eyebrow">{t("nav.items.checklist")}</div>
      <h1 className="t1">{t("visa.title")}</h1>
      <p className="lead">{t("visa.lead")}</p>
      <PageStatus status={status} />
      {current && (
        <>
          <ListTabs lists={lists} current={current} />
          <ChecklistProgress list={current} labelKey="checklist.ready" />
          <ChecklistItems list={current} done={done} onToggle={toggle} />
          {current.legal_note && <div className="quelle">{current.legal_note}</div>}
        </>
      )}
    </>
  );
}

export function FirstDayPage() {
  const { t } = useTranslation();
  const { status, lists, done, toggle } = useChecklists("arrival");
  const current = useCurrentList(lists);

  return (
    <>
      <div className="eyebrow">{t("nav.groups.found")}</div>
      <h1 className="t1">{t("firstDay.title")}</h1>
      <p className="lead">{t("firstDay.lead")}</p>
      <PageStatus status={status} />
      {current && (
        <>
          <ListTabs lists={lists} current={current} />
          <ChecklistProgress list={current} />
          <ChecklistItems list={current} done={done} onToggle={toggle} />
          {current.legal_note && <div className="quelle">{current.legal_note}</div>}
        </>
      )}
      <div className="hint" style={{ marginTop: 48 }}>
        <p><strong>{t("firstDay.callTitle")}</strong> {t("firstDay.callText")}</p>
        <ExternalLink className="btn2" href={IMMIGRATION_CALL_URL}>{t("firstDay.callButton")}</ExternalLink>
      </div>
    </>
  );
}
