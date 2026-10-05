// Startet das Portal lokal vollständig: Supabase, die Funktionen und das Frontend.
//   npm run portal           Portal ansehen
//   npm run portal:stripe    zusätzlich "stripe listen", um die Bezahlung im Testmodus durchzuspielen
// Beenden mit Strg+C; die Funktionen, das Frontend und "stripe listen" enden dann. Supabase läuft in
// Docker weiter und wird mit "npm run db:stop" angehalten.

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const withStripe = process.argv.includes("--stripe");
const windows = process.platform === "win32";

const PORTAL = "http://127.0.0.1:5173";
const MAILBOX = "http://127.0.0.1:54324";
// Die beiden Ereignisse, die der Webhook verarbeitet. Ohne --events startet "stripe listen" nicht.
const STRIPE_EVENTS = "checkout.session.completed,checkout.session.async_payment_succeeded";
const WEBHOOK = "http://127.0.0.1:54321/functions/v1/stripe-webhook";

// Unter Windows sind npm, npx und stripe Skripte und brauchen die Shell; dort geht der Befehl als eine
// Zeile hinaus. Alle Angaben stehen fest in dieser Datei, es fließt keine Eingabe hinein.
const shell = (command, args) => (windows ? [[command, ...args].join(" "), [], { shell: true }] : [command, args, {}]);
const check = (command, args) => {
  const [cmd, rest, options] = shell(command, args);
  return spawnSync(cmd, rest, { ...options, stdio: "ignore" }).status === 0;
};

const fail = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

// --- Voraussetzungen ----------------------------------------------------------------------------

if (!existsSync(resolve(root, ".env"))) {
  fail("Die Datei .env fehlt. Bitte .env.example nach .env kopieren und ausfüllen (siehe README.md).");
}
if (!existsSync(resolve(root, "frontend", ".env.local"))) {
  fail("Die Datei frontend/.env.local fehlt. Bitte frontend/.env.example dorthin kopieren und ausfüllen (siehe README.md).");
}
if (!existsSync(resolve(root, "frontend", "node_modules"))) {
  fail('Die Pakete des Frontends fehlen. Bitte einmal "npm --prefix frontend install" ausführen.');
}
if (!check("docker", ["info"])) {
  fail("Docker läuft nicht. Bitte Docker Desktop starten und den Befehl wiederholen.");
}
if (withStripe && !check("stripe", ["--version"])) {
  fail('Die Stripe CLI wurde nicht gefunden. Für "npm run portal:stripe" muss sie installiert und angemeldet sein.');
}

// --- 1. Supabase: läuft es schon, ist der Aufruf sofort fertig -------------------------------------

console.log("Supabase wird gestartet (beim ersten Mal dauert das einige Minuten) ...");
{
  const [cmd, rest, options] = shell("npx", ["supabase", "start"]);
  const started = spawnSync(cmd, rest, { ...options, cwd: root, stdio: ["ignore", "ignore", "inherit"] });
  if (started.status !== 0) fail('Supabase konnte nicht gestartet werden. Einzeln prüfen mit "npm run db:start".');
}

// --- 2. Funktionen, Frontend und bei Bedarf Stripe nebeneinander ------------------------------------

const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // Unter Windows hängen am Prozess weitere (npm, node); taskkill beendet sie mit.
    if (windows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  console.log('\nBeendet. Supabase läuft weiter; anhalten mit "npm run db:stop".');
  process.exit(code);
}

function run(name, command, args) {
  const [cmd, rest, options] = shell(command, args);
  const child = spawn(cmd, rest, { ...options, cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  const label = `[${name}]`.padEnd(13);
  for (const stream of [child.stdout, child.stderr]) {
    let rest = "";
    stream.on("data", (chunk) => {
      const lines = (rest + chunk).split(/\r?\n/);
      rest = lines.pop();
      for (const line of lines) if (line.trim()) console.log(label + line);
    });
  }
  child.on("exit", (code) => {
    if (stopping) return;
    console.error(`\n${label}hat sich beendet (Code ${code}). Alles wird angehalten.`);
    stop(1);
  });
  children.push(child);
}

run("funktionen", "npx", ["supabase", "functions", "serve", "--env-file", ".env"]);
run("frontend", "npm", ["--prefix", "frontend", "run", "dev"]);
if (withStripe) run("stripe", "stripe", ["listen", "--events", STRIPE_EVENTS, "--forward-to", WEBHOOK]);

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

console.log(`
Das Portal startet:
  Portal im Browser   ${PORTAL}
  Testpostfach        ${MAILBOX}
  Testkonten          free@example.com, starter@example.com, plus@example.com
                      (Passwort in supabase/seed.sql unter dev_password)
${withStripe ? `  Stripe              leitet Zahlungen aus dem Testmodus an das Portal weiter.
                      Der Wert whsec_..., den "stripe listen" gleich ausgibt, muss als
                      STRIPE_WEBHOOK_SECRET in .env stehen.\n` : ""}
Beenden mit Strg+C.
`);
