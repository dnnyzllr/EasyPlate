import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { normalizeCandidates } from "../src/detect/candidates.js";
import type { DetectCandidate } from "../src/detect/contract.js";
import { FIXTURE_POOL, fixtureCandidates } from "../src/detect/fixture.js";
import { MAX_IMAGE_BYTES, decodeBase64Image, sniffImageType } from "../src/detect/image.js";
import { createDetector } from "../src/detect/registry.js";
import type { Detector } from "../src/detect/types.js";
import { makeSolidPng } from "../src/eval/png.js";
import { normalizeIngredient } from "../src/recipes/normalize.js";

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
const png = makeSolidPng(4, 4, [200, 10, 10]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(32)]);
const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(32)]);
const gif = Buffer.from("GIF89a0000000000");

let server: Server;
let base: string;
let stubServer: Server;
let stubBase: string;
let stubResult: () => Promise<DetectCandidate[]> = async () => [];

before(async () => {
  server = createApp().listen(0);
  const stub: Detector = {
    info: { id: "stub", version: "0", promptVersion: null },
    detect: () => stubResult(),
  };
  stubServer = createApp({ detector: stub }).listen(0);
  await Promise.all(
    [server, stubServer].map((s) => new Promise<void>((r) => s.once("listening", () => r()))),
  );
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  stubBase = `http://127.0.0.1:${(stubServer.address() as AddressInfo).port}`;
});

after(async () => {
  await Promise.all(
    [server, stubServer].map((s) => new Promise<void>((r) => s.close(() => r()))),
  );
});

const raw = (url: string, body: string | Buffer | undefined, type: string | null = "application/json") =>
  fetch(`${url}/api/ingredients/detect`, {
    method: "POST",
    headers: type === null ? {} : { "Content-Type": type },
    ...(body === undefined ? {} : { body }),
  });
const post = (bytes: Buffer, extra: Record<string, unknown> = {}, url = base) =>
  raw(url, JSON.stringify({ image: bytes.toString("base64"), ...extra }));
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

for (const [label, bytes, mime] of [
  ["jpeg", jpeg, "image/jpeg"],
  ["png", png, "image/png"],
  ["webp", webp, "image/webp"],
] as const) {
  test(`200 for valid ${label}`, async () => {
    const res = await post(bytes, { mimeType: mime });
    assert.equal(res.status, 200);
    const data = (await res.json()) as { candidates: DetectCandidate[]; detector: unknown };
    assert.deepEqual(Object.keys(data).sort(), ["candidates", "detector"]);
    assert.deepEqual(data.detector, { id: "fixture", version: "1.0.0" });
    assert.ok(data.candidates.length >= 3 && data.candidates.length <= 5);
    for (const c of data.candidates) {
      assert.equal(c.name, normalizeIngredient(c.name));
      assert.ok(c.confidence >= 0 && c.confidence <= 1);
      assert.equal(Math.round(c.confidence * 100) / 100, c.confidence);
    }
    const names = data.candidates.map((c) => c.name);
    for (const rawName of ["eggs", "cherry tomatoes", "chicken breast", "cheddar", "carrots"]) {
      assert.ok(!names.includes(rawName));
    }
    const conf = data.candidates.map((c) => c.confidence);
    assert.deepEqual(conf, [...conf].sort((a, b) => b - a));
    assert.ok(conf.some((c) => c < 0.5));
  });
}

test("deterministic for same bytes, different for different bytes", async () => {
  const a = await (await post(jpeg)).json();
  const b = await (await post(jpeg)).json();
  assert.deepEqual(a, b);
  const other = Buffer.concat([jpeg, Buffer.from([9])]);
  const c = await (await post(other)).json();
  assert.notDeepEqual(a, c);
});

test("mismatched mimeType gives 415", async () => {
  const res = await post(png, { mimeType: "image/jpeg" });
  assert.equal(res.status, 415);
  assert.match(await errorOf(res), /says image\/jpeg but the image is image\/png/);
});

test("415 cases", async () => {
  for (const [bytes, extra] of [
    [heic, {}],
    [gif, {}],
    [Buffer.from("just some text"), {}],
    [jpeg, { mimeType: "image/gif" }],
    [jpeg, { mimeType: 5 }],
    [Buffer.from([0xff, 0xd8]), {}],
  ] as const) {
    const res = await post(bytes, extra);
    assert.equal(res.status, 415);
    assert.equal(typeof (await res.json() as { error: unknown }).error, "string");
  }
  const heicRes = await post(heic);
  // (body consumed above for a different request; re-check message here)
  assert.match(await errorOf(heicRes), /HEIC/);
  const rawBody = await raw(base, jpeg, "image/jpeg");
  assert.equal(rawBody.status, 415);
  assert.match(await errorOf(rawBody), /Send JSON/);
  const text = await raw(base, "hi", "text/plain");
  assert.equal(text.status, 415);
});

