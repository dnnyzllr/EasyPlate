import { createFixtureDetector } from "./fixture.js";
import type { Detector } from "./types.js";

export const DEFAULT_DETECTOR_ID = "fixture";

// Provider seam. To add a real detector:
//   1. Write a factory that returns a Detector (see ./types.ts) and add a case below.
//   2. Read any credential from process.env inside that factory only. Credentials stay on
//      the server: never send them to clients, and never log them.
//   3. A real provider receives the photo. Get the owner's approval before enabling one
//      or sending any real photo to it.
export function createDetector(id: string | undefined): Detector {
  const key = id === undefined || id === "" ? DEFAULT_DETECTOR_ID : id;
  switch (key) {
    case "fixture":
      return createFixtureDetector();
    default:
      throw new Error(`Unknown DETECTOR "${key}". Supported: fixture.`);
  }
}
