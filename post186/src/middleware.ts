import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Two jobs:
 *  1. Set a content security policy with a fresh nonce on every response. Next.js reads the
 *     nonce out of this header and stamps it onto the scripts it injects.
 *  2. Guard /admin. Every admin page and server action also calls requireAdmin(), so this is
 *     a first line of defense rather than the only one.
 */
function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    // Development needs eval for fast refresh; production does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are used for a few one-off layout tweaks.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { pathname } = req.nextUrl;
  const needsAuth = pathname.startsWith("/admin") && pathname !== "/admin/login";
  if (needsAuth) {
    const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.headers.set("Content-Security-Policy", csp);
      return redirectResponse;
    }
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Everything except Next's static assets and the favicon, which need no policy.
    {
      source: "/((?!_next/static|_next/image|favicon.ico|brand/|images/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
