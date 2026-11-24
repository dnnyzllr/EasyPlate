import { createHash } from "node:crypto";
import type { DetectCandidate } from "./contract.js";
import type { DetectInput, Detector, DetectorInfo } from "./types.js";

// Deterministic demo detector. It does not look at image content.

export const FIXTURE_DETECTOR_INFO: DetectorInfo = {
  id: "fixture",
  version: "1.0.0",
  promptVersion: null,
};

export const FIXTURE_POOL: readonly string[] = [
  "Eggs", "milk", "Cheddar", "butter", "Cherry tomatoes", "chicken breast", "broccoli", "carrots",
  "lettuce", "garlic", "onion", "rice", "bread", "yogurt", "spinach", "lemon",
];

export function fixtureCandidates(bytes: Uint8Array): DetectCandidate[] {
  const d = createHash("sha256").update(bytes).digest();
  const byte = (i: number): number => d[i] ?? 0;
  const count = 3 + (byte(0) % 3);
  const picked: string[] = [];
  for (let i = 1; i <= 15 && picked.length < count; i++) {
    const name = FIXTURE_POOL[byte(i) % 16] as string;
    if (!picked.includes(name)) picked.push(name);
  }
  for (const name of FIXTURE_POOL) {
    if (picked.length >= count) break;
    if (!picked.includes(name)) picked.push(name);
  }
  return picked.map((name, k) => {
    const r = byte(16 + k) / 255;
    const c = k < count - 1 ? 0.55 + r * 0.4 : 0.2 + r * 0.25;
    return { name, confidence: Math.round(c * 100) / 100 };
  });
}

export function createFixtureDetector(): Detector {
  return {
    info: FIXTURE_DETECTOR_INFO,
    async detect(input: DetectInput): Promise<DetectCandidate[]> {
      return fixtureCandidates(input.bytes);
    },
  };
}
