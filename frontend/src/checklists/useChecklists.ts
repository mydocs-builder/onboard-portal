import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../components/Toast";
import { supabase, type Tables } from "../lib/supabase";

export type ChecklistItem = Tables<"checklist_items">;
export type Checklist = Tables<"checklists"> & {
  /** Aktive Punkte, die die Stufe sehen darf, in Reihenfolge. Nur sie zählen für den Fortschritt. */
  items: ChecklistItem[];
  doneCount: number;
};

type State = { status: "loading" | "error" | "ready"; lists: Checklist[]; done: Set<string> };

/**
 * Lädt aktive Checklisten samt eigenem Fortschritt: alle eines Bereichs (area), oder eine einzelne
 * über ihren Schlüssel (key), wenn sie einen eigenen Menüeintrag hat.
 */
export function useChecklists(value: string, by: "area" | "key" = "area") {
  const { t } = useTranslation();
  const flash = useToast();
  const [state, setState] = useState<State>({ status: "loading", lists: [], done: new Set() });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lists = await supabase.from("checklists").select("*").eq(by, value).eq("active", true).order("sort");
      if (lists.error) return !cancelled && setState((s) => ({ ...s, status: "error" }));
      const ids = lists.data.map((list) => list.id);
      const [items, progress] = await Promise.all([
        supabase.from("checklist_items").select("*").in("checklist_id", ids).eq("active", true).order("sort"),
        supabase.from("checklist_progress").select("item_id"),
      ]);
      if (cancelled) return;
      if (items.error || progress.error) return setState((s) => ({ ...s, status: "error" }));
      const done = new Set(progress.data.map((row) => row.item_id));
      setState({
        status: "ready",
        done,
        lists: lists.data.map((list) => ({ ...list, items: items.data.filter((item) => item.checklist_id === list.id), doneCount: 0 })),
      });
    })();
    return () => { cancelled = true; };
  }, [value, by]);

  const toggle = useCallback(async (itemId: string) => {
    let wasDone = false;
    const flip = (s: State): State => {
      const done = new Set(s.done);
      if (done.has(itemId)) done.delete(itemId); else done.add(itemId);
      return { ...s, done };
    };
    setState((s) => {
      wasDone = s.done.has(itemId);
      return flip(s);
    });
    // Ein Eintrag je abgehaktem Punkt; Entfernen des Hakens löscht ihn.
    const { error } = wasDone
      ? await supabase.from("checklist_progress").delete().eq("item_id", itemId)
      : await supabase.from("checklist_progress").insert({ item_id: itemId });
    if (error && error.code !== "23505") {
      setState(flip);
      flash(t("common.saveError"));
    }
  }, [flash, t]);

  const lists = state.lists.map((list) => ({ ...list, doneCount: list.items.filter((item) => state.done.has(item.id)).length }));
  return { status: state.status, lists, done: state.done, toggle };
}
