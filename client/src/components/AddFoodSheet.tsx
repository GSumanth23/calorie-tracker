import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { grams, kcal, qty } from "../lib/format";
import { MEALS, type Food, type Meal, type SearchResult, type UsdaFood } from "../lib/types";
import { Button, ErrorNote, Segmented, Sheet } from "./ui";

type Pickable = Food | UsdaFood;
const isSaved = (f: Pickable): f is Food => "id" in f;
const keyOf = (f: Pickable) => (isSaved(f) ? f.id : `usda-${f.externalId}`);

export function AddFoodSheet({
  date,
  initialMeal,
  onClose,
  onAdded,
}: {
  date: string;
  initialMeal: Meal;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  // Results are tagged with the query they answer, so stale responses are never shown.
  const [answer, setAnswer] = useState<{ q: string; data: SearchResult } | null>(null);
  const [recent, setRecent] = useState<Food[]>([]);
  const q = query.trim();
  const active = q.length >= 2;
  const results = active && answer?.q === q ? answer.data : null;
  const searching = active && !results;
  const [picked, setPicked] = useState<Pickable | null>(null);

  useEffect(() => {
    api.recentFoods().then(setRecent).catch(() => {});
  }, []);

  // Debounced search.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      api
        .searchFoods(q)
        .then((data) => setAnswer({ q, data }))
        .catch((e: Error) => setAnswer({ q, data: { local: [], usda: [], usdaError: e.message } }));
    }, 300);
    return () => clearTimeout(t);
  }, [q, active]);

  return (
    <Sheet title={picked ? "How much?" : "Log food"} onClose={onClose}>
      {picked ? (
        <PortionStep
          food={picked}
          date={date}
          initialMeal={initialMeal}
          onBack={() => setPicked(null)}
          onAdded={onAdded}
        />
      ) : (
        <div className="space-y-5">
          <label className="block">
            <span className="sr-only">Search foods</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods, e.g. greek yogurt"
              className="block min-h-12 w-full rounded-xl border border-line bg-raised px-4 text-ink placeholder:text-ink-muted"
              autoComplete="off"
            />
          </label>

          {!active && recent.length > 0 && (
            <FoodList title="Recently logged" foods={recent} onPick={setPicked} />
          )}
          {!active && recent.length === 0 && (
            <p className="text-sm text-ink-muted">
              Type at least two letters. Your custom foods, common foods and the USDA database are searched together.
            </p>
          )}

          {searching && <p className="text-sm text-ink-muted">Searching…</p>}

          {results && (
            <>
              {results.local.length > 0 && <FoodList title="Saved foods" foods={results.local} onPick={setPicked} />}
              {results.usda.length > 0 && <FoodList title="USDA database" foods={results.usda} onPick={setPicked} />}
              {results.usdaError && (
                <p className="text-xs text-ink-muted">USDA search unavailable: {results.usdaError}</p>
              )}
              {results.local.length === 0 && results.usda.length === 0 && (
                <p className="text-sm text-ink-soft">
                  No matches for “{query.trim()}”. Try a simpler word, or add it under My foods.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

function FoodList({ title, foods, onPick }: { title: string; foods: Pickable[]; onPick: (f: Pickable) => void }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-bold text-ink-soft">{title}</h3>
      <ul className="divide-y divide-line">
        {foods.map((f) => (
          <li key={keyOf(f)}>
            <button
              onClick={() => onPick(f)}
              className="flex w-full items-center justify-between gap-3 rounded-lg py-3 text-left hover:bg-sunken/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-ink">{f.name}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {f.brand ? `${f.brand}, ` : ""}
                  {qty(f.servingSize)} {f.servingUnit}
                  {isSaved(f) && f.source === "CUSTOM" ? ", my food" : ""}
                </span>
              </span>
              <span className="num shrink-0 text-ink">{kcal(f.calories)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PortionStep({
  food,
  date,
  initialMeal,
  onBack,
  onAdded,
}: {
  food: Pickable;
  date: string;
  initialMeal: Meal;
  onBack: () => void;
  onAdded: () => void;
}) {
  const [servingsText, setServingsText] = useState("1");
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const servings = Number(servingsText);
  const valid = Number.isFinite(servings) && servings > 0 && servings <= 100;
  const n = valid ? servings : 0;

  const add = async () => {
    setSaving(true);
    setError("");
    try {
      const saved = isSaved(food) ? food : await api.cacheUsdaFood(food);
      await api.addLog({ foodId: saved.id, servings, meal, date });
      onAdded();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const mealLabel = MEALS.find((m) => m.id === meal)!.label.toLowerCase();

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="text-sm text-ink-soft underline-offset-4 hover:underline">
          Back to search
        </button>
        <p className="mt-2 text-lg font-bold leading-snug text-ink">{food.name}</p>
        <p className="text-sm text-ink-muted">
          {food.brand ? `${food.brand}, ` : ""}1 serving = {qty(food.servingSize)} {food.servingUnit}
        </p>
      </div>

      <div>
        <label htmlFor="servings" className="text-sm text-ink-soft">
          Servings
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="servings"
            inputMode="decimal"
            value={servingsText}
            onChange={(e) => setServingsText(e.target.value.replace(",", "."))}
            className="num block min-h-11 w-24 rounded-xl border border-line bg-raised px-3 text-center text-lg text-ink"
            aria-invalid={!valid}
          />
          {[0.5, 1, 1.5, 2].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setServingsText(String(v))}
              className={`min-h-11 min-w-11 rounded-xl border px-2 text-sm ${
                servings === v ? "border-brand font-bold text-ink" : "border-line text-ink-soft hover:bg-sunken"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <Segmented label="Meal" options={MEALS} value={meal} onChange={setMeal} />

      <dl className="grid grid-cols-4 gap-2 rounded-2xl bg-raised p-4 text-center">
        <Stat label="Calories" value={kcal(food.calories * n)} />
        <Stat label="Protein" value={grams(food.protein * n)} dot="bg-protein" />
        <Stat label="Carbs" value={grams(food.carbs * n)} dot="bg-carbs" />
        <Stat label="Fat" value={grams(food.fat * n)} dot="bg-fat" />
      </dl>

      <ErrorNote>{error}</ErrorNote>

      <Button className="w-full" onClick={add} disabled={!valid || saving}>
        {saving ? "Adding…" : `Add to ${mealLabel}`}
      </Button>
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div>
      <dt className="flex items-center justify-center gap-1 text-xs text-ink-muted">
        {dot && <span className={`size-2 rounded-full ${dot}`} aria-hidden />}
        {label}
      </dt>
      <dd className="num mt-0.5 font-bold text-ink">{value}</dd>
    </div>
  );
}
