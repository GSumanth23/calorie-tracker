import { and, between, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { isoDate } from "../lib/http.js";
import { uid } from "../middleware/auth.js";

export const statsRouter = Router();
const { foodLogs } = schema;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// GET /api/stats/range?end=2026-10-19&days=7  → one row per day (zeros for empty days)
statsRouter.get("/range", async (req, res) => {
  const end = isoDate.parse(req.query.end);
  const days = z.coerce.number().int().min(1).max(90).default(7).parse(req.query.days);
  const start = addDays(end, -(days - 1));

  const rows = await db
    .select({
      date: foodLogs.date,
      calories: sql<number>`coalesce(sum(${foodLogs.calories}), 0)::float`,
      protein: sql<number>`coalesce(sum(${foodLogs.protein}), 0)::float`,
      carbs: sql<number>`coalesce(sum(${foodLogs.carbs}), 0)::float`,
      fat: sql<number>`coalesce(sum(${foodLogs.fat}), 0)::float`,
    })
    .from(foodLogs)
    .where(and(eq(foodLogs.userId, uid(req)), between(foodLogs.date, start, end)))
    .groupBy(foodLogs.date);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const series = Array.from({ length: days }, (_, i) => {
    const date = addDays(start, i);
    const r = byDate.get(date);
    return {
      date,
      calories: Math.round(r?.calories ?? 0),
      protein: Math.round(r?.protein ?? 0),
      carbs: Math.round(r?.carbs ?? 0),
      fat: Math.round(r?.fat ?? 0),
      logged: Boolean(r),
    };
  });
  res.json(series);
});
