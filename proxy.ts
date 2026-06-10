import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "um_session";
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/seed"];
// Authenticated users may reach these even without Notion creds configured.
const SETUP_PATHS = ["/setup", "/api/setup", "/api/me"];

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_COOKIE_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

function redirectToLogin(req: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete(COOKIE_NAME);
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(req, pathname);
  }

  let payload: { auth?: boolean; notionToken?: string };
  try {
    const verified = await jwtVerify(token, getSecret());
    payload = verified.payload as { auth?: boolean; notionToken?: string };
  } catch {
    return redirectToLogin(req, pathname);
  }

  const onSetupPath = SETUP_PATHS.some((p) => pathname.startsWith(p));

  // Configured if creds live in the JWT OR the server has env-var creds.
  const hasCreds = !!payload.notionToken || !!process.env.NOTION_TOKEN;

  // Authenticated but unconfigured → force the setup flow (except setup paths).
  if (!hasCreds && !onSetupPath) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  // Configured user trying to reach /setup is allowed (re-configure).
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|webmanifest)$).*)",
  ],
};
