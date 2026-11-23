import assert from "node:assert/strict";
import { test } from "node:test";
import { sniffImageType } from "../src/detect/image.js";
import { aggregate, parseManifest, scoreImage } from "../src/eval/evaluate.js";
import { makeSolidPng } from "../src/eval/png.js";

const img = (over: Record<string, unknown> = {}) => ({ id: "a", file: "a.png", visible: ["egg"], ...over });

test("parseManifest accepts a valid manifest and defaults split", () => {
  const r = parseManifest({ version: 1, images: [img(), img({ id: "b", split: "heldout", notes: "n" })] });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.manifest.images[0]?.split, "dev");
    assert.equal(r.manifest.images[1]?.split, "heldout");
    assert.equal(r.manifest.images[1]?.notes, "n");
  }
});

test("parseManifest rejects bad manifests with the image index", () => {
  const dup = parseManifest({ version: 1, images: [img(), img()] });
  assert.ok(!dup.ok && /images\[1\].*duplicate/.test(dup.error));
  const split = parseManifest({ version: 1, images: [img({ split: "test" })] });
  assert.ok(!split.ok && /images\[0\]\.split/.test(split.error));
  const noVisible = parseManifest({ version: 1, images: [{ id: "a", file: "a.png" }] });
  assert.ok(!noVisible.ok && /images\[0\]\.visible/.test(noVisible.error));
  assert.ok(!parseManifest({ version: 1, images: [] }).ok);
  assert.ok(!parseManifest([]).ok);
});

test("scoreImage normalizes truth and predictions", () => {
  const s = scoreImage(
    ["Eggs", "Cherry tomatoes"],
    [
      { name: "egg", confidence: 0.9 },
      { name: "milk", confidence: 0.8 },
      { name: "tomato", confidence: 0.3 },
    ],
    0.5,
  );
  assert.deepEqual(s.hits, ["egg"]);
  assert.deepEqual(s.misses, ["tomato"]);
  assert.deepEqual(s.falseGuesses, ["milk"]);
  assert.equal(s.precision, 0.5);
  assert.equal(s.recall, 0.5);
});

test("empty truth gives null recall", () => {
  const s = scoreImage([], [{ name: "egg", confidence: 0.9 }], 0.5);
  assert.equal(s.recall, null);
  assert.equal(s.precision, 0);
});

test("aggregate sums counts", () => {
  const a = scoreImage(["egg", "milk"], [{ name: "egg", confidence: 1 }, { name: "rice", confidence: 1 }], 0.5);
  const b = scoreImage(["bread"], [{ name: "bread", confidence: 1 }], 0.5);
  const g = aggregate([a, b]);
  assert.deepEqual(g, { images: 2, tp: 2, fp: 1, fn: 1, precision: 0.6667, recall: 0.6667 });
  assert.equal(aggregate([]).precision, null);
});

test("makeSolidPng output is a PNG", () => {
  const p = makeSolidPng(16, 16, [1, 2, 3]);
  assert.deepEqual([...p.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(sniffImageType(p), "image/png");
  assert.ok(p.length < 200);
});
