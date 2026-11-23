import cors from "cors";
import express from "express";
import type { ErrorRequestHandler, Express } from "express";
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

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.send("EasyPlate API is running");
  });

  app.use("/api/recipes", recipesRouter);
  app.use(errorHandler);
  return app;
}
