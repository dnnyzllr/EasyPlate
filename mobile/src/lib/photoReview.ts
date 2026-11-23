import type { DetectCandidate } from '../detectTypes';
import { normalizeEntry } from './ingredients';

export const LOW_CONFIDENCE = 0.5;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface ReviewItem {
  name: string;
  confidence: number | null;
  selected: boolean;
  source: 'photo' | 'added';
  alreadyInList: boolean;
}

export function initReview(
  candidates: readonly DetectCandidate[],
  existing: readonly string[],
): ReviewItem[] {
  const seen = new Set<string>();
  const items: ReviewItem[] = [];
  for (const c of candidates) {
    const name = normalizeEntry(c.name);
    if (name === '' || seen.has(name)) continue;
    seen.add(name);
    items.push({
      name,
      confidence: c.confidence,
      selected: c.confidence >= LOW_CONFIDENCE,
      source: 'photo',
      alreadyInList: existing.includes(name),
    });
  }
  return items;
}

export function toggleItem(items: readonly ReviewItem[], name: string): ReviewItem[] {
  return items.map((i) => (i.name === name ? { ...i, selected: !i.selected } : i));
}

export function removeItem(items: readonly ReviewItem[], name: string): ReviewItem[] {
  return items.filter((i) => i.name !== name);
}

export function addMissed(
  items: readonly ReviewItem[],
  raw: string,
  existing: readonly string[],
): ReviewItem[] {
  let next = items.map((i) => ({ ...i }));
  for (const part of raw.split(',')) {
    const name = normalizeEntry(part);
    if (name === '') continue;
    const found = next.find((i) => i.name === name);
    if (found) {
      found.selected = true;
    } else {
      next = [
        ...next,
        { name, confidence: null, selected: true, source: 'added', alreadyInList: existing.includes(name) },
      ];
    }
  }
  return next;
}

export function confirmedNames(items: readonly ReviewItem[]): string[] {
  return items.filter((i) => i.selected).map((i) => i.name);
}

export function isLowQuality(candidates: readonly DetectCandidate[]): boolean {
  return !candidates.some((c) => c.confidence >= LOW_CONFIDENCE);
}

export function base64ByteLength(b64: string): number {
  const len = b64.length;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}
