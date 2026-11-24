export function normalizeEntry(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function addEntries(current: readonly string[], raw: string): string[] {
  const result = [...current]
  for (const part of raw.split(',')) {
    const entry = normalizeEntry(part)
    if (entry !== '' && !result.includes(entry)) result.push(entry)
  }
  return result
}

export function removeEntry(current: readonly string[], name: string): string[] {
  return current.filter((item) => item !== name)
}
