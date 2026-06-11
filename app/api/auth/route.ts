import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createSessionToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth/session";
import { checkRateLimit, clientIp } from "@/lib/auth/rate-limit";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min

// Constant-time comparison; hashing first normalizes lengths so the length
// of the configured password never leaks through timing.
function passwordMatches(candidate: string, expected: string): boolean {
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!checkRateLimit("auth:" + clientIp(req), MAX_ATTEMPTS, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá 15 minutos." },
      { status: 429 }
    );
  }

  const { password } = await req.json().catch(() => ({ password: "" }));
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword || typeof password !== "string" || !passwordMatches(password, appPassword)) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
