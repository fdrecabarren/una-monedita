import { EncryptJWT, jwtDecrypt } from "jose";

const COOKIE_NAME = "um_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Session cookie is an encrypted JWT (JWE dir/A256GCM): the payload — which may
// carry the Notion token — is confidential, not just signed. Key = SHA-256 of
// AUTH_COOKIE_SECRET (32 bytes), derived via WebCrypto so it works on edge and Node.
let cachedKey: Uint8Array | null = null;
async function getKey(): Promise<Uint8Array> {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("AUTH_COOKIE_SECRET not set");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  cachedKey = new Uint8Array(digest);
  return cachedKey;
}

// ---- Notion credentials carried in the session ----
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

export interface SessionPayload {
  auth: true;
  notionToken?: string;
  dbTransactions?: string;
  dbCategories?: string;
  dbAccounts?: string;
  dbSubscriptions?: string;
  dbBudgets?: string;
  dbFxRates?: string;
}

async function encryptSession(payload: SessionPayload): Promise<string> {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .encrypt(await getKey());
}

// Decrypt + validate the session token. Returns null if missing/invalid/expired.
export async function decryptSession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, await getKey());
    if (payload.auth !== true) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSessionToken(): Promise<string> {
  return encryptSession({ auth: true });
}

// Issue a session token that also carries the user's Notion credentials.
export async function createSessionTokenWithCreds(creds: NotionCreds): Promise<string> {
  return encryptSession({
    auth: true,
    notionToken: creds.token,
    dbTransactions: creds.dbIds.transactions,
    dbCategories: creds.dbIds.categories,
    dbAccounts: creds.dbIds.accounts,
    dbSubscriptions: creds.dbIds.subscriptions,
    dbBudgets: creds.dbIds.budgets,
    dbFxRates: creds.dbIds.fxRates,
  });
}

export async function verifySessionToken(token: string): Promise<boolean> {
  return (await decryptSession(token)) !== null;
}

// Bypass de auth SOLO para desarrollo local. Doble candado:
//   1. NODE_ENV === "development"  → solo bajo `next dev`. Vercel compila
//      siempre con NODE_ENV="production", así que allí esta rama es
//      código muerto que nunca se puede activar.
//   2. DEV_AUTH_BYPASS === "1"     → opt-in explícito en .env.local, que está
//      gitignoreado y nunca sale de esta máquina.
// Si alguna vez esto devuelve true en un deploy, es un incidente: significa que
// alguien puso NODE_ENV=development en producción.
export function devAuthBypass(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "1";
}

// Build NotionCreds from env vars. Returns null if not configured.
// Exported as getCredsFromEnv() for callers with no session cookie to read
// (e.g. the Vercel cron route, authenticated by CRON_SECRET instead).
export function credsFromEnv(): NotionCreds | null {
  const token = process.env.NOTION_TOKEN;
  const transactions = process.env.NOTION_DB_TRANSACTIONS;
  if (!token || !transactions) return null;
  return {
    token,
    dbIds: {
      transactions,
      accounts: process.env.NOTION_DB_ACCOUNTS ?? "",
      categories: process.env.NOTION_DB_CATEGORIES ?? "",
      subscriptions: process.env.NOTION_DB_SUBSCRIPTIONS ?? "",
      budgets: process.env.NOTION_DB_BUDGETS ?? "",
      fxRates: process.env.NOTION_DB_FX_RATES ?? "",
    },
  };
}

function credsFromPayload(payload: SessionPayload): NotionCreds | null {
  if (!payload.notionToken || !payload.dbTransactions) return null;
  return {
    token: payload.notionToken,
    dbIds: {
      transactions: payload.dbTransactions,
      accounts: payload.dbAccounts ?? "",
      categories: payload.dbCategories ?? "",
      subscriptions: payload.dbSubscriptions ?? "",
      budgets: payload.dbBudgets ?? "",
      fxRates: payload.dbFxRates ?? "",
    },
  };
}

function sessionTokenFromCookieString(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)um_session=([^;]+)/);
  return match ? match[1] : null;
}

// Resolve Notion creds from a raw Cookie header string.
// REQUIRES a valid session — no session, no creds (env vars are not a bypass).
// With a valid session: JWT-embedded creds win, env vars are the fallback.
export async function getNotionCredsFromCookieString(
  cookieHeader: string
): Promise<NotionCreds | null> {
  const session = await decryptSession(sessionTokenFromCookieString(cookieHeader));
  if (!session) return devAuthBypass() ? credsFromEnv() : null;
  return credsFromPayload(session) ?? credsFromEnv();
}

// Resolve Notion creds from a standard web Request (API route handlers).
export async function getNotionCredsFromRequest(
  request: Request
): Promise<NotionCreds | null> {
  return getNotionCredsFromCookieString(request.headers.get("cookie") ?? "");
}

// Report how the current request is configured, for the Ajustes UI.
export async function getConfigStatus(
  cookieHeader: string
): Promise<{ configured: boolean; via: "jwt" | "env" | null }> {
  const session = await decryptSession(sessionTokenFromCookieString(cookieHeader));
  if (!session) {
    return devAuthBypass() && credsFromEnv()
      ? { configured: true, via: "env" }
      : { configured: false, via: null };
  }
  if (credsFromPayload(session)) return { configured: true, via: "jwt" };
  if (credsFromEnv()) return { configured: true, via: "env" };
  return { configured: false, via: null };
}

export { COOKIE_NAME, MAX_AGE };
