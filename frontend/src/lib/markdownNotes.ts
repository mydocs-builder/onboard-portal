// Hinweise in Leitfäden (Markdown aus der Datenbank). Ein Zitat ("> ...") ist ein Hinweis mit Linie
// links. Der gefüllte Kasten ist nach dem Styleguide wichtigen Hinweisen vorbehalten, höchstens
// einmal pro Seite: Er entsteht nur, wenn das Zitat mit der Zeile "[!IMPORTANT]" beginnt, und nur
// beim ersten solchen Zitat eines Textes. Jedes weitere bleibt ein Hinweis mit Linie.
//
//   > **Tip:** ...                 → Hinweis mit Linie links
//
//   > [!IMPORTANT]
//   > **Important for your visa.** → gefüllter Kasten (einmal pro Text)

export const IMPORTANT_MARKER = "[!IMPORTANT]";
export const IMPORTANT_CLASS = "important";

// Der Ausschnitt des Baums, den react-markdown übergibt (hast), soweit er hier gebraucht wird.
type TextNode = { type: "text"; value: string };
type ElementNode = { type: "element"; tagName: string; properties?: Record<string, unknown>; children: TreeNode[] };
type TreeNode = TextNode | ElementNode | { type: string; children?: TreeNode[] };

const isElement = (node: TreeNode): node is ElementNode => node.type === "element";
const isText = (node: TreeNode): node is TextNode => node.type === "text";

/** Entfernt die Markierung am Anfang eines Zitats und meldet, ob sie da war. */
function takeMarker(quote: ElementNode): boolean {
  const paragraph = quote.children.find((child) => isElement(child) && child.tagName === "p");
  if (!paragraph || !isElement(paragraph)) return false;
  const first = paragraph.children[0];
  if (!first || !isText(first) || !first.value.trimStart().startsWith(IMPORTANT_MARKER)) return false;

  first.value = first.value.trimStart().slice(IMPORTANT_MARKER.length).replace(/^\s+/, "");
  if (first.value === "") paragraph.children.shift();
  // Stand die Markierung allein in ihrem Absatz, entfällt der leere Absatz.
  if (paragraph.children.length === 0) quote.children.splice(quote.children.indexOf(paragraph), 1);
  return true;
}

/** Kennzeichnet das erste als wichtig markierte Zitat eines Textes; die Markierung selbst wird nie angezeigt. */
export function markImportant(tree: TreeNode): void {
  let used = false;
  const walk = (node: TreeNode) => {
    if (isElement(node) && node.tagName === "blockquote" && takeMarker(node) && !used) {
      used = true;
      node.properties = { ...node.properties, className: [IMPORTANT_CLASS] };
    }
    if ("children" in node && node.children) node.children.forEach(walk);
  };
  walk(tree);
}
