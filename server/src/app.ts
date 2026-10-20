import cors from "cors";
import express from "express";
import { env } from "./env.js";
import { errorHandler } from "./lib/http.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { foodsRouter } from "./routes/foods.js";
import { goalsRouter } from "./routes/goals.js";
import { logsRouter } from "./routes/logs.js";
import { statsRouter } from "./routes/stats.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/foods", requireAuth, foodsRouter);
  app.use("/api/logs", requireAuth, logsRouter);
  app.use("/api/goals", requireAuth, goalsRouter);
  app.use("/api/stats", requireAuth, statsRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(errorHandler);
  return app;
}
