import { useEffect, useState } from "react";
import { supabase, type Tables } from "../lib/supabase";

type ListTable = "companies" | "jobs" | "agencies" | "job_boards";

/** Lädt die veröffentlichten Einträge einer Liste. Was die Stufe nicht sehen darf, liefert die Datenbank nicht. */
export function useList<T extends ListTable>(table: T, orderBy: string, ascending = true) {
  const [state, setState] = useState<{ status: "loading" | "error" | "ready"; rows: Tables<T>[] }>({ status: "loading", rows: [] });
  useEffect(() => {
    supabase.from(table as ListTable).select("*").eq("status", "published").order(orderBy, { ascending })
      .then(({ data, error }) => setState({ status: error ? "error" : "ready", rows: (data ?? []) as unknown as Tables<T>[] }));
  }, [table, orderBy, ascending]);
  return state;
}
