// Acceso sin contraseña: la conexión a Notion (token + IDs de las 6 bases) ES el
// ingreso. Vive en UNA cookie cifrada por dispositivo (JWE dir/A256GCM); el servidor
// no guarda nada, así que una misma instalación puede servir a varias personas, cada
// una con su propio Notion. Sin cookie válida solo se ve /setup.
//
// Las credenciales de entorno (NOTION_*) existen SOLO para desarrollo local en
// localhost (ver devAuthBypass). Nunca son un fallback: en una instalación compartida
// otra persona vería el Notion del dueño.

import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";

// ---- Notion credentials ----
export interface NotionCreds {
  token: string;
  dbIds: {
    transactions: string;
    accounts: string;
    categories: string;
    subscriptions: string;
    budgets: string;
    fxRates: string;
  };
}

// `__Host-`: el navegador exige Secure + Path=/ y sin Domain, así que ningún
// subdominio puede pisar la cookie. En desarrollo (http) va sin prefijo.
export const NOTION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-um_notion" : "um_notion";
// Cookie de la versión con contraseña. Solo se LEE para migrar a quien ya estaba
// conectado. TODO(2026-11-15): borrar junto con readLegacyCreds y la clave "legacy".
export const LEGACY_COOKIE = "um_session";

const AUDIENCE = "um_notion";
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 400; // tope que aceptan los navegadores (Chrome)
const SHORT_TTL = 60 * 60 * 24; // sin "Recordar": 24 h como máximo

// ---- Secreto y claves ----
// Valor de ejemplo de .env.example: usarlo en un deploy dejaría cookies cifradas con
// una clave pública.
const PLACEHOLDER_SECRET = "cambiame_por_32_chars_random_xxxxxxxxxxxxxxxxxxxxxxx";

// null si el secreto sirve; si no, el motivo (el proxy responde 503 con este texto).
export function secretProblem(): string | null {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    return "Falta AUTH_COOKIE_SECRET (mínimo 32 caracteres) en las variables de entorno. Ver DEPLOY.md.";
  }
  if (secret === PLACEHOLDER_SECRET) {
    return "AUTH_COOKIE_SECRET tiene el valor de ejemplo de .env.example: generá uno propio (openssl rand -base64 32). Ver DEPLOY.md.";
  }
  return null;
}

// Una clave por propósito (AES-256 = 32 bytes, SHA-256 del secreto). La cookie
// nueva y la legacy NO comparten clave: una no puede hacerse pasar por la otra.
const keyCache = new Map<string, Promise<Uint8Array>>();
function deriveKey(label: "legacy" | "um_notion:v1"): Promise<Uint8Array> {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) return Promise.reject(new Error("AUTH_COOKIE_SECRET not set"));
  const id = `${label}|${secret}`;
  let key = keyCache.get(id);
  if (!key) {
    // legacy = SHA-256(secreto), igual que la versión con contraseña
    const material = label === "legacy" ? secret : `${label}:${secret}`;
    key = crypto.subtle.digest("SHA-256", new TextEncoder().encode(material)).then((d) => new Uint8Array(d));
    keyCache.set(id, key);
  }
  return key;
}

// ---- Cookie nueva ----
const NotionPayloadSchema = z.object({
  kind: z.literal("notion"),
  v: z.literal(1),
  remember: z.boolean(),
  token: z.string().min(1),
  db: z.object({
    transactions: z.string().min(1),
    accounts: z.string(),
    categories: z.string(),
    subscriptions: z.string(),
    budgets: z.string(),
    fxRates: z.string(),
  }),
});

