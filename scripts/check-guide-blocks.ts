// Verificación rápida del conversor markdown → bloques Notion contra el doc
// real: toda fila de tabla debe tener exactamente table_width celdas, o Notion
// rechaza la tabla con 400. Correr con: npx tsx scripts/check-guide-blocks.ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { markdownToBlocks } from "../lib/notion/markdown-blocks";

async function main() {
  const md = await readFile(path.join(process.cwd(), "docs", "NOTION-SCHEMA.md"), "utf8");
  const blocks = markdownToBlocks(md);

  let bad = 0;
  blocks.forEach((b, i) => {
    if (b.type !== "table") return;
    const width = b.table.table_width;
    b.table.children.forEach((row: { table_row: { cells: { text: { content: string } }[][] } }, r: number) => {
      if (row.table_row.cells.length !== width) {
        bad++;
        console.log(`MISMATCH block#${i} row#${r}: ${row.table_row.cells.length} != ${width}`);
        console.log("  cells:", row.table_row.cells.map((c) => c.map((t) => t.text.content).join("")));
      }
    });
  });

  const tables = blocks.filter((b) => b.type === "table").length;
  console.log(`blocks=${blocks.length} tables=${tables} mismatches=${bad}`);
  if (bad > 0) process.exit(1);
}

void main();
