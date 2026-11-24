import { Router } from "express";
import { matchRecipes } from "../recipes/match.js";
import { normalizeIngredients } from "../recipes/normalize.js";
import type { ErrorResponse, MatchResponse } from "../recipes/types.js";

export const MAX_INGREDIENTS = 50;

export type ParsedMatchRequest =
  | { ok: true; ingredients: string[] }
  | { ok: false; error: string };

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function parseMatchRequest(body: unknown): ParsedMatchRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      error: 'Request body must be a JSON object like {"ingredients":["chicken"]}.',
    };
  }
  const list = (body as Record<string, unknown>)["ingredients"];
  if (!Array.isArray(list)) {
    return { ok: false, error: '"ingredients" must be an array of strings.' };
  }
  if (list.length > MAX_INGREDIENTS) {
    return {
      ok: false,
      error: `"ingredients" may contain at most ${MAX_INGREDIENTS} items.`,
    };
  }
  for (let i = 0; i < list.length; i++) {
    if (typeof list[i] !== "string") {
      return {
        ok: false,
        error: `"ingredients" must contain only strings (item ${i} is ${typeName(list[i])}).`,
      };
    }
  }
  const ingredients = normalizeIngredients(list as string[]);
  if (ingredients.length === 0) {
    return { ok: false, error: "Add at least one ingredient." };
  }
  return { ok: true, ingredients };
}

export const recipesRouter: Router = Router();

recipesRouter.post("/match", (req, res) => {
  const parsed = parseMatchRequest(req.body);
  if (!parsed.ok) {
    const body: ErrorResponse = { error: parsed.error };
    res.status(400).json(body);
    return;
  }
  const body: MatchResponse = { recipes: matchRecipes(parsed.ingredients) };
  res.json(body);
});
