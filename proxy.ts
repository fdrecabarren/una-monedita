import { NextRequest, NextResponse } from "next/server";
import {
  NOTION_COOKIE,
  LEGACY_COOKIE,
  secretProblem,
  devAuthBypass,
  getCookie,
  readNotionCookie,
  readLegacyCreds,
  createNotionCookie,
  notionCookieOptions,
  notionCookieClearOptions,
} from "@/lib/auth/session";
import { csrfVerdict } from "@/lib/auth/csrf";

// Next 16: este archivo se llama proxy.ts y exporta `proxy` (no middleware).
//
// Acceso sin contraseña: la cookie con las credenciales de Notion es la única
// credencial. Orden (importa):
//   1. secreto de cookies inválido → 503
//   2. CSRF de /api/* (ANTES del bypass y de las rutas públicas, /api/setup incluida)
//   3. bypass de desarrollo (solo localhost)
//   4. rutas públicas: /setup y /api/setup
//   5. atajos de compatibilidad con la versión con contraseña
//   6. cookie válida → pasa
//   7. migración desde la cookie vieja um_session
//   8. sin credenciales → /setup (páginas) o 401 (API)

function unauthorizedApi(): NextResponse {
  return NextResponse.json({ error: "Notion no conectado", code: "notion_disconnected" }, { status: 401 });
}

// Header Cookie con la cookie nueva agregada y la vieja quitada: para que handlers y
// server components vean lo mismo en ESTE pedido (el Set-Cookie recién llega después).
function rewriteCookieHeader(cookieHeader: string, value: string): string {
  const kept = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith(`${LEGACY_COOKIE}=`) && !p.startsWith(`${NOTION_COOKIE}=`));
  return [...kept, `${NOTION_COOKIE}=${value}`].join("; ");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host");
  const isApi = pathname.startsWith("/api/");
  const secure = req.nextUrl.protocol === "https:";

  // 1. Sin un secreto válido no se puede ni emitir ni validar ninguna cookie.
  const problem = secretProblem();
  if (problem) return new NextResponse(problem, { status: 503 });

  // 2. CSRF
  if (isApi) {
    const v = csrfVerdict({
      method: req.method,
      pathname,
      host,
      origin: req.headers.get("origin"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      secFetchMode: req.headers.get("sec-fetch-mode"),
      contentType: req.headers.get("content-type"),
      production: process.env.NODE_ENV === "production",
    });
    if (!v.ok) {
      const error = v.code === "csrf" ? "Pedido bloqueado" : "El contenido debe ser application/json";
      return NextResponse.json({ error, code: v.code }, { status: v.status });
    }
  }

  // 3. Desarrollo local: sin cookie, con las credenciales de .env.local.
  if (devAuthBypass(host)) return NextResponse.next();

  // 4. Públicas (igualdad exacta: nada de startsWith).
  if (pathname === "/setup" || pathname === "/api/setup") return NextResponse.next();

  const cookieHeader = req.headers.get("cookie") ?? "";
  const freshRaw = getCookie(cookieHeader, NOTION_COOKIE);
  const fresh = freshRaw ? await readNotionCookie(freshRaw) : null;
  const legacyRaw = getCookie(cookieHeader, LEGACY_COOKIE);
  const legacy = !freshRaw ? await readLegacyCreds(legacyRaw) : null;

  // 5. Compatibilidad con la versión con contraseña (TODO 2026-11-15: borrar).
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(fresh || legacy ? "/" : "/setup", req.url));
  }
  if (pathname === "/api/auth") {
    if (req.method === "DELETE") {
      // un cliente viejo todavía abierto que toca "Cerrar sesión"
      const res = NextResponse.json({ ok: true });
      res.cookies.set(NOTION_COOKIE, "", notionCookieClearOptions(secure));
      res.cookies.delete(LEGACY_COOKIE);
      return res;
    }
    return NextResponse.json({ error: "Ya no hay contraseña: conectá Notion en /setup" }, { status: 410 });
  }

  // 6. Conectado.
  if (fresh) return NextResponse.next();

  // 7. Migración: quien ya estaba conectado con la cookie vieja sigue conectado.
  if (legacy) {
    const value = await createNotionCookie(legacy, true);
    const headers = new Headers(req.headers);
    headers.set("cookie", rewriteCookieHeader(cookieHeader, value));
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set(NOTION_COOKIE, value, notionCookieOptions(true, secure));
    res.cookies.delete(LEGACY_COOKIE);
    return res;
  }

  // 8. Sin credenciales. Se limpian las cookies que no sirvieron.
  const stale = !!freshRaw || !!legacyRaw;
  const res = isApi
    ? unauthorizedApi()
    : NextResponse.redirect(new URL(`/setup?reason=${stale ? "expired" : "missing"}`, req.url));
  if (freshRaw) res.cookies.set(NOTION_COOKIE, "", notionCookieClearOptions(secure));
  if (legacyRaw) res.cookies.delete(LEGACY_COOKIE);
  return res;
}

export const config = {
  // La exclusión por extensión no debe saltear la API: por eso va un matcher aparte.
  matcher: [
    "/api/:path*",
    "/((?!api/|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|webmanifest)$).*)",
  ],
};
