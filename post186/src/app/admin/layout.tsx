import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Post 186 Admin" },
  robots: { index: false, follow: false },
};

// The admin area always reads live data behind a sign-in, so it is exempt from
// the "instant navigation" checks that keep the public pages static and fast.
export const instant = false;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-cloud">{children}</div>;
}
