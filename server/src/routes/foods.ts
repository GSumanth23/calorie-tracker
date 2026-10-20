import { and, desc, eq, ilike, inArray, max, or, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { HttpError } from "../lib/http.js";
import { searchUsda } from "../lib/usda.js";
import { uid } from "../middleware/auth.js";

export const foodsRouter = Router();
const { foods, foodLogs } = schema;

const FoodInput = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80).nullish(),
  servingSize: z.number().positive().max(10000),
  servingUnit: z.string().trim().min(1).max(40),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
});

/** Foods this user may see: built-in, cached USDA, and their own custom foods. */
const visibleTo = (userId: string) =>
  or(inArray(foods.source, ["SEED", "USDA"]), and(eq(foods.source, "CUSTOM"), eq(foods.userId, userId)));

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

// GET /api/foods/search?q=chicken  → { local: Food[], usda: NormalizedFood[], usdaError?: string }
foodsRouter.get("/search", async (req, res) => {
  const q = z.string().trim().min(2).max(80).parse(req.query.q);
  const words = q.split(/\s+/).slice(0, 5);

  const localPromise = db
    .select()
    .from(foods)
    .where(and(visibleTo(uid(req)), ...words.map((w) => ilike(foods.name, `%${escapeLike(w)}%`))))
    // custom foods first, then shorter (more generic) names
    .orderBy(sql`case when ${foods.source} = 'CUSTOM' then 0 when ${foods.source} = 'SEED' then 1 else 2 end`, sql`length(${foods.name})`)
    .limit(10);

  const [local, usda] = await Promise.allSettled([localPromise, searchUsda(q)]);
  if (local.status === "rejected") throw local.reason;

  // Hide USDA results we already have cached locally.
  const cachedIds = new Set(local.value.filter((f) => f.source === "USDA").map((f) => f.externalId));
  res.json({
    local: local.value,
    usda: usda.status === "fulfilled" ? usda.value.filter((f) => !cachedIds.has(f.externalId)) : [],
    usdaError: usda.status === "rejected" ? String((usda.reason as Error).message) : undefined,
  });
});

// POST /api/foods/usda  → cache a USDA search result so it can be logged
foodsRouter.post("/usda", async (req, res) => {
  const body = FoodInput.extend({ externalId: z.string().regex(/^\d+$/) }).parse(req.body);
  const [food] = await db
    .insert(foods)
    .values({ ...body, brand: body.brand ?? null, source: "USDA" })
    .onConflictDoUpdate({ target: [foods.source, foods.externalId], set: { name: body.name } })
    .returning();
  res.status(201).json(food);
});

// GET /api/foods/recent  → foods this user logged most recently (for one-tap re-logging)
foodsRouter.get("/recent", async (req, res) => {
  const recent = await db
    .select({ food: foods, lastUsed: max(foodLogs.createdAt) })
    .from(foodLogs)
    .innerJoin(foods, eq(foodLogs.foodId, foods.id))
    .where(eq(foodLogs.userId, uid(req)))
    .groupBy(foods.id)
    .orderBy(desc(max(foodLogs.createdAt)))
    .limit(8);
  res.json(recent.map((r) => r.food));
});

// Custom foods CRUD
foodsRouter.get("/mine", async (req, res) => {
  const mine = await db
    .select()
    .from(foods)
    .where(and(eq(foods.source, "CUSTOM"), eq(foods.userId, uid(req))))
    .orderBy(foods.name);
  res.json(mine);
});

foodsRouter.post("/", async (req, res) => {
  const body = FoodInput.parse(req.body);
  const [food] = await db
    .insert(foods)
    .values({ ...body, brand: body.brand ?? null, source: "CUSTOM", userId: uid(req) })
    .returning();
  res.status(201).json(food);
});

const ownCustom = (id: string, userId: string) =>
  and(eq(foods.id, id), eq(foods.source, "CUSTOM"), eq(foods.userId, userId));

foodsRouter.put("/:id", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const body = FoodInput.parse(req.body);
  const [food] = await db
    .update(foods)
    .set({ ...body, brand: body.brand ?? null })
    .where(ownCustom(id, uid(req)))
    .returning();
  if (!food) throw new HttpError(404, "Food not found");
  res.json(food);
});

foodsRouter.delete("/:id", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const deleted = await db.delete(foods).where(ownCustom(id, uid(req))).returning({ id: foods.id });
  if (!deleted.length) throw new HttpError(404, "Food not found");
  res.status(204).end();
});

export { visibleTo };
