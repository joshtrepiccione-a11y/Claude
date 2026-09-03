import { describe, expect, it } from "vitest";
import { plainText, renderText } from "@/lib/markdown";

describe("renderText", () => {
  it("escapes HTML so authored text cannot inject markup", () => {
    expect(renderText("<script>alert(1)</script>")).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
  it("renders paragraphs, headings, lists, emphasis, and safe links", () => {
    const html = renderText("## Title\n\nSome **bold** and *italic* text with a [link](https://example.org).\n\n- one\n- two");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain('<a href="https://example.org" rel="noopener">link</a>');
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
  });
  it("drops javascript: links", () => {
    const html = renderText("[x](javascript:alert(1))");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("javascript:");
  });
  it("keeps links with several query parameters intact", () => {
    const html = renderText("[Register](https://example.org/signup?a=1&b=2)");
    expect(html).toContain('href="https://example.org/signup?a=1&amp;b=2"');
    expect(html).not.toContain("&amp;amp;");
  });
  it("allows mailto and tel links without a noopener attribute", () => {
    expect(renderText("[us](mailto:post@example.org)")).toContain('<a href="mailto:post@example.org">us</a>');
  });
  it("produces plain-text previews", () => {
    expect(plainText("## Hello **world** [link](/x)", 50)).toBe("Hello world link");
  });
});
