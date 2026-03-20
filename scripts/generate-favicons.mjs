/**
 * Generate favicon set from logo-icon SVG.
 *
 * Produces: favicon.ico (32x32), apple-touch-icon.png (180x180),
 * icon-192.png, icon-512.png for PWA manifest.
 *
 * Run: node scripts/generate-favicons.mjs
 */

import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

const SVG = readFileSync("public/favicon.svg");

const sizes = [
  { name: "public/apple-touch-icon.png", size: 180 },
  { name: "public/icons/icon-192.png", size: 192 },
  { name: "public/icons/icon-512.png", size: 512 },
  { name: "public/favicon-32.png", size: 32 },
];

for (const { name, size } of sizes) {
  await sharp(SVG)
    .resize(size, size)
    .png()
    .toFile(name);
  console.log(`✓ ${name} (${size}x${size})`);
}

// Copy 32px as .ico (browsers accept PNG in .ico container)
const ico32 = readFileSync("public/favicon-32.png");
writeFileSync("public/favicon.ico", ico32);
console.log("✓ public/favicon.ico (32x32 PNG)");

console.log("\nDone. All favicon variants generated.");
