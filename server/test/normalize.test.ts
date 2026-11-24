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
  assert.deepEqual(normalizeIngredients(["Pepper", "vegetable oil", "oil", "Olive Oil"]), ["black pepper", "oil"]);
});

test("plurals and variants of catalog ingredients", () => {
  const cases: Record<string, string> = {
    Onions: "onion", potatoes: "potato", carrots: "carrot", tortillas: "tortilla",
    tomatoes: "tomato", eggs: "egg", "ground beef": "beef",
    "cherry tomatoes": "tomato", cucumbers: "cucumber", "olive oil": "oil",
  };
  for (const [raw, want] of Object.entries(cases)) assert.equal(normalizeIngredient(raw), want);
});

test("bell pepper is not silently turned into black pepper", () => {
  assert.equal(normalizeIngredient("bell pepper"), "bell pepper");
  assert.equal(normalizeIngredient("red peppers"), "red peppers");
});

test("every alias target exists in the catalog", () => {
  const names = new Set(RECIPES.flatMap((r) => r.ingredients.map((i) => i.name)));
  for (const target of Object.values(INGREDIENT_ALIASES)) {
    assert.ok(names.has(target), `missing alias target ${target}`);
  }
});
