import { useEffect, useState, type FormEvent } from "react";
import { Button, ErrorNote, Field, Sheet } from "../components/ui";
import { api } from "../lib/api";
import { kcal, qty } from "../lib/format";
import type { Food } from "../lib/types";

export function MyFoodsPage() {
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Food | "new" | null>(null);

  const load = () =>
    api
      .myFoods()
      .then(setFoods)
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">My foods</h1>
        <Button onClick={() => setEditing("new")}>Add a food</Button>
      </div>
      <p className="text-ink-soft">
        Save home-cooked dishes and anything the database doesn’t have. They show up first when you search.
      </p>

      <ErrorNote>{error}</ErrorNote>

      {foods && foods.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center">
          <p className="font-bold">No custom foods yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add a dish you eat often, like a plate of biryani or your usual smoothie, so logging it takes one tap.
          </p>
        </div>
      )}

      {foods && foods.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {foods.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => setEditing(f)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-sunken/50"
              >
                <span className="min-w-0">
                  <span className="block truncate">{f.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {qty(f.servingSize)} {f.servingUnit}: P {qty(f.protein)} g, C {qty(f.carbs)} g, F {qty(f.fat)} g
                  </span>
                </span>
                <span className="num shrink-0">{kcal(f.calories)} kcal</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <FoodForm
          food={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function FoodForm({ food, onClose, onSaved }: { food: Food | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: food?.name ?? "",
    servingSize: food ? qty(food.servingSize) : "1",
    servingUnit: food?.servingUnit ?? "serving",
    calories: food ? qty(food.calories) : "",
    protein: food ? qty(food.protein) : "",
    carbs: food ? qty(food.carbs) : "",
    fat: food ? qty(food.fat) : "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const num = (s: string) => Number(s.replace(",", ".") || 0);
  const estimate = num(form.protein) * 4 + num(form.carbs) * 4 + num(form.fat) * 9;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      name: form.name.trim(),
      brand: null,
      servingSize: num(form.servingSize),
      servingUnit: form.servingUnit.trim(),
      calories: num(form.calories),
      protein: num(form.protein),
      carbs: num(form.carbs),
      fat: num(form.fat),
    };
    try {
      if (food) await api.updateFood(food.id, body);
      else await api.createFood(body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!food) return;
    setBusy(true);
    try {
      await api.deleteFood(food.id);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet title={food ? "Edit food" : "Add a food"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" value={form.name} onChange={set("name")} required maxLength={120} placeholder="Chicken biryani" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Serving size" inputMode="decimal" value={form.servingSize} onChange={set("servingSize")} required />
          <Field label="Unit" value={form.servingUnit} onChange={set("servingUnit")} required placeholder="plate, cup, g" />
        </div>
        <Field
          label="Calories per serving"
          inputMode="decimal"
          value={form.calories}
          onChange={set("calories")}
          required
          hint={estimate > 0 ? `Macros below add up to about ${kcal(estimate)} kcal` : undefined}
        />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Protein (g)" inputMode="decimal" value={form.protein} onChange={set("protein")} />
          <Field label="Carbs (g)" inputMode="decimal" value={form.carbs} onChange={set("carbs")} />
          <Field label="Fat (g)" inputMode="decimal" value={form.fat} onChange={set("fat")} />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-3 pt-1">
          {food && (
            <Button type="button" variant="danger" onClick={remove} disabled={busy}>
              Delete
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={busy}>
            {food ? "Save changes" : "Save food"}
          </Button>
        </div>
        {food && <p className="text-xs text-ink-muted">Past entries keep the values they were logged with.</p>}
      </form>
    </Sheet>
  );
}
