export type ApiConfig =
  | { ok: true; baseUrl: string; isLoopback: boolean }
  | { ok: false; reason: 'missing' | 'invalid'; raw: string };

export function parseApiUrl(raw: string | undefined): ApiConfig {
  const value = (raw ?? '').trim();
  if (value === '') return { ok: false, reason: 'missing', raw: '' };
  const m = /^https?:\/\/([^\s/?#]+)/i.exec(value);
  if (!m) return { ok: false, reason: 'invalid', raw: value };
  const baseUrl = value.replace(/\/+$/, '');
  const hostPort = m[1].toLowerCase();
  const host = hostPort.startsWith('[')
    ? hostPort.slice(0, hostPort.indexOf(']') + 1)
    : hostPort.split(':')[0];
  const isLoopback =
    host === 'localhost' || host === '0.0.0.0' || host === '[::1]' || /^127\./.test(host);
  return { ok: true, baseUrl, isLoopback };
}

// The only place in src/ that reads process.env. Dot access so Metro inlines it.
export const API_CONFIG: ApiConfig = parseApiUrl(process.env.EXPO_PUBLIC_API_URL);
