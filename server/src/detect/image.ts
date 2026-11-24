import type { SupportedImageType } from "./types.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES: readonly SupportedImageType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export type SniffedType = SupportedImageType | "image/heic";

const HEIC_BRANDS: ReadonlySet<string> = new Set([
  "heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1",
]);

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let s = "";
  for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i] ?? 0);
  return s;
}

/** Signature check only. The image is not decoded. */
export function sniffImageType(bytes: Uint8Array): SniffedType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp" && HEIC_BRANDS.has(ascii(bytes, 8, 12))) {
    return "image/heic";
  }
  return null;
}

/** Strict base64: ASCII whitespace is stripped, then only the standard alphabet with padding. */
export function decodeBase64Image(s: string): Buffer | null {
  const t = s.replace(/[ \t\r\n\f\v]+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t) || t.length % 4 !== 0) return null;
  return Buffer.from(t, "base64");
}
