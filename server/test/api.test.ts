import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";

let server: Server;
let base: string;

before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

const post = (body: string, type = "application/json") =>
  fetch(`${base}/api/recipes/match`, {
    method: "POST",
    headers: { "Content-Type": type },
    body,
  });

test("GET / health", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "EasyPlate API is running");
});

test("happy path", async () => {
  const res = await post(
    JSON.stringify({ ingredients: ["Chicken", " rice ", "BROCCOLI", "rice"] }),
  );
  assert.equal(res.status, 200);
  const data = (await res.json()) as { recipes: Record<string, unknown>[] };
  const first = data.recipes[0]!;
  assert.equal(first["id"], "chicken-broccoli-rice-bowl");
  for (const k of ["totalMinutes", "staples", "steps", "ingredients", "matched", "missing"]) {
    assert.ok(k in first, k);
  }
});

const bad: [string, string, string?][] = [
  ["malformed json", '{"ingredients":'],
  ["array body", "[]"],
  ["string ingredients", '{"ingredients":"chicken"}'],
  ["non-string item", '{"ingredients":[1]}'],
  ["blank items", '{"ingredients":["  ",""]}'],
  ["missing key", "{}"],
  ["non-json content type", '{"ingredients":["rice"]}', "text/plain"],
  [
    "51 items",
    JSON.stringify({ ingredients: Array.from({ length: 51 }, (_, i) => `i${i}`) }),
  ],
];
for (const [name, body, type] of bad) {
  test(`400: ${name}`, async () => {
    const res = type === undefined ? await post(body) : await post(body, type);
    assert.equal(res.status, 400);
    const data = (await res.json()) as { error: unknown };
    assert.equal(typeof data.error, "string");
    assert.ok((data.error as string).length > 0);
  });
}

test("413 for oversized body is JSON", async () => {
  const res = await post(JSON.stringify({ ingredients: ["a".repeat(150_000)] }));
  assert.equal(res.status, 413);
  assert.equal(typeof ((await res.json()) as { error: unknown }).error, "string");
});

test("no match is 200 empty", async () => {
  const res = await post('{"ingredients":["chocolate"]}');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { recipes: [] });
});
