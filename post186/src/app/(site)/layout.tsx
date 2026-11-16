import type { ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_CACHE } from "@/lib/cache";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getSettings } from "@/lib/data";
import { isPreviewDatabase } from "@/lib/db";
import { todayInPostTz } from "@/lib/dates";

/** Header and footer for every public page. Cached, and refreshed when settings are saved. */
async function Chrome({ children }: { children: ReactNode }) {
  "use cache";
  cacheLife(CONTENT_CACHE);
  cacheTag("settings");
  const settings = await getSettings();
  const year = Number(todayInPostTz().slice(0, 4));
  return (
    <>
      <Header settings={settings} preview={isPreviewDatabase()} />
      <main id="main" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer settings={settings} year={year} />
    </>
  );
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <Chrome>{children}</Chrome>;
}
