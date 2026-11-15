import { Star } from "@/components/icons";
import { media } from "@/lib/media";
import type { SiteSettings } from "@/lib/settings";

/**
 * The post's name mark.
 *
 * If the official American Legion brandmark has been added to
 * /public/brand (see README → "Official brandmark"), it is shown next to the
 * post name. Until then a plain text lockup is used, so the site never
 * displays a redrawn or altered version of the emblem.
 */
export function Lockup({
  settings,
  tone,
  size = "md",
}: {
  settings: SiteSettings;
  tone: "dark" | "light";
  size?: "md" | "lg";
}) {
  const onDark = tone === "dark";
  const official = onDark ? media.brand.onDark : media.brand.onLight;
  const place = `${settings.city}, ${settings.stateName}`;
  const big = size === "lg";

  if (official) {
    return (
      <span className="flex items-center gap-3 sm:gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- official artwork, shown exactly as supplied */}
        <img
          src={official}
          alt={settings.orgName}
          className={big ? "h-14 w-auto sm:h-16" : "h-10 w-auto sm:h-12"}
        />
        <span
          aria-hidden="true"
          className={`w-px self-stretch ${onDark ? "bg-white/40" : "bg-line"}`}
        />
        <span className="flex flex-col leading-none">
          <span
            className={`caps ${big ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"} ${
              onDark ? "text-white" : "text-navy"
            }`}
          >
            Post {settings.postNumber}
          </span>
          <span
            className={`mt-1 text-[0.8125rem] font-semibold ${onDark ? "text-white/85" : "text-body"}`}
          >
            {place}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex flex-none flex-col items-center justify-center rounded-md border-2 ${
          big ? "size-16" : "size-12 sm:size-14"
        } ${onDark ? "border-white text-white" : "border-navy text-navy"}`}
      >
        <Star size={big ? 15 : 12} className="text-flag" />
        <span className={`caps leading-none ${big ? "text-2xl" : "text-lg sm:text-xl"}`}>
          {settings.postNumber}
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`caps tracking-[0.14em] max-[359px]:tracking-[0.04em] ${big ? "text-sm" : "text-[0.6875rem] sm:text-xs"} ${
            onDark ? "text-white/85" : "text-azure"
          }`}
        >
          {settings.orgName}
        </span>
        <span
          className={`caps mt-1 ${big ? "text-2xl sm:text-3xl" : "text-lg max-[359px]:text-base sm:text-[1.375rem]"} ${
            onDark ? "text-white" : "text-navy"
          }`}
        >
          {settings.postName}
        </span>
        {big && <span className="mt-1.5 text-sm font-semibold text-body">{place}</span>}
      </span>
    </span>
  );
}
