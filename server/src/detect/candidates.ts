import { normalizeIngredient } from "../recipes/normalize.js";
import type { DetectCandidate } from "./contract.js";

export const MAX_CANDIDATES = 20;

export function normalizeCandidates(raw: readonly DetectCandidate[]): DetectCandidate[] {
  const best = new Map<string, number>();
  for (const item of raw) {
    if (typeof item?.name !== "string" || typeof item.confidence !== "number") continue;
    if (!Number.isFinite(item.confidence)) continue;
    const name = normalizeIngredient(item.name);
    if (name === "") continue;
    const c = Math.round(Math.min(1, Math.max(0, item.confidence)) * 100) / 100;
    const prev = best.get(name);
    if (prev === undefined || c > prev) best.set(name, c);
  }
  return [...best.entries()]
    .map(([name, confidence]) => ({ name, confidence }))
    .sort((a, b) => b.confidence - a.confidence || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, MAX_CANDIDATES);
}
