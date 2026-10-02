import cors from "cors";
import express from "express";

import { config } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createRankingRouter } from "./routes/ranking.js";
import { createWoodRouter } from "./routes/woods.js";

/**
 * Build the Express application.
 *
 * Takes the repository as an argument (dependency injection) so tests can
 * use the in-memory adapter and the production bootstrap can use MySQL. The
 * original `index.js` created the app, wired routes and called `listen` in
 * the same file, which made it untestable without opening a port.
 */
export function createApp(repository) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/tooling requests (curl, supertest) arrive without an Origin header.
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`origin '${origin}' is not allowed by CORS`));
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", storage: repository.kind, env: config.env });
  });

  app.use("/api/woods", createWoodRouter(repository));
  app.use("/api/ranking", createRankingRouter(repository));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
