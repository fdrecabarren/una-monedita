import { NextRequest, NextResponse } from "next/server";
import { decryptSession, devAuthBypass, COOKIE_NAME } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth"];
// Authenticated users may reach these even without Notion creds configured.
const SETUP_PATHS = ["/setup", "/api/setup", "/api/me"];

// Las llamadas fetch a /api/* con sesión vencida reciben 401 JSON: un redirect
// a /login hace que el fetch reciba HTML con 200 y el cliente no pueda saber
// que la sesión venció (solo veía "No se pudo guardar").
function apiUnauthorized(error: string, clearCookie: boolean): NextResponse {
  const res = NextResponse.json({ error }, { status: 401 });
  if (clearCookie) res.cookies.delete(COOKIE_NAME);
  return res;
}

function redirectToLogin(req: NextRequest, pathname: string): NextResponse {
  if (pathname.startsWith("/api/")) return apiUnauthorized("Sesión vencida", true);
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete(COOKIE_NAME);
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass de desarrollo local (ver devAuthBypass): sin login y sin cookie.
  // Imposible de activar en el deploy — allí NODE_ENV siempre es "production".
  if (devAuthBypass()) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Fail closed: without the secret we cannot validate any session.
  if (!process.env.AUTH_COOKIE_SECRET) {
    return new NextResponse("Server misconfigured", { status: 503 });
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await decryptSession(token);
  if (!session) {
    return redirectToLogin(req, pathname);
  }

  const onSetupPath = SETUP_PATHS.some((p) => pathname.startsWith(p));

  // Configured if creds live in the session OR the server has env-var creds.
  const hasCreds = !!session.notionToken || !!process.env.NOTION_TOKEN;

  // Authenticated but unconfigured → force the setup flow (except setup paths).
  if (!hasCreds && !onSetupPath) {
    if (pathname.startsWith("/api/")) return apiUnauthorized("Notion no configurado", false);
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
