import { NextResponse, type NextRequest } from "next/server";

/**
 * A quick first check for the admin area: with no session cookie at all, go
 * straight to the sign-in page. This is only a convenience — the real check
 * (is this session valid?) happens in requireAdmin() on every admin page and
 * in every admin action.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("p186_admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything under /admin except the sign-in page itself.
  matcher: ["/admin", "/admin/((?!login).*)"],
};
