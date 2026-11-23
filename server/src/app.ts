import cors from "cors";
import express from "express";
import type { ErrorRequestHandler, Express } from "express";
import { createFixtureDetector } from "./detect/fixture.js";
import type { Detector } from "./detect/types.js";
import { createIngredientsRouter } from "./routes/ingredients.js";
import { recipesRouter } from "./routes/recipes.js";

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const e = (err ?? {}) as {
    status?: unknown;
    statusCode?: unknown;
    type?: unknown;
    message?: unknown;
  };
  const status = e.status ?? e.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    let message: string;
    if (e.type === "entity.parse.failed") message = "Malformed JSON in request body.";
    else if (e.type === "entity.too.large") message = "Request body is too large.";
    else message = typeof e.message === "string" && e.message ? e.message : "Bad request.";
    res.status(status).json({ error: message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
};

export interface AppOptions {
  detector?: Detector;
}

export function createApp(options: AppOptions = {}): Express {
  const detector = options.detector ?? createFixtureDetector();
  const app = express();
  app.use(cors());
  // Mounted before the global parser: it carries its own larger body limit for photos,
  // and the global 100 KB parser would reject them first.
  app.use("/api/ingredients", createIngredientsRouter(detector));
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.send("EasyPlate API is running");
  });

  app.use("/api/recipes", recipesRouter);
  app.use(errorHandler);
  return app;
}
