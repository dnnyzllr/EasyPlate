import { createApp } from "./app.js";
import { resolvePort } from "./config.js";
import { createDetector } from "./detect/registry.js";
import type { Detector } from "./detect/types.js";

const port = resolvePort(process.env["PORT"]);

let detector: Detector;
try {
  detector = createDetector(process.env["DETECTOR"]);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

createApp({ detector }).listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Detector: ${detector.info.id} ${detector.info.version}`);
});
