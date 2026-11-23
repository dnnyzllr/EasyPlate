export const DEFAULT_PORT = 5000;

export function resolvePort(value: string | undefined): number {
  if (value !== undefined && /^\d+$/.test(value)) {
    const n = Number(value);
    if (n >= 1 && n <= 65535) return n;
  }
  if (value !== undefined && value !== "") {
    console.warn(`Invalid PORT "${value}", using ${DEFAULT_PORT}.`);
  }
  return DEFAULT_PORT;
}
