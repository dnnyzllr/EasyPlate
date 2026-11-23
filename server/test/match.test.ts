import assert from "node:assert/strict";
import test from "node:test";
import { RECIPES } from "../src/recipes/catalog.js";
import { matchRecipes } from "../src/recipes/match.js";

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

test("chicken rice broccoli ranking", () => {
  const r = matchRecipes(["chicken", "rice", "broccoli"]);
  assert.deepEqual(ids(r), [
    "chicken-broccoli-rice-bowl",
    "chicken-rice-soup",
    "chicken-fried-rice",
  ]);
  assert.deepEqual(r[0]?.matched, ["chicken", "rice", "broccoli"]);
  assert.deepEqual(r[0]?.missing, ["soy sauce", "garlic"]);
  assert.deepEqual(r[0]?.staples, []);
});

test("fully matched recipe first", () => {
  const r = matchRecipes(["eggs", "bread", "butter"]);
  assert.deepEqual(ids(r), ["scrambled-eggs-toast", "cheese-omelette", "garlic-bread"]);
  assert.deepEqual(r[0]?.missing, []);
});

test("ties break by id ascending", () => {
  assert.deepEqual(ids(matchRecipes(["butter"])), [
    "cheese-omelette",
    "cheesy-pasta",
    "garlic-bread",
  ]);
});

test("no match returns empty", () => {
  assert.deepEqual(matchRecipes(["chocolate"]), []);
});

test("staples are never missing and do not match on their own", () => {
  assert.deepEqual(matchRecipes(["salt", "pepper", "oil", "water", "olive oil"]), []);
  const r = matchRecipes(["tomato", "salt", "water"]);
  assert.ok(r.length > 0);
  for (const m of r) {
    for (const s of ["salt", "black pepper", "olive oil", "water"]) assert.ok(!m.missing.includes(s) && !m.matched.includes(s));
  }
  const soup = matchRecipes(["chicken", "rice", "carrot", "onion"])[0]!;
  assert.equal(soup.id, "chicken-rice-soup");
  assert.deepEqual(soup.missing, []);
  assert.deepEqual(soup.staples.map((s) => s.name), ["water", "salt", "black pepper"]);
});

test("catalog has about 15 recipes with unique ids", () => {
  assert.equal(RECIPES.length, 15);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, 15);
});

test("max 3 results and results are copies", () => {
  const r = matchRecipes(["egg", "butter", "garlic", "rice", "chicken", "broccoli"]);
  assert.ok(r.length <= 3);
  const first = r[0]!;
  const orig = RECIPES.find((x) => x.id === first.id)!;
  const stepsBefore = orig.steps.length;
  const ingBefore = orig.ingredients.length;
  first.steps.push("x");
  first.ingredients.pop();
  assert.equal(orig.steps.length, stepsBefore);
  assert.equal(orig.ingredients.length, ingBefore);
});
