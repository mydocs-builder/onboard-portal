import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../components/Toast";
import { supabase, type Enums } from "../lib/supabase";
import { usePortal } from "../portal/PortalProvider";

type Kind = Enums<"marketing_kind">;
type ConsentText = { version: string; body: string };

/** Fehlercode aus der Antwort einer Edge Function, falls sie einen nennt. */
async function errorCode(failure: unknown): Promise<string | null> {
  const context = (failure as { context?: Response } | null)?.context;
  return context ? ((await context.json().catch(() => null))?.error ?? null) : null;
}

/** Verschickt die Bestätigungsmail zum Newsletter. Liefert den Fehlercode oder null. */
export async function sendNewsletterConfirmation(resend: boolean): Promise<string | null> {
  const { error } = await supabase.functions.invoke("newsletter", { body: { action: "send", resend } });
  return error ? ((await errorCode(error)) ?? "failed") : null;
}

function Switch({ title, text, on, busy, onToggle, children }: {
  title: string; text: string; on: boolean; busy: boolean; onToggle: () => void; children?: ReactNode;
}) {
  return (
    <div className="doc" style={{ gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
      <div>
        <div className="dt" style={{ fontSize: "1.15rem" }}>{title}</div>
        <div className="dd" style={{ fontSize: 16 }}>{text}</div>
        {children}
      </div>
      <button className={"sw" + (on ? " on" : "")} role="switch" aria-checked={on} aria-label={title} disabled={busy} onClick={onToggle}>
        <span className="knob" />
      </button>
    </div>
  );
}

/**
 * Abschnitt "Emails from us": Erinnerungen, Newsletter und Talentpool. Jeder Schalter speichert
 * sofort. Newsletter und Talentpool laufen über Funktionen der Datenbank, die jede Einwilligung und
 * jeden Widerruf mit der Fassung des Wortlauts festhalten; der angezeigte Wortlaut kommt deshalb
 * aus der Datenbank. Ohne aktive Fassung lässt sich nichts einschalten, nur noch ausschalten.
 */
export function EmailPreferences() {
  const { t } = useTranslation();
  const flash = useToast();
  const portal = usePortal();
  const { profile } = portal;
  const [texts, setTexts] = useState<Partial<Record<Kind, ConsentText>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("marketing_consent_texts").select("kind, version, body").eq("active", true).eq("language", "en")
      .then(({ data }) => setTexts(Object.fromEntries((data ?? []).map((row) => [row.kind, { version: row.version, body: row.body }]))));
  }, []);

  async function run(key: string, action: () => Promise<string | null>) {
    setBusy(key);
    const message = await action();
    await portal.refresh();
    setBusy(null);
    if (message) flash(message);
  }

  const toggleReminders = () => run("reminders", async () => {
    const { error } = await supabase.from("profiles").update({ reminders_enabled: !profile.reminders_enabled }).eq("user_id", portal.userId);
    return error ? t("common.saveError") : null;
  });

  const toggleNewsletter = () => run("newsletter", async () => {
    if (profile.newsletter_status !== "none") {
      // Abmelden gilt sofort, ohne Bestätigung.
      const { error } = await supabase.rpc("set_newsletter", { p_on: false });
      return error ? t("common.saveError") : t("emails.unsubscribed");
    }
    const { error } = await supabase.rpc("set_newsletter", { p_on: true, p_version: texts?.newsletter?.version });
    if (error) return t("common.saveError");
    const failure = await sendNewsletterConfirmation(false);
    return failure ? t("emails.mailFailed") : t("emails.confirmationSent");
  });

  const resend = () => run("resend", async () => {
    const failure = await sendNewsletterConfirmation(true);
    if (failure === "too_soon") return t("emails.tooSoon");
    if (failure === "send_limit_reached") return t("emails.sendLimit");
    return failure ? t("emails.mailFailed") : t("emails.confirmationResent");
  });

  const toggleTalent = () => run("talent", async () => {
    const { error } = await supabase.rpc("set_talent_pool", { p_on: !profile.talent_pool, p_version: texts?.talent_pool?.version });
    return error ? t("common.saveError") : null;
  });

  const newsletterOn = profile.newsletter_status !== "none";
  return (
    <section>
      <h2 className="t2">{t("emails.title")}</h2>
      <div className="docs" style={{ maxWidth: 760 }}>
        <Switch title={t("emails.reminders")} text={t("emails.remindersText")} on={profile.reminders_enabled} busy={busy === "reminders"} onToggle={toggleReminders} />
        {(newsletterOn || texts?.newsletter) && (
          <Switch title={t("emails.newsletter")} text={texts?.newsletter?.body ?? t("emails.newsletterText")} on={newsletterOn} busy={busy === "newsletter"} onToggle={toggleNewsletter}>
            {profile.newsletter_status === "pending" && (
              <div className="meta" style={{ marginTop: 6 }} role="status">
                {t("emails.waiting")}{" "}
                <button className="linkbtn" style={{ minHeight: 0, fontSize: 14 }} onClick={resend} disabled={busy === "resend"}>{t("emails.sendAgain")}</button>
              </div>
            )}
          </Switch>
        )}
        {(profile.talent_pool || texts?.talent_pool) && (
          <Switch title={t("emails.talent")} text={texts?.talent_pool?.body ?? t("emails.talentText")} on={profile.talent_pool} busy={busy === "talent"} onToggle={toggleTalent}>
            <div className="meta" style={{ marginTop: 6 }}>{t("emails.talentNote")}</div>
          </Switch>
        )}
      </div>
    </section>
  );
}
