// Vorschlag bei typischen Tippfehlern in verbreiteten E-Mail-Domains ("Did you mean ...?").
// Nur ein Hinweis, keine Prüfung: Die Registrierung nimmt jede gültige Adresse an.

// Verbreitete Anbieter mit ihren Endungen. Was hier steht, gilt als richtig geschrieben.
const PROVIDERS: Record<string, string[]> = {
  gmail: ["com"],
  googlemail: ["com"],
  hotmail: ["com", "de", "co.uk", "fr", "it", "es"],
  outlook: ["com", "de", "fr", "it", "es"],
  live: ["com", "de", "co.uk", "fr"],
  yahoo: ["com", "de", "co.uk", "fr", "co.in", "com.br", "es", "it"],
  icloud: ["com"],
  aol: ["com"],
  gmx: ["de", "net", "at", "ch", "com"],
  web: ["de"],
  "t-online": ["de"],
  proton: ["me"],
  protonmail: ["com"],
  mail: ["com"],
  email: ["com"],
};

// Namen kürzer als das werden nicht auf Tippfehler geprüft: Bei drei oder vier Buchstaben
// (web, gmx, aol, live, mail) läge ein fremder, richtiger Name zu oft nur einen Buchstaben daneben.
const MIN_NAME_LENGTH = 5;

/** Abstand zweier Wörter: Einfügen, Löschen, Ersetzen und Vertauschen benachbarter Zeichen zählen je 1. */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/**
 * Liefert die vermutlich gemeinte Adresse oder null. Zwei Fälle:
 *  - Anbieter falsch geschrieben, Endung bekannt:  amina@gmial.com → amina@gmail.com
 *  - Anbieter richtig, Endung falsch geschrieben:  amina@gmail.con → amina@gmail.com
 */
export function suggestEmail(input: string): string | null {
  const email = input.trim();
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  const dot = domain.indexOf(".");
  if (dot < 1 || dot === domain.length - 1) return null;
  const name = domain.slice(0, dot);
  const ending = domain.slice(dot + 1);

  const known = PROVIDERS[name];
  if (known) {
    if (known.includes(ending)) return null;
    const fixed = known.find((candidate) => editDistance(ending, candidate) === 1);
    return fixed ? `${local}@${name}.${fixed}` : null;
  }

  for (const [provider, endings] of Object.entries(PROVIDERS)) {
    if (provider.length < MIN_NAME_LENGTH || !endings.includes(ending)) continue;
    if (editDistance(name, provider) === 1) return `${local}@${provider}.${ending}`;
  }
  return null;
}
