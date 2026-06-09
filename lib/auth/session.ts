import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "um_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("AUTH_COOKIE_SECRET not set");
  return new TextEncoder().encode(secret);
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

interface SessionPayload {
  auth: true;
  notionToken?: string;
  dbTransactions?: string;
  dbCategories?: string;
  dbAccounts?: string;
  dbSubscriptions?: string;
  dbBudgets?: string;
  dbFxRates?: string;
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ auth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

// Issue a session token that also carries the user's Notion credentials.
export async function createSessionTokenWithCreds(creds: NotionCreds): Promise<string> {
  return new SignJWT({
    auth: true,
    notionToken: creds.token,
    dbTransactions: creds.dbIds.transactions,
    dbCategories: creds.dbIds.categories,
    dbAccounts: creds.dbIds.accounts,
    dbSubscriptions: creds.dbIds.subscriptions,
    dbBudgets: creds.dbIds.budgets,
    dbFxRates: creds.dbIds.fxRates,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

// Build NotionCreds from env vars. Returns null if not configured.
function credsFromEnv(): NotionCreds | null {
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

// Resolve Notion creds from a raw Cookie header string.
// Priority: JWT-embedded creds → env var fallback → null.
export async function getNotionCredsFromCookieString(
  cookieHeader: string
): Promise<NotionCreds | null> {
  const match = cookieHeader.match(/(?:^|;\s*)um_session=([^;]+)/);
  if (!match) return credsFromEnv();
  try {
    const { payload } = await jwtVerify(match[1], getSecret());
    const fromJwt = credsFromPayload(payload as unknown as SessionPayload);
    if (fromJwt) return fromJwt;
  } catch {
    // invalid token — fall through to env
  }
  return credsFromEnv();
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
  const match = cookieHeader.match(/(?:^|;\s*)um_session=([^;]+)/);
  if (match) {
    try {
      const { payload } = await jwtVerify(match[1], getSecret());
      if (credsFromPayload(payload as unknown as SessionPayload)) {
        return { configured: true, via: "jwt" };
      }
    } catch {
      // ignore
    }
  }
  if (credsFromEnv()) return { configured: true, via: "env" };
  return { configured: false, via: null };
}

export { COOKIE_NAME, MAX_AGE };
