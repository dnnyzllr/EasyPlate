import { mkdir, writeFile } from "node:fs/promises";
import { makeSolidPng } from "./png.js";

// Writes the tiny synthetic images used by eval/manifest.example.json (relative to cwd).
const FILES: Record<string, readonly [number, number, number]> = {
  "synthetic-red.png": [200, 40, 40],
  "synthetic-green.png": [40, 160, 60],
  "synthetic-blue.png": [40, 70, 200],
  "synthetic-heldout.png": [230, 190, 40],
};

await mkdir("eval/fixtures", { recursive: true });
for (const [name, rgb] of Object.entries(FILES)) {
  await writeFile(`eval/fixtures/${name}`, makeSolidPng(16, 16, rgb));
  console.log(`wrote eval/fixtures/${name}`);
}
