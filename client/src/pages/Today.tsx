import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AddFoodSheet } from "../components/AddFoodSheet";
import { MacroBars } from "../components/MacroBars";
import { PlateRing } from "../components/PlateRing";
import { Button, ErrorNote, Segmented, Sheet } from "../components/ui";
import { api } from "../lib/api";
import { addDays, dayLabel, kcal, mealForNow, portion, qty, today } from "../lib/format";
import { MEALS, type FoodLog, type Goal, type Macros, type Meal } from "../lib/types";

const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const sum = (logs: FoodLog[]): Macros =>
  logs.reduce(
    (t, l) => ({ calories: t.calories + l.calories, protein: t.protein + l.protein, carbs: t.carbs + l.carbs, fat: t.fat + l.fat }),
    ZERO,
  );

export function TodayPage() {
  const [params, setParams] = useSearchParams();
  const date = params.get("date") ?? today();
  const setDate = (d: string) => setParams(d === today() ? {} : { date: d }, { replace: true });

  // Keyed by date so switching days shows the loading state instead of the previous day.
  const [loaded, setLoaded] = useState<{ date: string; logs: FoodLog[] } | null>(null);
  const logs = loaded?.date === date ? loaded.logs : null;
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<FoodLog | null>(null);

  const load = useCallback(() => {
    Promise.all([api.logsFor(date), api.goal()])
      .then(([l, g]) => {
        setLoaded({ date, logs: l });
        setGoal(g);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const eaten = sum(logs ?? []);

  return (
    <div className="space-y-8">
      <nav className="flex items-center justify-between" aria-label="Choose day">
        <DayButton dir="prev" onClick={() => setDate(addDays(date, -1))} />
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">{dayLabel(date)}</h1>
          {date !== today() && (
            <button onClick={() => setDate(today())} className="text-sm text-ink-soft underline underline-offset-4">
              Jump to today
            </button>
          )}
        </div>
        <DayButton dir="next" onClick={() => setDate(addDays(date, 1))} />
      </nav>

      <ErrorNote>{error}</ErrorNote>

      {goal && logs ? (
        <section className="space-y-8" aria-label="Daily totals">
          <PlateRing eaten={eaten} goal={goal.calories} />
          <MacroBars eaten={eaten} goal={goal} />
        </section>
      ) : (
        !error && <div className="mx-auto size-[220px] animate-pulse rounded-full border-[16px] border-sunken" />
      )}

      {logs && (
        <div className="space-y-6">
          {MEALS.map((m) => {
            const entries = logs.filter((l) => l.meal === m.id);
            const total = sum(entries).calories;
            return (
              <section key={m.id} aria-labelledby={`meal-${m.id}`}>
                <header className="flex items-baseline justify-between border-b border-line pb-2">
                  <h2 id={`meal-${m.id}`} className="font-display text-lg font-bold">
                    {m.label}
                  </h2>
                  <div className="flex items-baseline gap-4">
                    {total > 0 && <span className="num text-ink-soft">{kcal(total)} kcal</span>}
                    <button
                      onClick={() => setAdding(m.id)}
                      className="min-h-9 rounded-lg px-2 text-sm font-bold text-brand hover:bg-sunken"
                      aria-label={`Add food to ${m.label.toLowerCase()}`}
                    >
                      + Add
                    </button>
                  </div>
                </header>
                {entries.length === 0 ? (
                  <p className="py-3 text-sm text-ink-muted">Nothing logged yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {entries.map((l) => (
                      <li key={l.id}>
                        <button
                          onClick={() => setEditing(l)}
                          className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-sunken/50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{l.foodName}</span>
                            <span className="block text-xs text-ink-muted">
                              {portion(l.servings, l.serving)}
                            </span>
                          </span>
                          <span className="num shrink-0">{kcal(l.calories)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center sm:bottom-8">
        <Button className="pointer-events-auto rounded-full px-6 shadow-lg" onClick={() => setAdding(mealForNow())}>
          Log food
        </Button>
      </div>

      {adding && (
        <AddFoodSheet
          date={date}
          initialMeal={adding}
          onClose={() => setAdding(null)}
          onAdded={() => {
            setAdding(null);
            load();
          }}
        />
      )}

      {editing && (
        <EditEntrySheet
          entry={editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function DayButton({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full border border-line text-ink-soft hover:bg-sunken"
      aria-label={dir === "prev" ? "Previous day" : "Next day"}
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <path
          d={dir === "prev" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function EditEntrySheet({ entry, onClose, onChanged }: { entry: FoodLog; onClose: () => void; onChanged: () => void }) {
  const [servingsText, setServingsText] = useState(qty(entry.servings));
  const [meal, setMeal] = useState<Meal>(entry.meal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const servings = Number(servingsText);
  const valid = Number.isFinite(servings) && servings > 0 && servings <= 100;
  const perServing = entry.calories / entry.servings;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet title="Edit entry" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="text-lg font-bold leading-snug">{entry.foodName}</p>
          <p className="text-sm text-ink-muted">1 serving = {entry.serving}</p>
        </div>
        <label className="block">
          <span className="text-sm text-ink-soft">Servings</span>
          <input
            inputMode="decimal"
            value={servingsText}
            onChange={(e) => setServingsText(e.target.value.replace(",", "."))}
            className="num mt-1 block min-h-11 w-28 rounded-xl border border-line bg-raised px-3 text-center text-lg"
            aria-invalid={!valid}
          />
          <span className="mt-1 block text-sm text-ink-muted">
            {valid ? `${kcal(perServing * servings)} kcal` : "Enter a number above 0"}
          </span>
        </label>
        <Segmented label="Meal" options={MEALS} value={meal} onChange={setMeal} />
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-3">
          <Button variant="danger" disabled={busy} onClick={() => run(() => api.deleteLog(entry.id))}>
            Remove
          </Button>
          <Button
            className="flex-1"
            disabled={!valid || busy}
            onClick={() => run(() => api.updateLog(entry.id, { servings, meal }))}
          >
            Save changes
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
