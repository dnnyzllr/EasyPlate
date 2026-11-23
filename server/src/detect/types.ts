import type { DetectCandidate } from "./contract.js";

export type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

export interface DetectorInfo {
  id: string;
  version: string;
  promptVersion: string | null;
}

export interface DetectInput {
  bytes: Buffer;
  mimeType: SupportedImageType;
}

export interface Detector {
  readonly info: DetectorInfo;
  /** Raw, un-normalized names are allowed; the route normalizes them. */
  detect(input: DetectInput): Promise<DetectCandidate[]>;
}
