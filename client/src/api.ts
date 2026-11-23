// Mirrors server/src/recipes/types.ts. Keep in sync.
export interface RecipeIngredient {
  name: string
  quantity?: string
}

export interface Recipe {
  id: string
  title: string
  totalMinutes: number
  ingredients: RecipeIngredient[]
  steps: string[]
}

export interface RecipeMatch extends Recipe {
  matched: string[]
  missing: string[]
  staples: RecipeIngredient[]
}

export interface MatchResponse {
  recipes: RecipeMatch[]
}

export interface ErrorResponse {
  error: string
}

export const MATCH_URL = '/api/recipes/match'

export type ApiErrorKind = 'unreachable' | 'rejected' | 'server'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
  }
}

const UNREACHABLE =
  "Can't reach the EasyPlate server. Make sure it's running on port 5000, then try again."

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return undefined
  }
}

function errorText(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error: unknown }).error
    if (typeof e === 'string' && e !== '') return e
  }
  return undefined
}

export async function matchRecipes(
  ingredients: readonly string[],
): Promise<RecipeMatch[]> {
  let res: Response
  try {
    res = await fetch(MATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ingredients }),
    })
  } catch {
    throw new ApiError('unreachable', UNREACHABLE)
  }

  const body = await readJson(res)

  if (res.ok) {
    if (body && typeof body === 'object' && Array.isArray((body as MatchResponse).recipes)) {
      return (body as MatchResponse).recipes
    }
    throw new ApiError('server', 'The server sent an unexpected response.')
  }

  const message = errorText(body)
  if (res.status >= 400 && res.status < 500 && message) {
    throw new ApiError('rejected', message)
  }
  if (!message && [500, 502, 503, 504].includes(res.status)) {
    throw new ApiError('unreachable', UNREACHABLE)
  }
  throw new ApiError(
    'server',
    `The server returned an error (HTTP ${res.status}). Please try again.`,
  )
}
