import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { HttpError, isoDate } from "../lib/http.js";
import { uid } from "../middleware/auth.js";
import { visibleTo } from "./foods.js";

export const logsRouter = Router();
const { foods, foodLogs } = schema;

const MealEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
const Servings = z.number().positive().max(100);

// GET /api/logs?date=2026-10-19
logsRouter.get("/", async (req, res) => {
  const date = isoDate.parse(req.query.date);
  const rows = await db
    .select()
    .from(foodLogs)
    .where(and(eq(foodLogs.userId, uid(req)), eq(foodLogs.date, date)))
    .orderBy(asc(foodLogs.createdAt));
  res.json(rows);
});

// POST /api/logs { foodId, servings, meal, date }
logsRouter.post("/", async (req, res) => {
  const body = z
    .object({ foodId: z.uuid(), servings: Servings, meal: MealEnum, date: isoDate })
    .parse(req.body);

  const food = await db.query.foods.findFirst({
    where: and(eq(foods.id, body.foodId), visibleTo(uid(req))),
  });
  if (!food) throw new HttpError(404, "Food not found");

  const [log] = await db
    .insert(foodLogs)
    .values({
      userId: uid(req),
      foodId: food.id,
      date: body.date,
      meal: body.meal,
      servings: body.servings,
      foodName: food.brand ? `${food.name} (${food.brand})` : food.name,
      serving: `${food.servingSize} ${food.servingUnit}`,
      // stored unrounded so later servings edits rescale exactly; clients round for display
      calories: food.calories * body.servings,
      protein: food.protein * body.servings,
      carbs: food.carbs * body.servings,
      fat: food.fat * body.servings,
    })
    .returning();
  res.status(201).json(log);
});

// PATCH /api/logs/:id { servings?, meal? }  — rescales the snapshotted totals
logsRouter.patch("/:id", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const body = z.object({ servings: Servings.optional(), meal: MealEnum.optional() }).parse(req.body);

  const existing = await db.query.foodLogs.findFirst({
    where: and(eq(foodLogs.id, id), eq(foodLogs.userId, uid(req))),
  });
  if (!existing) throw new HttpError(404, "Entry not found");

  const scale = body.servings ? body.servings / existing.servings : 1;
  const [log] = await db
    .update(foodLogs)
    .set({
      meal: body.meal ?? existing.meal,
      servings: body.servings ?? existing.servings,
      calories: existing.calories * scale,
      protein: existing.protein * scale,
      carbs: existing.carbs * scale,
      fat: existing.fat * scale,
    })
    .where(eq(foodLogs.id, id))
    .returning();
  res.json(log);
});

logsRouter.delete("/:id", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const deleted = await db
    .delete(foodLogs)
    .where(and(eq(foodLogs.id, id), eq(foodLogs.userId, uid(req))))
    .returning({ id: foodLogs.id });
  if (!deleted.length) throw new HttpError(404, "Entry not found");
  res.status(204).end();
});
