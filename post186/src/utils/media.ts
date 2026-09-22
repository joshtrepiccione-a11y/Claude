import { media } from "@wix/sdk";

/**
 * Resolve an image from a Wix entity into a URL the browser can load.
 * Wix APIs return images as `wix:image://` URIs, full URLs, or bare media IDs.
 */
export function wixImageUrl(image: unknown, width = 1200, height = 800): string {
  const value =
    typeof image === "string"
      ? image
      : (image as { url?: string; id?: string } | null | undefined)?.url ??
        (image as { id?: string } | null | undefined)?.id ??
        "";
  if (!value) return "";
  if (value.startsWith("wix:image://")) {
    try {
      return media.getScaledToFillImageUrl(value, width, height, {});
    } catch (error) {
      console.error("Could not resolve Wix image", error);
      return "";
    }
  }
  if (/^https?:\/\//.test(value)) return value;
  return `https://static.wixstatic.com/media/${value}`;
}