export async function createNotionCookie(creds: NotionCreds, remember: boolean): Promise<string> {
  return new EncryptJWT({ kind: "notion", v: 1, remember, token: creds.token, db: { ...creds.dbIds } })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${remember ? REMEMBER_MAX_AGE : SHORT_TTL}s`)
    .encrypt(await deriveKey("um_notion:v1"));
}

export async function readNotionCookie(value: string | null): Promise<{ creds: NotionCreds; remember: boolean } | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtDecrypt(value, await deriveKey("um_notion:v1"), { audience: AUDIENCE });
    const p = NotionPayloadSchema.safeParse(payload);
    if (!p.success) return null;
    return {
      remember: p.data.remember,
      creds: { token: p.data.token.trim(), dbIds: { ...p.data.db } },
    };
  } catch {
    return null;
  }
}

// ---- Cookie legacy (um_session): migración de quien ya estaba conectado ----
export async function readLegacyCreds(value: string | null): Promise<NotionCreds | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtDecrypt(value, await deriveKey("legacy"));
    if (payload.auth !== true) return null;
    const str = (k: string) => (typeof payload[k] === "string" ? (payload[k] as string).trim() : "");
    const token = str("notionToken");
    const transactions = str("dbTransactions");
    if (!token || !transactions) return null;
    return {
      token,
      dbIds: {
        transactions,
        accounts: str("dbAccounts"),
        categories: str("dbCategories"),
        subscriptions: str("dbSubscriptions"),
        budgets: str("dbBudgets"),
        fxRates: str("dbFxRates"),
      },
    };
  } catch {
    return null;
  }
}

// Opciones de la cookie nueva. Sin "Recordar" no lleva maxAge: es una cookie de
// sesión del navegador (se borra al cerrarlo) y además vence a las 24 h por dentro.
export function notionCookieOptions(remember: boolean, secure: boolean) {
  return {
    httpOnly: true,
    // en producción el prefijo __Host- exige Secure sí o sí
    secure: secure || process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  };
}

// Para borrarla: con el prefijo __Host- el navegador ignora un Set-Cookie sin
// Secure, así que se borra con los mismos atributos y maxAge 0.
export function notionCookieClearOptions(secure: boolean) {
  return { ...notionCookieOptions(false, secure), maxAge: 0 };
}

// Valor de la cookie `name` en un header Cookie. Si el nombre aparece más de una
// vez devuelve null (se trata como no conectado: no se adivina cuál vale).
export function getCookie(cookieHeader: string, name: string): string | null {
  let found: string | null = null;
  for (const part of cookieHeader.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() !== name) continue;
    if (found !== null) return null;
    found = part.slice(i + 1).trim();
  }
  return found || null;
}

// ---- Desarrollo local ----
// localhost / 127.0.0.1 / [::1], con cualquier puerto.
export function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  const name = h.startsWith("[") ? h.slice(0, h.indexOf("]") + 1) : h.split(":")[0];
  return name === "localhost" || name === "127.0.0.1" || name === "[::1]";
}

// Bypass SOLO para desarrollo local. Triple candado:
//   1. NODE_ENV === "development": solo bajo `next dev`. Vercel compila siempre con
//      "production", así que allí esta rama es código muerto.
//   2. DEV_AUTH_BYPASS === "1": opt-in explícito en .env.local (gitignoreado).
//   3. Host local: corta el acceso desde la red local y el DNS rebinding (un sitio
//      malicioso que apunta su dominio a 127.0.0.1 llega con otro Host).
export function devAuthBypass(host: string | null): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "1" && isLocalHost(host);
}

// Credenciales de las variables de entorno. Solo se usan con devAuthBypass.
function credsFromEnv(): NotionCreds | null {
  // .trim(): una env var cargada con `echo` puede traer un salto de línea al final y
  // eso rompe `parent.database_id` en pages.create.
  const token = process.env.NOTION_TOKEN?.trim();
  const transactions = process.env.NOTION_DB_TRANSACTIONS?.trim();
  if (!token || !transactions) return null;
  return {
    token,
    dbIds: {
      transactions,
      accounts: process.env.NOTION_DB_ACCOUNTS?.trim() ?? "",
      categories: process.env.NOTION_DB_CATEGORIES?.trim() ?? "",
      subscriptions: process.env.NOTION_DB_SUBSCRIPTIONS?.trim() ?? "",
      budgets: process.env.NOTION_DB_BUDGETS?.trim() ?? "",
      fxRates: process.env.NOTION_DB_FX_RATES?.trim() ?? "",
    },
  };
}

// ---- Resolución de credenciales de un pedido ----
export type CredsVia = "cookie" | "legacy" | "dev";

// Orden: cookie nueva → legacy (solo si la nueva NO está presente) → entorno (solo
// con devAuthBypass) → nada. Una cookie nueva presente pero inválida NO cae a legacy.
export async function resolveNotionCreds(
  cookieHeader: string,
  host: string | null
): Promise<{ creds: NotionCreds; via: CredsVia; remember: boolean | null } | null> {
  const fresh = getCookie(cookieHeader, NOTION_COOKIE);
  if (fresh) {
    const c = await readNotionCookie(fresh);
    if (c) return { creds: c.creds, via: "cookie", remember: c.remember };
  } else {
    const legacy = await readLegacyCreds(getCookie(cookieHeader, LEGACY_COOKIE));
    if (legacy) return { creds: legacy, via: "legacy", remember: null };
  }
  if (devAuthBypass(host)) {
    const env = credsFromEnv();
    if (env) return { creds: env, via: "dev", remember: null };
  }
  return null;
}

// Para los route handlers.
export async function getNotionCredsFromRequest(request: Request): Promise<NotionCreds | null> {
  const r = await resolveNotionCreds(request.headers.get("cookie") ?? "", request.headers.get("host"));
  return r?.creds ?? null;
}

// Estado de la conexión de ESTE dispositivo, para /setup y Ajustes.
export async function getConfigStatus(
  cookieHeader: string,
  host: string | null
): Promise<{ connected: boolean; via: CredsVia | null; remember: boolean | null }> {
  const r = await resolveNotionCreds(cookieHeader, host);
  return r ? { connected: true, via: r.via, remember: r.remember } : { connected: false, via: null, remember: null };
}
