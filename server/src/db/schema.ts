import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const foodSource = pgEnum("food_source", ["SEED", "USDA", "CUSTOM"]);
export const meal = pgEnum("meal", ["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  calories: integer("calories").notNull().default(2000),
  protein: integer("protein").notNull().default(120),
  carbs: integer("carbs").notNull().default(220),
  fat: integer("fat").notNull().default(70),
});

/** Nutrition values are per ONE serving (servingSize + servingUnit). */
export const foods = pgTable(
  "foods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: foodSource("source").notNull(),
    externalId: text("external_id"), // USDA fdcId or seed key
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // CUSTOM foods only
    name: text("name").notNull(),
    brand: text("brand"),
    servingSize: real("serving_size").notNull(),
    servingUnit: text("serving_unit").notNull(),
    calories: real("calories").notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("foods_source_external_idx").on(t.source, t.externalId),
    index("foods_user_idx").on(t.userId),
  ],
);

/** Totals are snapshotted at log time, so editing a custom food never rewrites history. */
export const foodLogs = pgTable(
  "food_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
    date: date("date", { mode: "string" }).notNull(), // YYYY-MM-DD in the user's local day
    meal: meal("meal").notNull(),
    servings: real("servings").notNull(),
    foodName: text("food_name").notNull(),
    serving: text("serving").notNull(), // e.g. "100 g"
    calories: real("calories").notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("food_logs_user_date_idx").on(t.userId, t.date)],
);

export type Food = typeof foods.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
