// Publishes docs/NOTION-SCHEMA.md as a child page of the "Una Monedita" main
// Notion page, so an agent (e.g. Hermes) can read the DB schema straight from
// Notion instead of having to have repo access. Idempotent: if the page
// already exists (matched by title), its content is replaced; otherwise it's
// created. The markdown file in the repo is the source of truth — always
// re-run this after editing docs/NOTION-SCHEMA.md.
//
// This is the CLI path (env-var token). The app also exposes the same
// publish logic at POST /api/notion/guide (Ajustes → Mantenimiento →
// "Publicar guía"), using the logged-in user's session creds instead — use
// that when you don't have a working NOTION_TOKEN in .env.local.
//
// Usage:
//   node --experimental-strip-types scripts/publish-notion-guide.ts
//
// Requires NOTION_TOKEN and NOTION_PARENT_PAGE_ID in .env.local (or already
// exported in the environment). No dependencies beyond Node's built-in fetch.

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { publishMarkdownPage } from "../lib/notion/markdown-blocks.ts";

const PAGE_TITLE = "📖 Guía del sistema (para agentes)";
const ROOT = path.resolve(import.meta.dirname, "..");

// ---- tiny .env.local loader (no dotenv dependency) ----
async function loadEnvLocal(): Promise<void> {
  try {
    const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env.local — rely on already-exported env vars
  }
}

async function main() {
  await loadEnvLocal();
  const token = process.env.NOTION_TOKEN;
  const parentId = process.env.NOTION_PARENT_PAGE_ID;
  if (!token || !parentId) {
    console.error("Falta NOTION_TOKEN o NOTION_PARENT_PAGE_ID (.env.local o env).");
    process.exit(1);
  }

  const md = await readFile(path.join(ROOT, "docs", "NOTION-SCHEMA.md"), "utf8");
  console.log("Publicando docs/NOTION-SCHEMA.md en Notion…");

  const result = await publishMarkdownPage(token, parentId, PAGE_TITLE, "📖", md);
  console.log(`Listo. ${result.blocks} bloques publicados: ${result.url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
