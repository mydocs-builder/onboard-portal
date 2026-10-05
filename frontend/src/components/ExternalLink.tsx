import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** Externer Link: neuer Tab, kein Zugriff der Zielseite auf das Portal, Pfeil und Hinweis für Screenreader. */
export function ExternalLink({ href, children, className = "extlink", arrow = true }: {
  href: string; children: ReactNode; className?: string; arrow?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <a className={className || undefined} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      {arrow && <span aria-hidden="true">{" ↗"}</span>}
      <span className="sr-only"> ({t("common.newTab")})</span>
    </a>
  );
}

/** Nur http- und https-Adressen werden als Link ausgegeben; alles andere bleibt Text. */
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** https://www.beispiel.de/karriere → beispiel.de/karriere */
export function displayUrl(value: string): string {
  return value.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}
