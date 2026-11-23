import assert from "node:assert/strict";
import test from "node:test";
import { RECIPES } from "../src/recipes/catalog.js";
import {
  INGREDIENT_ALIASES,
  normalizeIngredient,
  normalizeIngredients,
} from "../src/recipes/normalize.js";

test("alias and whitespace cleanup", () => {
  assert.equal(normalizeIngredient("  Chicken   Breast "), "chicken");
});

test("dedupes and drops blanks", () => {
  assert.deepEqual(normalizeIngredients(["Rice", "rice ", " RICE", "", "  "]), ["rice"]);
});

test("unknown passes through", () => {
  assert.equal(normalizeIngredient("Dragon Fruit"), "dragon fruit");
});

test("keeps first-seen order and merges alias duplicates", () => {
  assert.deepEqual(normalizeIngredients(["rice", "eggs", "chicken", "egg"]), [
    "rice",
    "egg",
    "chicken",
  ]);
});

test("staple aliases", () => {
  assert.deepEqual(normalizeIngredients(["Pepper", "vegetable oil", "oil"]), ["black pepper", "olive oil"]);
});

test("every alias target exists in the catalog", () => {
  const names = new Set(RECIPES.flatMap((r) => r.ingredients.map((i) => i.name)));
  for (const target of Object.values(INGREDIENT_ALIASES)) {
    assert.ok(names.has(target), `missing alias target ${target}`);
  }
});
