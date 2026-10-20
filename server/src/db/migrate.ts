/**
 * Production startup step (`npm start` runs this before the server):
 * applies any pending migrations from ./drizzle, then loads the built-in foods.
 * Both steps are safe to repeat on every deploy.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index.js";
import { seedFoods } from "./seed.js";

// Works from both src/db (tsx) and dist/db (compiled): the migrations live in server/drizzle.
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "../../drizzle");

try {
  await migrate(db, { migrationsFolder });
  console.log("Database migrations are up to date.");
  console.log(`Seeded ${await seedFoods()} common foods.`);
} catch (err) {
  console.error("Database setup failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
