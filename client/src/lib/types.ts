export type Meal = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export const MEALS: { id: Meal; label: string }[] = [
  { id: "BREAKFAST", label: "Breakfast" },
  { id: "LUNCH", label: "Lunch" },
  { id: "DINNER", label: "Dinner" },
  { id: "SNACK", label: "Snacks" },
];

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Food extends Macros {
  id: string;
  source: "SEED" | "USDA" | "CUSTOM";
  externalId: string | null;
  userId: string | null;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: string;
}

/** A USDA search result that hasn't been saved to our database yet. */
export interface UsdaFood extends Macros {
  source: "USDA";
  externalId: string;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: string;
}

export interface SearchResult {
  local: Food[];
  usda: UsdaFood[];
  usdaError?: string;
}

export interface FoodLog extends Macros {
  id: string;
  foodId: string | null;
  date: string;
  meal: Meal;
  servings: number;
  foodName: string;
  serving: string;
  createdAt: string;
}

export interface Goal extends Macros {
  userId: string;
}

export interface DaySummary extends Macros {
  date: string;
  logged: boolean;
}
