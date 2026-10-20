import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { uid } from "../middleware/auth.js";

export const goalsRouter = Router();
const { goals } = schema;

const DEFAULTS = { calories: 2000, protein: 120, carbs: 220, fat: 70 };

goalsRouter.get("/", async (req, res) => {
  const goal = await db.query.goals.findFirst({ where: eq(goals.userId, uid(req)) });
  res.json(goal ?? { userId: uid(req), ...DEFAULTS });
});

goalsRouter.put("/", async (req, res) => {
  const body = z
    .object({
      calories: z.number().int().min(800, "at least 800").max(10000),
      protein: z.number().int().min(0).max(1000),
      carbs: z.number().int().min(0).max(1500),
      fat: z.number().int().min(0).max(1000),
    })
    .parse(req.body);

  const [goal] = await db
    .insert(goals)
    .values({ userId: uid(req), ...body })
    .onConflictDoUpdate({ target: goals.userId, set: body })
    .returning();
  res.json(goal);
});
