import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import type { DetectCandidate } from "../detect/contract.js";
import { MAX_IMAGE_BYTES, sniffImageType } from "../detect/image.js";
import { createDetector } from "../detect/registry.js";
import type { Detector, SupportedImageType } from "../detect/types.js";
import { aggregate, parseManifest, scoreImage } from "./evaluate.js";
import type { ImageScore, ManifestImage } from "./evaluate.js";

// Local evaluation only: reads image files from disk and runs the detector in-process.
// Nothing is uploaded, and image bytes are never printed or stored.

const USAGE =
  "Usage: npm run eval:detect -- --manifest <path> [--split dev|heldout|all] [--detector <id>] " +
  "[--min-confidence 0..1] [--prompt-version <s>] [--out <path>]";

function usageError(message: string): never {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

let args;
try {
  args = parseArgs({
    options: {
      manifest: { type: "string" },
      split: { type: "string", default: "dev" },
      detector: { type: "string" },
      "min-confidence": { type: "string", default: "0.5" },
      "prompt-version": { type: "string" },
      out: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  }).values;
} catch (err) {
  usageError(err instanceof Error ? err.message : String(err));
}

if (!args.manifest) usageError("--manifest is required.");
const splitArg = args.split ?? "dev";
if (splitArg !== "dev" && splitArg !== "heldout" && splitArg !== "all") {
  usageError('--split must be "dev", "heldout" or "all".');
}
const minConfidence = Number(args["min-confidence"]);
if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1) {
  usageError("--min-confidence must be a number between 0 and 1.");
}

let manifestBytes: Buffer;
try {
  manifestBytes = await readFile(args.manifest);
} catch {
  usageError(`Can't read manifest ${args.manifest}.`);
}
let manifestJson: unknown;
try {
  manifestJson = JSON.parse(manifestBytes.toString("utf8"));
} catch {
  usageError(`Manifest ${args.manifest} is not valid JSON.`);
}
const parsed = parseManifest(manifestJson);
if (!parsed.ok) usageError(`Invalid manifest: ${parsed.error}`);

let detector: Detector;
try {
  detector = createDetector(args.detector ?? process.env["DETECTOR"]);
} catch (err) {
  usageError(err instanceof Error ? err.message : String(err));
}
const promptVersion = args["prompt-version"] ?? detector.info.promptVersion;
const manifestDir = path.dirname(path.resolve(args.manifest));
const selected = parsed.manifest.images.filter((i) => splitArg === "all" || i.split === splitArg);

interface ImageRecord extends Partial<ImageScore> {
  id: string;
  file: string;
  split: string;
  rawPredictions: DetectCandidate[];
  error?: string;
}

async function runImage(img: ManifestImage): Promise<{ record: ImageRecord; score?: ImageScore }> {
  const record: ImageRecord = { id: img.id, file: img.file, split: img.split, rawPredictions: [] };
  try {
    const bytes = await readFile(path.resolve(manifestDir, img.file));
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Image is larger than 5 MB.");
    const sniffed = sniffImageType(bytes);
    if (sniffed === null || sniffed === "image/heic") {
      throw new Error("Unsupported image type (need JPEG, PNG or WebP).");
    }
    const raw = await detector.detect({ bytes, mimeType: sniffed as SupportedImageType });
    record.rawPredictions = raw;
    const score = scoreImage(img.visible, raw, minConfidence);
    Object.assign(record, score);
    return { record, score };
  } catch (err) {
    record.error = err instanceof Error ? err.message : String(err);
    return { record };
  }
}

const fmt = (n: number | null): string => (n === null ? "n/a" : n.toFixed(2));

console.log(
  `Detector: ${detector.info.id} ${detector.info.version} (prompt ${promptVersion ?? "none"}) | ` +
    `split: ${splitArg} | images: ${selected.length}`,
);

const records: ImageRecord[] = [];
const scores: ImageScore[] = [];
for (const img of selected) {
  const { record, score } = await runImage(img);
  records.push(record);
  if (score) scores.push(score);
  console.log(`\n${img.id}`);
  if (record.error) {
    console.log(`  ERROR ${record.error}`);
    continue;
  }
  if (score) {
    if (score.misses.length > 0) console.log(`  missed: ${score.misses.join(", ")}`);
    if (score.falseGuesses.length > 0) console.log(`  false guesses: ${score.falseGuesses.join(", ")}`);
    console.log(`  P=${fmt(score.precision)} R=${fmt(score.recall)}`);
  }
}

const agg = aggregate(scores);
console.log(
  `\nAggregate: TP=${agg.tp} FP=${agg.fp} FN=${agg.fn} precision=${fmt(agg.precision)} recall=${fmt(agg.recall)}`,
);

const timestamp = new Date().toISOString();
const outPath =
  args.out ?? path.join("eval", "runs", `${timestamp.replace(/[:.]/g, "-")}-${detector.info.id}.json`);
await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify(
    {
      schemaVersion: 1,
      timestamp,
      detector: { id: detector.info.id, version: detector.info.version, promptVersion },
      manifest: { path: args.manifest, sha256: createHash("sha256").update(manifestBytes).digest("hex") },
      split: splitArg,
      minConfidence,
      images: records,
      aggregate: agg,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Run record: ${outPath}`);

process.exit(records.some((r) => r.error) || selected.length === 0 ? 1 : 0);
