import { env } from "../env.js";

/** A food normalized to the same shape as our `foods` table (values per one serving). */
export interface NormalizedFood {
  source: "USDA";
  externalId: string;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UsdaNutrient {
  nutrientNumber?: string;
  nutrientId?: number;
  unitName?: string;
  value?: number;
}

interface UsdaSearchFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaNutrient[];
}

// FoodData Central nutrient numbers (legacy) and ids.
const NUTRIENTS = {
  calories: { numbers: ["208", "957", "958"], ids: [1008, 2047, 2048] }, // Energy (kcal), Atwater variants
  protein: { numbers: ["203"], ids: [1003] },
  carbs: { numbers: ["205"], ids: [1005] },
  fat: { numbers: ["204"], ids: [1004] },
};

function pick(nutrients: UsdaNutrient[], key: keyof typeof NUTRIENTS): number | null {
  const spec = NUTRIENTS[key];
  for (const n of nutrients) {
    const matches =
      (n.nutrientNumber && spec.numbers.includes(n.nutrientNumber)) ||
      (n.nutrientId && spec.ids.includes(n.nutrientId));
    // Skip energy reported in kJ.
    if (matches && typeof n.value === "number" && n.unitName?.toUpperCase() !== "KJ") return n.value;
  }
  return null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function titleCase(s: string) {
  // Branded descriptions come back in ALL CAPS.
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}

/**
 * Search results report nutrients per 100 g (or 100 ml). For branded foods with a gram/ml
 * serving size we convert to that serving; otherwise we expose a 100 g serving.
 */
export function normalize(f: UsdaSearchFood): NormalizedFood | null {
  const nutrients = f.foodNutrients ?? [];
  const per100 = {
    calories: pick(nutrients, "calories"),
    protein: pick(nutrients, "protein") ?? 0,
    carbs: pick(nutrients, "carbs") ?? 0,
    fat: pick(nutrients, "fat") ?? 0,
  };
  if (per100.calories === null) return null;

  const unit = f.servingSizeUnit?.toLowerCase();
  const gramLike = unit === "g" || unit === "grm" || unit === "ml" || unit === "mlt";
  const hasServing = typeof f.servingSize === "number" && f.servingSize > 0 && gramLike;
  const servingSize = hasServing ? f.servingSize! : 100;
  const servingUnit = hasServing ? (unit!.startsWith("m") ? "ml" : "g") : "g";
  const factor = servingSize / 100;

  return {
    source: "USDA",
    externalId: String(f.fdcId),
    name: titleCase(f.description),
    brand: f.brandName || f.brandOwner ? titleCase(f.brandName || f.brandOwner!) : null,
    servingSize: round1(servingSize),
    servingUnit,
    calories: Math.round(per100.calories * factor),
    protein: round1(per100.protein * factor),
    carbs: round1(per100.carbs * factor),
    fat: round1(per100.fat * factor),
  };
}

export async function searchUsda(query: string, pageSize = 15): Promise<NormalizedFood[]> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", env.USDA_API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("dataType", "Foundation,SR Legacy,Branded");

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(res.status === 429 ? "USDA rate limit reached (try your own API key)" : `USDA error ${res.status}`);
  }
  const data = (await res.json()) as { foods?: UsdaSearchFood[] };
  return (data.foods ?? []).map(normalize).filter((f): f is NormalizedFood => f !== null);
}
