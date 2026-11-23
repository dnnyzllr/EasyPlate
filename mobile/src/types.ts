// Mirror of server/src/recipes/types.ts. Keep server, client/src/api.ts and this file in sync.
export interface RecipeIngredient {
  name: string;
  quantity?: string;
}

export interface Recipe {
  id: string;
  title: string;
  totalMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
}

export interface RecipeMatch extends Recipe {
  matched: string[];
  missing: string[];
  staples: RecipeIngredient[];
}

export interface MatchResponse {
  recipes: RecipeMatch[];
}

export interface ErrorResponse {
  error: string;
}