test("400 cases", async () => {
  const cases: (string | undefined)[] = [
    undefined,
    "{}",
    '{"image":123}',
    '{"image":""}',
    '{"image":"   "}',
    '{"image":"not*base64!"}',
    '{"image":"abc"}',
    "{not json",
    "[]",
  ];
  for (const body of cases) {
    const res = await raw(base, body);
    assert.equal(res.status, 400, String(body));
    assert.equal(typeof (await res.json() as { error: unknown }).error, "string");
  }
  const noType = await raw(base, undefined, null);
  assert.equal(noType.status, 400);
});

test("size limits", async () => {
  const exact = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(MAX_IMAGE_BYTES - 3, 65)]);
  assert.equal(exact.length, MAX_IMAGE_BYTES);
  assert.equal((await post(exact)).status, 200);
  const over = Buffer.concat([exact, Buffer.from([65])]);
  const res = await post(over);
  assert.equal(res.status, 413);
  assert.match(await errorOf(res), /larger than 5 MB/);
  const huge = await raw(base, JSON.stringify({ image: "A".repeat(9 * 1024 * 1024) }));
  assert.equal(huge.status, 413);
  assert.equal(typeof (await huge.json() as { error: unknown }).error, "string");
});

test("recipes route keeps its own 100 KB limit", async () => {
  const big = await fetch(`${base}/api/recipes/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients: ["x".repeat(150_000)] }),
  });
  assert.equal(big.status, 413);
  const ok = await fetch(`${base}/api/recipes/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients: ["chicken"] }),
  });
  assert.equal(ok.status, 200);
});

test("stub detector output is normalized", async () => {
  stubResult = async () => [
    { name: " Eggs ", confidence: 0.4 },
    { name: "egg", confidence: 0.9 },
    { name: "", confidence: 1 },
    { name: "Cherry Tomatoes", confidence: 1.7 },
  ];
  const res = await post(jpeg, {}, stubBase);
  assert.equal(res.status, 200);
  const data = (await res.json()) as { candidates: unknown; detector: unknown };
  assert.deepEqual(data.candidates, [
    { name: "tomato", confidence: 1 },
    { name: "egg", confidence: 0.9 },
  ]);
  assert.deepEqual(data.detector, { id: "stub", version: "0" });
});

test("throwing detector gives 502 JSON and server keeps serving", async () => {
  stubResult = async () => {
    throw new Error("boom");
  };
  const res = await post(jpeg, {}, stubBase);
  assert.equal(res.status, 502);
  assert.match(await errorOf(res), /detection failed/);
  const health = await fetch(`${stubBase}/`);
  assert.equal(health.status, 200);
});

test("sniffImageType", () => {
  assert.equal(sniffImageType(jpeg), "image/jpeg");
  assert.equal(sniffImageType(png), "image/png");
  assert.equal(sniffImageType(webp), "image/webp");
  assert.equal(sniffImageType(heic), "image/heic");
  assert.equal(sniffImageType(gif), null);
  assert.equal(sniffImageType(new Uint8Array(0)), null);
  assert.equal(sniffImageType(Buffer.from([0xff, 0xd8])), null);
});

test("decodeBase64Image", () => {
  assert.deepEqual(decodeBase64Image("aGk="), Buffer.from("hi"));
  assert.deepEqual(decodeBase64Image("aG\nk="), Buffer.from("hi"));
  assert.equal(decodeBase64Image("abc"), null);
  assert.equal(decodeBase64Image("a*bc"), null);
  assert.equal(decodeBase64Image("aGk=="), null);
  assert.equal(decodeBase64Image("data:image/png;base64,AAAA"), null);
});

test("normalizeCandidates", () => {
  const out = normalizeCandidates([
    { name: "Milk", confidence: 0.5 },
    { name: "apple", confidence: 0.5 },
    { name: "x", confidence: Number.NaN },
    { name: "y", confidence: -2 },
  ]);
  assert.deepEqual(out, [
    { name: "apple", confidence: 0.5 },
    { name: "milk", confidence: 0.5 },
    { name: "y", confidence: 0 },
  ]);
  const many = Array.from({ length: 30 }, (_, i) => ({ name: `item${i}`, confidence: 0.5 }));
  assert.equal(normalizeCandidates(many).length, 20);
});

test("fixtureCandidates is stable with 3 to 5 picks and a low last pick", () => {
  for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    const a = fixtureCandidates(Buffer.from(seed));
    assert.deepEqual(a, fixtureCandidates(Buffer.from(seed)));
    assert.ok(a.length >= 3 && a.length <= 5);
    assert.ok((a[a.length - 1] as DetectCandidate).confidence < 0.5);
    for (const c of a) assert.ok(FIXTURE_POOL.includes(c.name));
    assert.equal(new Set(a.map((c) => c.name)).size, a.length);
  }
});

test("createDetector", () => {
  for (const id of [undefined, "", "fixture"]) assert.equal(createDetector(id).info.id, "fixture");
  assert.throws(() => createDetector("openai"), /Unknown DETECTOR/);
});
