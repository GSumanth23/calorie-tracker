/**
 * Seeds a starter set of common foods so search works even before you add a USDA key.
 * Values are approximate, based on USDA FoodData Central reference entries.
 * Run with: npm run db:seed   (safe to re-run; existing rows are updated)
 */
import { sql } from "drizzle-orm";
import { db, pool, schema } from "./index.js";

type SeedFood = [key: string, name: string, size: number, unit: string, kcal: number, p: number, c: number, f: number];

const SEED: SeedFood[] = [
  ["egg-large", "Egg, whole, large", 1, "egg (50 g)", 72, 6.3, 0.4, 4.8],
  ["egg-white", "Egg white, large", 1, "egg white (33 g)", 17, 3.6, 0.2, 0.1],
  ["oats", "Oats, rolled, dry", 40, "g", 152, 5.3, 27, 2.6],
  ["banana", "Banana, medium", 1, "banana (118 g)", 105, 1.3, 27, 0.4],
  ["apple", "Apple, medium", 1, "apple (182 g)", 95, 0.5, 25, 0.3],
  ["blueberries", "Blueberries, raw", 100, "g", 57, 0.7, 14.5, 0.3],
  ["greek-yogurt", "Greek yogurt, plain, nonfat", 170, "g", 100, 17, 6, 0.7],
  ["milk-2", "Milk, 2% reduced fat", 1, "cup (244 g)", 122, 8.1, 11.7, 4.8],
  ["whole-wheat-bread", "Bread, whole wheat", 1, "slice (32 g)", 81, 4, 13.8, 1.1],
  ["peanut-butter", "Peanut butter, smooth", 2, "tbsp (32 g)", 191, 7.1, 7.1, 16.4],
  ["almonds", "Almonds", 28, "g", 164, 6, 6.1, 14.2],
  ["chicken-breast", "Chicken breast, skinless, cooked", 100, "g", 165, 31, 0, 3.6],
  ["salmon", "Salmon, Atlantic, cooked", 100, "g", 206, 22, 0, 12.4],
  ["ground-beef-90", "Ground beef, 90% lean, cooked", 100, "g", 217, 26, 0, 11.8],
  ["tofu-firm", "Tofu, firm", 100, "g", 144, 17.3, 2.8, 8.7],
  ["paneer", "Paneer", 100, "g", 321, 25, 3.6, 25],
  ["white-rice", "Rice, white, cooked", 1, "cup (158 g)", 205, 4.3, 44.5, 0.4],
  ["brown-rice", "Rice, brown, cooked", 1, "cup (195 g)", 248, 5.5, 51.7, 2],
  ["pasta", "Pasta, cooked", 1, "cup (140 g)", 221, 8.1, 43.2, 1.3],
  ["roti", "Roti / chapati, whole wheat", 1, "roti (40 g)", 120, 3.1, 18, 3.7],
  ["dal", "Dal (lentils), cooked", 1, "cup (198 g)", 230, 17.9, 39.9, 0.8],
  ["chickpeas", "Chickpeas, cooked", 1, "cup (164 g)", 269, 14.5, 45, 4.2],
  ["black-beans", "Black beans, cooked", 1, "cup (172 g)", 227, 15.2, 40.8, 0.9],
  ["potato", "Potato, baked, with skin", 1, "medium (173 g)", 161, 4.3, 36.6, 0.2],
  ["sweet-potato", "Sweet potato, baked", 1, "medium (114 g)", 103, 2.3, 23.6, 0.2],
  ["broccoli", "Broccoli, cooked", 1, "cup (156 g)", 55, 3.7, 11.2, 0.6],
  ["spinach", "Spinach, raw", 1, "cup (30 g)", 7, 0.9, 1.1, 0.1],
  ["avocado", "Avocado", 0.5, "avocado (100 g)", 160, 2, 8.5, 14.7],
  ["olive-oil", "Olive oil", 1, "tbsp (13.5 g)", 119, 0, 0, 13.5],
  ["cheddar", "Cheddar cheese", 28, "g", 114, 7, 0.4, 9.4],
  ["whey", "Whey protein powder", 1, "scoop (30 g)", 120, 24, 3, 1.5],
  ["coffee-black", "Coffee, black", 1, "cup (240 ml)", 2, 0.3, 0, 0],
];

async function main() {
  const rows = SEED.map(([key, name, servingSize, servingUnit, calories, protein, carbs, fat]) => ({
    source: "SEED" as const,
    externalId: key,
    name,
    servingSize,
    servingUnit,
    calories,
    protein,
    carbs,
    fat,
  }));

  await db
    .insert(schema.foods)
    .values(rows)
    .onConflictDoUpdate({
      target: [schema.foods.source, schema.foods.externalId],
      set: {
        name: sql`excluded.name`,
        servingSize: sql`excluded.serving_size`,
        servingUnit: sql`excluded.serving_unit`,
        calories: sql`excluded.calories`,
        protein: sql`excluded.protein`,
        carbs: sql`excluded.carbs`,
        fat: sql`excluded.fat`,
      },
    });

  console.log(`Seeded ${rows.length} common foods.`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
