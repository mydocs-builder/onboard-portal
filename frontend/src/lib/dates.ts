// Datumsangaben sind ISO-Tage (YYYY-MM-DD). "Heute" liefert die Datenbank (portal_today, deutsche Zeit).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const utc = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

/** 2026-10-07 → "7 Oct 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

/** 2026-10-07 → "7 Oct" */
export function formatShort(iso: string): string {
  return formatDate(iso).split(" ").slice(0, 2).join(" ");
}

export function addDays(iso: string, days: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Tage von from bis to; positiv, wenn to später liegt. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / 86400000);
}
