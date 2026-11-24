import type { DetectCandidate, DetectResponse } from '../detectTypes';
import type { RecipeIngredient, RecipeMatch } from '../types';

export const MATCH_PATH = '/api/recipes/match';
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DETECT_PATH = '/api/ingredients/detect';
export const DETECT_TIMEOUT_MS = 30_000;

export type ApiErrorKind = 'unreachable' | 'timeout' | 'rejected' | 'server';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

const UNEXPECTED = 'The server sent an unexpected response.';

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function asIngredients(v: unknown): RecipeIngredient[] {
  if (!Array.isArray(v)) return [];
  const out: RecipeIngredient[] = [];
  for (const i of v) {
    if (typeof i === 'object' && i !== null && typeof (i as { name?: unknown }).name === 'string') {
      const q = (i as { quantity?: unknown }).quantity;
      out.push(
        typeof q === 'string'
          ? { name: (i as { name: string }).name, quantity: q }
          : { name: (i as { name: string }).name },
      );
    }
  }
  return out;
}

function normalizeRecipe(raw: unknown): RecipeMatch {
  if (typeof raw !== 'object' || raw === null) throw new ApiError('server', UNEXPECTED);
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string') {
    throw new ApiError('server', UNEXPECTED);
  }
  return {
    id: r.id,
    title: r.title,
    totalMinutes: typeof r.totalMinutes === 'number' ? r.totalMinutes : 0,
    ingredients: asIngredients(r.ingredients),
    steps: asStringArray(r.steps),
    matched: asStringArray(r.matched),
    missing: asStringArray(r.missing),
    staples: asIngredients(r.staples),
  };
}

/** POSTs JSON and returns the parsed body of a 2xx response. Throws ApiError otherwise. */
async function postJson(
  baseUrl: string,
  path: string,
  payload: unknown,
  timeoutMs: number,
  fetchImpl: typeof fetch | undefined,
): Promise<unknown> {
  const doFetch = fetchImpl ?? fetch;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const timeoutError = () =>
    new ApiError('timeout', `The server didn't answer within ${Math.round(timeoutMs / 1000)} seconds.`);

  try {
    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch {
      throw timedOut ? timeoutError() : new ApiError('unreachable', "Can't reach the EasyPlate server.");
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      if (timedOut) throw timeoutError();
      body = undefined;
    }

    if (res.ok) return body;
    if (res.status >= 400 && res.status < 500) {
      const msg =
        typeof body === 'object' && body !== null ? (body as { error?: unknown }).error : undefined;
      if (typeof msg === 'string' && msg.trim() !== '') throw new ApiError('rejected', msg);
    }
    throw new ApiError(
      'server',
      `The server returned an error (HTTP ${res.status}). Please try again.`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function matchRecipes(
  baseUrl: string,
  ingredients: readonly string[],
  options?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<RecipeMatch[]> {
  const body = await postJson(
    baseUrl,
    MATCH_PATH,
    { ingredients },
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options?.fetchImpl,
  );
  const list =
    typeof body === 'object' && body !== null ? (body as { recipes?: unknown }).recipes : undefined;
  if (!Array.isArray(list)) throw new ApiError('server', UNEXPECTED);
  return list.map(normalizeRecipe);
}

export async function detectIngredients(
  baseUrl: string,
  image: { base64: string; mimeType?: string },
  options?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<DetectResponse> {
  const payload: { image: string; mimeType?: string } = { image: image.base64 };
  if (image.mimeType !== undefined) payload.mimeType = image.mimeType;
  const body = await postJson(
    baseUrl,
    DETECT_PATH,
    payload,
    options?.timeoutMs ?? DETECT_TIMEOUT_MS,
    options?.fetchImpl,
  );
  const b = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const det = b.detector;
  if (
    !Array.isArray(b.candidates) ||
    typeof det !== 'object' ||
    det === null ||
    typeof (det as { id?: unknown }).id !== 'string'
  ) {
    throw new ApiError('server', UNEXPECTED);
  }
  const candidates: DetectCandidate[] = [];
  for (const c of b.candidates as unknown[]) {
    if (typeof c !== 'object' || c === null) continue;
    const { name, confidence } = c as { name?: unknown; confidence?: unknown };
    if (typeof name === 'string' && typeof confidence === 'number' && Number.isFinite(confidence)) {
      candidates.push({ name, confidence });
    }
  }
  const v = (det as { version?: unknown }).version;
  return {
    candidates,
    detector: { id: (det as { id: string }).id, version: typeof v === 'string' ? v : '' },
  };
}
