// Minimal Markdown → Notion blocks conversion + publish helpers, shared by
// scripts/publish-notion-guide.ts (CLI, uses env-var token) and
// app/api/notion/guide/route.ts (in-app, uses session creds). Supports what
// docs/NOTION-SCHEMA.md actually uses: #/##/### headings, paragraphs (with
// `code`, **bold**, and [text](url) inline spans), bullet lists, fenced code
// blocks, and GFM tables. Not a general-purpose converter.

const NOTION_VERSION = "2022-06-28";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Block = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RichText = Record<string, any>;

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionFetch(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { ...headers(token), ...(init.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Notion ${init.method ?? "GET"} ${url} → ${res.status}: ${body}`);
  }
  return res.json();
}

function inlineRichText(text: string): RichText[] {
  const out: RichText[] = [];
  // split on `code`, **bold**, [text](url) — first match wins, left to right
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (content: string, annotations?: Record<string, boolean>, link?: string) => {
    for (let i = 0; i < content.length; i += 1900) {
      out.push({
        type: "text",
        text: { content: content.slice(i, i + 1900), ...(link ? { link: { url: link } } : {}) },
        ...(annotations ? { annotations } : {}),
      });
    }
  };
  while ((m = re.exec(text))) {
    if (m.index > last) push(text.slice(last, m.index));
    if (m[1] !== undefined) push(m[1], { code: true });
    else if (m[2] !== undefined) push(m[2], { bold: true });
    else if (m[3] !== undefined) push(m[3], undefined, m[4]);
    last = re.lastIndex;
  }
  if (last < text.length) push(text.slice(last));
  return out.length ? out : [{ type: "text", text: { content: "" } }];
}

function parseTable(lines: string[], start: number): { block: Block; next: number } {
  // Solo los `|` sin escapar separan columnas: las tablas del schema usan `\|`
  // dentro de una celda para listar valores válidos (`Gasto` \| `Ingreso`).
  // Partir por todos los pipes generaba filas con más celdas que table_width y
  // Notion rechazaba la tabla entera con 400.
  const rowCells = (line: string) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/(?<!\\)\|$/, "")
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, "|"));

  const header = rowCells(lines[start]);
  // lines[start + 1] is the "---|---|---" separator — skip it
  let i = start + 2;
  const rows: string[][] = [];
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    rows.push(rowCells(lines[i]));
    i += 1;
  }

  const toRow = (cells: string[]) => ({
    type: "table_row",
    table_row: { cells: cells.map((c) => inlineRichText(c)) },
  });

  return {
    block: {
      type: "table",
      table: {
        table_width: header.length,
        has_column_header: true,
        has_row_header: false,
        children: [toRow(header), ...rows.map(toRow)],
      },
    },
    next: i,
  };
}

// Notion's code block only accepts a fixed language enum — fall back to
// "plain text" for anything it doesn't recognize (e.g. our http snippets).
const KNOWN_LANGS = new Set(["json", "typescript", "javascript", "bash", "shell", "markdown", "plain text"]);
export function normalizeCodeLang(lang: string): string {
  const l = lang.toLowerCase();
  if (l === "sh") return "shell";
  if (l === "ts") return "typescript";
  if (l === "js") return "javascript";
  if (l === "http" || l === "") return "plain text";
  return KNOWN_LANGS.has(l) ? l : "plain text";
}

export function markdownToBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "plain text";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      blocks.push({
        type: "code",
        code: { rich_text: inlineRichText(codeLines.join("\n")), language: normalizeCodeLang(lang) },
      });
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#{1,3}\s/, "");
      const type = level === 1 ? "heading_1" : level === 2 ? "heading_2" : "heading_3";
      blocks.push({ type, [type]: { rich_text: inlineRichText(text) } });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|") && lines[i + 1]?.trim().startsWith("|") && /^\|[\s-:|]+\|$/.test(lines[i + 1].trim())) {
      const { block, next } = parseTable(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }

    if (/^[-*]\s/.test(line.trim())) {
      const text = line.trim().replace(/^[-*]\s/, "");
      blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: inlineRichText(text) } });
      i += 1;
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    blocks.push({ type: "paragraph", paragraph: { rich_text: inlineRichText(line) } });
    i += 1;
  }
  return blocks;
}

// ---- publish helpers ----

export async function findExistingPageId(token: string, parentId: string, title: string): Promise<string | null> {
  let cursor: string | undefined;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${parentId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const data = await notionFetch(token, url.toString());
    for (const block of data.results) {
      if (block.type === "child_page" && block.child_page?.title === title) return block.id;
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return null;
}

export async function clearChildren(token: string, pageId: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const data = await notionFetch(token, url.toString());
    for (const block of data.results) {
      await notionFetch(token, `https://api.notion.com/v1/blocks/${block.id}`, { method: "DELETE" });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
}

export async function appendBlocksBatched(token: string, pageId: string, blocks: Block[]): Promise<void> {
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90);
    await notionFetch(token, `https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      body: JSON.stringify({ children: chunk }),
    });
  }
}

async function createChildPage(token: string, parentId: string, title: string, icon: string): Promise<string> {
  const created = await notionFetch(token, "https://api.notion.com/v1/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { page_id: parentId },
      icon: { type: "emoji", emoji: icon },
      properties: { title: { title: [{ text: { content: title } }] } },
    }),
  });
  return created.id;
}

// Publish `markdown` as a child page titled `title` under `parentId`.
// Idempotent: if the page already exists (matched by title), its content is
// replaced; otherwise it's created.
export async function publishMarkdownPage(
  token: string,
  parentId: string,
  title: string,
  icon: string,
  markdown: string
): Promise<{ pageId: string; url: string; blocks: number }> {
  const blocks = markdownToBlocks(markdown);

  let pageId = await findExistingPageId(token, parentId, title);
  if (pageId) {
    await clearChildren(token, pageId);
  } else {
    pageId = await createChildPage(token, parentId, title, icon);
  }

  await appendBlocksBatched(token, pageId, blocks);
  return { pageId, url: `https://notion.so/${pageId.replace(/-/g, "")}`, blocks: blocks.length };
}
