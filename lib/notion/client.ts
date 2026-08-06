import { Client } from "@notionhq/client";

let envClient: Client | null = null;

// When a token is provided (per-user JWT creds) build a fresh client — caching
// across users would leak credentials. Without a token, cache the env-var client.
export function getNotionClient(token?: string): Client {
  if (token) {
    return new Client({ auth: token });
  }
  if (!envClient) {
    const envToken = process.env.NOTION_TOKEN;
    if (!envToken) throw new Error("NOTION_TOKEN no configurado en .env.local");
    envClient = new Client({ auth: envToken });
  }
  return envClient;
}

// Database IDs — used as parent when creating pages AND for querying
export const DB_IDS = {
  transactions: process.env.NOTION_DB_TRANSACTIONS!,
  accounts: process.env.NOTION_DB_ACCOUNTS!,
  categories: process.env.NOTION_DB_CATEGORIES!,
  subscriptions: process.env.NOTION_DB_SUBSCRIPTIONS!,
  budgets: process.env.NOTION_DB_BUDGETS!,
  fxRates: process.env.NOTION_DB_FX_RATES!,
} as const;

// Query a Notion database via the REST API directly.
// @notionhq/client v5 removed databases.query in favor of dataSources.query
// which requires a separate DS ID not obtainable from standard integration tokens.
// This helper calls the REST endpoint /v1/databases/{id}/query which still works.
export async function queryDatabase(
  database_id: string,
  options: {
    filter?: object;
    sorts?: object[];
    page_size?: number;
    start_cursor?: string;
  } = {},
  token?: string
): Promise<{ results: Array<Record<string, unknown>>; next_cursor: string | null; has_more: boolean }> {
  const authToken = token ?? process.env.NOTION_TOKEN;
  const body: Record<string, unknown> = {};
  if (options.filter !== undefined) body.filter = options.filter;
  if (options.sorts !== undefined) body.sorts = options.sorts;
  if (options.page_size !== undefined) body.page_size = options.page_size;
  if (options.start_cursor !== undefined) body.start_cursor = options.start_cursor;

  const res = await fetch(`https://api.notion.com/v1/databases/${database_id}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Notion query error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

// Add/update properties on a database's schema via the REST API directly —
// same rationale as queryDatabase(): the v5 SDK's databases.update path
// requires data-source IDs not obtainable from a plain integration token.
// Only pass properties you want to add or change; existing ones not listed
// are left untouched, so this is safe to call repeatedly (idempotent).
export async function updateDatabaseSchema(
  database_id: string,
  properties: Record<string, unknown>,
  token?: string
): Promise<{ properties: Record<string, unknown> }> {
  const authToken = token ?? process.env.NOTION_TOKEN;
  const res = await fetch(`https://api.notion.com/v1/databases/${database_id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Notion schema update error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

// Fetch a database's current schema (property names + types) — used by the
// migration route to decide which properties are already present.
export async function getDatabaseSchema(
  database_id: string,
  token?: string
): Promise<{ properties: Record<string, { type: string }> }> {
  const authToken = token ?? process.env.NOTION_TOKEN;
  const res = await fetch(`https://api.notion.com/v1/databases/${database_id}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Notion-Version": "2022-06-28",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Notion schema fetch error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

// Resolve the parent page a database lives under — used to find where to
// publish/refresh the "Guía del sistema (para agentes)" child page relative
// to a user's own "Una Monedita" main page, without hardcoding its ID.
export async function getDatabaseParentPageId(
  database_id: string,
  token?: string
): Promise<string | null> {
  const schema = await getDatabaseSchema(database_id, token);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parent = (schema as any).parent;
  if (parent?.type === "page_id" && typeof parent.page_id === "string") return parent.page_id;
  return null;
}
