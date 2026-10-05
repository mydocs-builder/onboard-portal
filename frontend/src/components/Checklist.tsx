import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Checklist, ChecklistItem } from "../checklists/useChecklists";
import { NAV_PATH, type NavId } from "../portal/nav";
import { ExternalLink, safeUrl } from "./ExternalLink";
import { CheckIcon } from "./Icons";
import { useToast } from "./Toast";

export function ChecklistProgress({ list, labelKey = "checklist.done" }: { list: Checklist; labelKey?: string }) {
  const { t } = useTranslation();
  const total = list.items.length;
  const percent = total ? Math.round((list.doneCount / total) * 100) : 0;
  return (
    <div className="prog">
      <div className="bar"><span style={{ width: `${percent}%` }} /></div>
      <span>{t(labelKey, { done: list.doneCount, total })}</span>
    </div>
  );
}

/** Verweis eines Punkts: "portal:<Menüpunkt>" führt in einen Portalbereich, alles andere ist eine Website. */
function ItemLink({ item }: { item: ChecklistItem }) {
  if (!item.link_label || !item.link_target) return null;
  const style = { fontSize: 17, marginTop: 6 };
  if (item.link_target.startsWith("portal:")) {
    const path = NAV_PATH[item.link_target.slice("portal:".length) as NavId];
    return path ? <Link className="linkh" style={style} to={path}>{item.link_label}</Link> : null;
  }
  const url = safeUrl(item.link_target);
  return url ? <div style={style}><ExternalLink href={url}>{item.link_label}</ExternalLink></div> : null;
}

function Item({ item, done, onToggle }: { item: ChecklistItem; done: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const flash = useToast();
  const [exampleOpen, setExampleOpen] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.example ?? "");
      flash(t("checklist.copied"));
    } catch {
      flash(t("checklist.copyFailed"));
    }
  }

  return (
    <div className="doc">
      <button
        className="cbw"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={t(done ? "checklist.markOpen" : "checklist.markDone", { title: item.title })}
      >
        <span className={"cb" + (done ? " on" : "")}>{done && <CheckIcon />}</span>
      </button>
      <div>
        <div className={"dt" + (done ? " done" : "")}>{item.title}</div>
        {item.description && <div className="dd">{item.description}</div>}
        {item.example && (
          <>
            <button className="linkbtn" style={{ marginTop: 6 }} onClick={() => setExampleOpen(!exampleOpen)} aria-expanded={exampleOpen}>
              {t(exampleOpen ? "checklist.hideExample" : "checklist.showExample")}
            </button>
            {exampleOpen && (
              <div className="exbox">
                <div className="extext">{item.example}</div>
                <button className="sb" onClick={copy}>{t("checklist.copy")}</button>
              </div>
            )}
          </>
        )}
        <ItemLink item={item} />
      </div>
    </div>
  );
}

/** Punkte einer Checkliste, nach Abschnitten gegliedert, wenn die Punkte Abschnitte tragen. */
export function ChecklistItems({ list, done, onToggle }: { list: Checklist; done: Set<string>; onToggle: (itemId: string) => void }) {
  const sections: { title: string | null; items: ChecklistItem[] }[] = [];
  for (const item of list.items) {
    const last = sections[sections.length - 1];
    if (last && last.title === item.section) last.items.push(item);
    else sections.push({ title: item.section, items: [item] });
  }
  return (
    <>
      {sections.map((section) => (
        <div key={section.title ?? ""}>
          {section.title && <h2 className="t2">{section.title}</h2>}
          <div className="docs">
            {section.items.map((item) => (
              <Item key={item.id} item={item} done={done.has(item.id)} onToggle={() => onToggle(item.id)} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
