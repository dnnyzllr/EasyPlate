import { normalizeCandidates } from "../detect/candidates.js";
import type { DetectCandidate } from "../detect/contract.js";
import { normalizeIngredients } from "../recipes/normalize.js";

export type Split = "dev" | "heldout";
export interface ManifestImage {
  id: string;
  file: string;
  split: Split;
  visible: string[];
  notes?: string;
}
export interface Manifest {
  version: 1;
  description?: string;
  images: ManifestImage[];
}

export function parseManifest(
  json: unknown,
): { ok: true; manifest: Manifest } | { ok: false; error: string } {
  const bad = (error: string) => ({ ok: false as const, error });
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return bad("Manifest must be a JSON object.");
  }
  const m = json as Record<string, unknown>;
  if (m["version"] !== 1) return bad('Manifest "version" must be 1.');
  const list = m["images"];
  if (!Array.isArray(list) || list.length === 0) return bad('"images" must be a non-empty array.');
  const ids = new Set<string>();
  const images: ManifestImage[] = [];
  for (let i = 0; i < list.length; i++) {
    const it = list[i] as unknown;
    if (typeof it !== "object" || it === null || Array.isArray(it)) return bad(`images[${i}] must be an object.`);
    const o = it as Record<string, unknown>;
    if (typeof o["id"] !== "string" || o["id"] === "") return bad(`images[${i}].id must be a non-empty string.`);
    if (ids.has(o["id"])) return bad(`images[${i}].id "${o["id"]}" is a duplicate.`);
    ids.add(o["id"]);
    if (typeof o["file"] !== "string" || o["file"] === "") return bad(`images[${i}].file must be a non-empty string.`);
    const split = o["split"] ?? "dev";
    if (split !== "dev" && split !== "heldout") return bad(`images[${i}].split must be "dev" or "heldout".`);
    const visible = o["visible"];
    if (!Array.isArray(visible) || !visible.every((v) => typeof v === "string")) {
      return bad(`images[${i}].visible must be an array of strings.`);
    }
    const img: ManifestImage = { id: o["id"], file: o["file"], split, visible: visible as string[] };
    if (typeof o["notes"] === "string") img.notes = o["notes"];
    images.push(img);
  }
  const manifest: Manifest = { version: 1, images };
  if (typeof m["description"] === "string") manifest.description = m["description"];
  return { ok: true, manifest };
}

export interface ImageScore {
  truth: string[];
  predicted: string[];
  hits: string[];
  misses: string[];
  falseGuesses: string[];
  precision: number | null;
  recall: number | null;
}

const ratio = (n: number, d: number): number | null => (d === 0 ? null : n / d);

export function scoreImage(
  visible: readonly string[],
  raw: readonly DetectCandidate[],
  minConfidence: number,
): ImageScore {
  const truth = normalizeIngredients(visible);
  const predicted = normalizeCandidates(raw)
    .filter((c) => c.confidence >= minConfidence)
    .map((c) => c.name);
  const hits = predicted.filter((p) => truth.includes(p));
  const misses = truth.filter((t) => !predicted.includes(t));
  const falseGuesses = predicted.filter((p) => !truth.includes(p));
  return {
    truth,
    predicted,
    hits,
    misses,
    falseGuesses,
    precision: ratio(hits.length, predicted.length),
    recall: ratio(hits.length, truth.length),
  };
}

export interface Aggregate {
  images: number;
  tp: number;
  fp: number;
  fn: number;
  precision: number | null;
  recall: number | null;
}

const round4 = (v: number | null): number | null => (v === null ? null : Math.round(v * 10000) / 10000);

export function aggregate(scores: readonly ImageScore[]): Aggregate {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const s of scores) {
    tp += s.hits.length;
    fp += s.falseGuesses.length;
    fn += s.misses.length;
  }
  return {
    images: scores.length,
    tp,
    fp,
    fn,
    precision: round4(ratio(tp, tp + fp)),
    recall: round4(ratio(tp, tp + fn)),
  };
}
