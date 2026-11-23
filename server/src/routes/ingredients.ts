import express, { Router } from "express";
import { normalizeCandidates } from "../detect/candidates.js";
import type { DetectCandidate, DetectResponse } from "../detect/contract.js";
import { MAX_IMAGE_BYTES, SUPPORTED_IMAGE_TYPES, decodeBase64Image, sniffImageType } from "../detect/image.js";
import type { Detector, SupportedImageType } from "../detect/types.js";
import type { ErrorResponse } from "../recipes/types.js";

// 5 MiB of image is about 6.99M base64 chars. 8 MB leaves room so the handler can
// answer with a specific 413 message about the decoded size.
export const DETECT_BODY_LIMIT = "8mb";

export type ParsedDetectRequest =
  | { ok: true; bytes: Buffer; mimeType: SupportedImageType }
  | { ok: false; status: 400 | 413 | 415; error: string };

const fail = (status: 400 | 413 | 415, error: string): ParsedDetectRequest => ({ ok: false, status, error });

export function parseDetectRequest(body: unknown): ParsedDetectRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail(400, 'Request body must be a JSON object like {"image":"<base64>"}.');
  }
  const obj = body as Record<string, unknown>;
  const image = obj["image"];
  if (typeof image !== "string") return fail(400, '"image" must be a base64-encoded string.');
  if (image.trim() === "") return fail(400, '"image" is empty.');
  const bytes = decodeBase64Image(image);
  if (bytes === null) return fail(400, '"image" is not valid base64.');
  if (bytes.length === 0) return fail(400, '"image" is empty.');
  if (bytes.length > MAX_IMAGE_BYTES) return fail(413, "Image is larger than 5 MB. Use a smaller photo.");
  const sniffed = sniffImageType(bytes);
  if (sniffed === "image/heic") return fail(415, "HEIC images aren't supported. Send JPEG, PNG or WebP.");
  if (sniffed === null) return fail(415, "Unsupported image type. Send JPEG, PNG or WebP.");
  const declared = obj["mimeType"];
  if (declared !== undefined) {
    if (typeof declared !== "string" || !(SUPPORTED_IMAGE_TYPES as readonly string[]).includes(declared)) {
      return fail(415, '"mimeType" must be image/jpeg, image/png or image/webp.');
    }
    if (declared !== sniffed) return fail(415, `"mimeType" says ${declared} but the image is ${sniffed}.`);
  }
  return { ok: true, bytes, mimeType: sniffed };
}

export function createIngredientsRouter(detector: Detector): Router {
  const router = Router();
  router.post("/detect", express.json({ limit: DETECT_BODY_LIMIT }), async (req, res) => {
    const send = (status: number, error: string) => {
      const body: ErrorResponse = { error };
      res.status(status).json(body);
    };
    const noBody =
      Number(req.headers["content-length"] ?? 0) === 0 && req.headers["transfer-encoding"] === undefined;
    const t = req.is("application/json");
    if (noBody || t === null) {
      send(400, 'Request body is empty. Send {"image":"<base64>"}.');
      return;
    }
    if (t === false) {
      send(415, 'Send JSON: Content-Type: application/json with {"image":"<base64>"}.');
      return;
    }
    const parsed = parseDetectRequest(req.body);
    if (!parsed.ok) {
      send(parsed.status, parsed.error);
      return;
    }
    let raw: DetectCandidate[];
    try {
      raw = await detector.detect({ bytes: parsed.bytes, mimeType: parsed.mimeType });
    } catch (err) {
      // Message only: never log the input.
      console.error("Detector failed:", err instanceof Error ? err.message : "unknown error");
      send(502, "Ingredient detection failed. Try again or type your ingredients.");
      return;
    }
    const body: DetectResponse = {
      candidates: normalizeCandidates(raw),
      detector: { id: detector.info.id, version: detector.info.version },
    };
    res.json(body);
  });
  return router;
}
