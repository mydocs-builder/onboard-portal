import ReactMarkdown from "react-markdown";
import { ExternalLink, safeUrl } from "./ExternalLink";

/**
 * Gibt Markdown aus der Datenbank sicher aus: react-markdown erzeugt nur React-Elemente und
 * übernimmt kein HTML aus dem Text. Links öffnen im neuen Tab, Zitate erscheinen als Hinweis.
 */
export function Markdown({ children, className = "read" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children: label }) => {
            const url = safeUrl(href);
            return url ? <ExternalLink href={url}>{label}</ExternalLink> : <>{label}</>;
          },
          blockquote: ({ children: content }) => <div className="infobox">{content}</div>,
          h1: ({ children: content }) => <h2>{content}</h2>,
          // Ein Absatz, der nur aus kursivem Text besteht, ist die Fundstellenzeile.
          p: ({ node, children: content }) => {
            const only = node?.children.length === 1 ? node.children[0] : null;
            const isSource = only?.type === "element" && only.tagName === "em";
            return isSource ? <div className="quelle">{content}</div> : <p>{content}</p>;
          },
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
