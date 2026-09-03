import { renderText } from "@/lib/markdown";

/** Renders volunteer-authored text. Input is escaped before any formatting is applied. */
export function RichText({ text, className = "prose" }: { text: string; className?: string }) {
  if (!text.trim()) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderText(text) }} />;
}
