import { Client } from "@notionhq/client";

// Un cliente por llamada: las credenciales son de cada persona (vienen de su
// cookie), así que nunca se cachea ni se cae a variables de entorno del servidor.
export function getNotionClient(token: string): Client {
  if (!token) throw new Error("Falta el token de Notion");
  return new Client({ auth: token });
}

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
  token: string
): Promise<{ results: Array<Record<string, unknown>>; next_cursor: string | null; has_more: boolean }> {
  const authToken = token;
  const body: Record<string, unknown> = {};
  if (options.filter !== undefined) body.filter = options.filter;
  if (options.sorts !== undefined) body.sorts = options.sorts;
  if (options.page_size !== undefined) body.page_size = options.page_size;
  if (options.start_cursor !== undefined) body.start_cursor = options.start_cursor;

  // Notion limita a ~3 pedidos/s: ante un 429 espera `Retry-After` (1 s por
  // defecto, tope 10 s) y reintenta hasta 3 veces antes de fallar.
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`https://api.notion.com/v1/databases/${database_id}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt >= 3) break;
    const wait = Math.min(10, Math.max(0, Number(res.headers.get("retry-after")) || 1));
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
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
  token: string
): Promise<{ properties: Record<string, unknown> }> {
  const authToken = token;
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
  token: string
): Promise<{ properties: Record<string, { type: string }> }> {
  const authToken = token;
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
  token: string
): Promise<string | null> {
  const schema = await getDatabaseSchema(database_id, token);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parent = (schema as any).parent;
  if (parent?.type === "page_id" && typeof parent.page_id === "string") return parent.page_id;
  return null;
}
