import type { RecipeMatch } from '../api.ts'

export function stapleNames(r: RecipeMatch): string[] {
  const staples: unknown = (r as { staples?: unknown }).staples
  if (!Array.isArray(staples)) return []
  const names: string[] = []
  for (const s of staples as unknown[]) {
    if (typeof s === 'string') names.push(s)
    else if (s && typeof s === 'object' && typeof (s as { name?: unknown }).name === 'string') {
      names.push((s as { name: string }).name)
    }
  }
  return names
}
