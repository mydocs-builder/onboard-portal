import { describe, expect, it } from "vitest";
import { markImportant } from "./markdownNotes";

type Node = { type: string; tagName?: string; value?: string; properties?: { className?: string[] }; children?: Node[] };

const text = (value: string): Node => ({ type: "text", value });
const el = (tagName: string, ...children: Node[]): Node => ({ type: "element", tagName, properties: {}, children });
const quote = (...paragraphs: Node[]) => el("blockquote", text("\n"), ...paragraphs, text("\n"));
const root = (...children: Node[]): Node => ({ type: "root", children });
const isImportant = (node: Node) => node.properties?.className?.includes("important") ?? false;
const plain = (node: Node): string => (node.value ?? "") + (node.children ?? []).map(plain).join("");

describe("markImportant", () => {
  it("leaves an ordinary quote, such as a tip, as a note with a line", () => {
    const tip = quote(el("p", el("strong", text("Tip:")), text(" Say so next to the qualification.")));
    markImportant(root(tip) as never);
    expect(isImportant(tip)).toBe(false);
    expect(plain(tip)).toContain("Tip: Say so next to the qualification.");
  });

  it("turns a quote that starts with the marker into the filled box and hides the marker", () => {
    const note = quote(el("p", text("[!IMPORTANT]\n"), el("strong", text("Important for your visa.")), text(" Ask first.")));
    markImportant(root(note) as never);
    expect(isImportant(note)).toBe(true);
    expect(plain(note)).not.toContain("[!IMPORTANT]");
    expect(plain(note).trim()).toBe("Important for your visa. Ask first.");
  });

  it("keeps all paragraphs of the quote in the one box", () => {
    const note = quote(el("p", text("[!IMPORTANT]\nFirst paragraph.")), el("p", text("Second paragraph.")));
    markImportant(root(note) as never);
    expect(isImportant(note)).toBe(true);
    expect(note.children!.filter((child) => child.tagName === "p")).toHaveLength(2);
  });

  it("drops the paragraph when the marker stood alone in it", () => {
    const note = quote(el("p", text("[!IMPORTANT]")), el("p", text("The notice.")));
    markImportant(root(note) as never);
    expect(note.children!.filter((child) => child.tagName === "p")).toHaveLength(1);
    expect(plain(note).trim()).toBe("The notice.");
  });

  it("allows the filled box only once per text; later marked quotes stay notes, without the marker", () => {
    const first = quote(el("p", text("[!IMPORTANT] One.")));
    const second = quote(el("p", text("[!IMPORTANT] Two.")));
    markImportant(root(first, el("p", text("Between.")), second) as never);
    expect(isImportant(first)).toBe(true);
    expect(isImportant(second)).toBe(false);
    expect(plain(second).trim()).toBe("Two.");
  });

  it("ignores the marker elsewhere in the text", () => {
    const paragraph = el("p", text("[!IMPORTANT] not a quote"));
    const note = quote(el("p", text("Read this. [!IMPORTANT]")));
    markImportant(root(paragraph, note) as never);
    expect(isImportant(note)).toBe(false);
    expect(plain(paragraph)).toContain("[!IMPORTANT]");
  });
});
