// Mailversand per SMTP (rapidmail; lokal Mailpit).
// Secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SENDER.
// Mails sind reiner Text: Nutzereingaben wie Firmennamen werden nie als HTML ausgegeben.

import nodemailer from "npm:nodemailer@6";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

const host = Deno.env.get("SMTP_HOST");
const port = Number(Deno.env.get("SMTP_PORT") ?? "587");
const user = Deno.env.get("SMTP_USER");
const sender = Deno.env.get("SMTP_SENDER");

export const mailConfigured = Boolean(host && sender);

const transport = mailConfigured
  ? nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    ...(user ? { auth: { user, pass: Deno.env.get("SMTP_PASS") ?? "" } } : {}),
  })
  : null;

export async function sendMail(mail: Mail): Promise<void> {
  if (!transport) throw new Error("SMTP is not configured");
  await transport.sendMail({ from: sender, to: mail.to, subject: mail.subject, text: mail.text });
}
