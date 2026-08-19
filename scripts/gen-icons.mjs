// One-off: rasteriza un SVG vectorial (Recraft V4.1) a los PNG que pide manifest.ts.
// Uso: node scripts/gen-icons.mjs <ruta-svg>
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const svgPath = process.argv[2];
if (!svgPath) {
  console.error("Uso: node scripts/gen-icons.mjs <ruta-svg>");
  process.exit(1);
}

const outDir = path.resolve("public");
await mkdir(outDir, { recursive: true });

const sizes = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "logo.png", size: 256 },
];

for (const { file, size } of sizes) {
  await sharp(svgPath, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 244, g: 243, b: 238, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, file));
  console.log(`✓ ${file} (${size}x${size})`);
}
