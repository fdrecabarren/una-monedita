import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { getDatabaseParentPageId } from "@/lib/notion/client";
import { publishMarkdownPage } from "@/lib/notion/markdown-blocks";
import { isNotionUnauthorized, notionErrorResponse } from "@/lib/notion/errors";

export const dynamic = "force-dynamic";

const PAGE_TITLE = "📖 Guía del sistema (para agentes)";

// Publishes docs/NOTION-SCHEMA.md as a child page under the user's "Una
// Monedita" main page, using the creds of the connected Notion (cookie). Mirrors
// scripts/publish-notion-guide.ts, which does the same thing from the CLI with
// env-var creds: both call the shared lib/notion/markdown-blocks.ts.
export async function POST(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  let parentId: string | null;
  try {
    parentId = await getDatabaseParentPageId(creds.dbIds.transactions, creds.token);
  } catch (err) {
    if (isNotionUnauthorized(err)) return notionErrorResponse("guide:parent", err);
    parentId = null;
  }
  if (!parentId) {
    return NextResponse.json(
      { error: "No pude resolver la página principal de Notion (padre de Transactions)." },
      { status: 500 }
    );
  }

  let markdown: string;
  try {
    markdown = await readFile(path.join(process.cwd(), "docs", "NOTION-SCHEMA.md"), "utf8");
  } catch {
    return NextResponse.json({ error: "No encontré docs/NOTION-SCHEMA.md en el servidor." }, { status: 500 });
  }

  try {
    const result = await publishMarkdownPage(creds.token, parentId, PAGE_TITLE, "📖", markdown);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (isNotionUnauthorized(err)) return notionErrorResponse("guide:publish", err);
    return NextResponse.json({ error: "Error publicando en Notion", detail: String(err) }, { status: 502 });
  }
}
