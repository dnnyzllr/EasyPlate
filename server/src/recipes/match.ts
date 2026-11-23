import { RECIPES } from "./catalog.js";
import { isStaple, normalizeIngredients } from "./normalize.js";
import type { Recipe, RecipeMatch } from "./types.js";

export const MAX_RESULTS = 3;

export function matchRecipes(
  ingredients: readonly string[],
  catalog: readonly Recipe[] = RECIPES,
): RecipeMatch[] {
  const have = new Set(normalizeIngredients(ingredients));
  const results: RecipeMatch[] = [];

  for (const recipe of catalog) {
    const matched: string[] = [];
    const missing: string[] = [];
    const staples = recipe.ingredients.filter((i) => isStaple(i.name)).map((i) => ({ ...i }));
    for (const ing of recipe.ingredients) {
      if (isStaple(ing.name)) continue;
      (have.has(ing.name) ? matched : missing).push(ing.name);
    }
    if (matched.length === 0) continue;
    results.push({
      ...recipe,
      ingredients: recipe.ingredients.map((i) => ({ ...i })),
      steps: [...recipe.steps],
      matched,
      missing,
      staples,
    });
  }

  results.sort((a, b) => {
    // Staples are excluded. Compare matched/required shares exactly by cross-multiplying.
    const shareA = a.matched.length * (b.matched.length + b.missing.length);
    const shareB = b.matched.length * (a.matched.length + a.missing.length);
    if (shareA !== shareB) return shareB - shareA;
    if (a.matched.length !== b.matched.length) {
      return b.matched.length - a.matched.length;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return results.slice(0, MAX_RESULTS);
}
