import type { ReactNode } from "react";

const LINK_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

function withLinks(text: string, keyPrefix: string): ReactNode[] {
  return text.split(LINK_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    const href = part.includes("://") ? part : `mailto:${part}`;
    return (
      <a key={`${keyPrefix}-${i}`} href={href} rel="noopener nofollow">
        {part}
      </a>
    );
  });
}

/**
 * Turns plain text typed by an officer into tidy paragraphs.
 * Blank lines start a new paragraph, lines starting with "-" become a list,
 * and web or email addresses become links. No HTML is ever accepted.
 */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={`prose-post ${className}`}>
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        if (lines.every((line) => /^[-•*]\s+/.test(line))) {
          return (
            <ul key={b}>
              {lines.map((line, l) => (
                <li key={l}>{withLinks(line.replace(/^[-•*]\s+/, ""), `${b}-${l}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={b}>
            {lines.map((line, l) => (
              <span key={l}>
                {l > 0 && <br />}
                {withLinks(line, `${b}-${l}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
