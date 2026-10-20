import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { Button, ErrorNote, Field } from "../components/ui";
import { api } from "../lib/api";
import { kcal } from "../lib/format";

export function GoalsPage() {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<Record<"calories" | "protein" | "carbs" | "fat", string> | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    api
      .goal()
      .then((g) =>
        setForm({ calories: String(g.calories), protein: String(g.protein), carbs: String(g.carbs), fat: String(g.fat) }),
      )
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!form) return <ErrorNote>{error}</ErrorNote>;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus("idle");
    setForm({ ...form, [k]: e.target.value });
  };
  const n = (s: string) => Math.round(Number(s) || 0);
  const fromMacros = n(form.protein) * 4 + n(form.carbs) * 4 + n(form.fat) * 9;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      await api.saveGoal({ calories: n(form.calories), protein: n(form.protein), carbs: n(form.carbs), fat: n(form.fat) });
      setStatus("saved");
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-10">
      <form onSubmit={submit} className="space-y-5">
        <h1 className="font-display text-2xl font-bold">Daily goals</h1>
        <Field
          label="Calories (kcal)"
          inputMode="numeric"
          value={form.calories}
          onChange={set("calories")}
          required
          className="max-w-xs"
        />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Protein (g)" inputMode="numeric" value={form.protein} onChange={set("protein")} required />
          <Field label="Carbs (g)" inputMode="numeric" value={form.carbs} onChange={set("carbs")} required />
          <Field label="Fat (g)" inputMode="numeric" value={form.fat} onChange={set("fat")} required />
        </div>
        <p className="text-sm text-ink-muted">
          These macros add up to {kcal(fromMacros)} kcal
          {Math.abs(fromMacros - n(form.calories)) > 100 ? ", so you may want to adjust one side." : "."}
        </p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save goals"}
          </Button>
          {status === "saved" && (
            <span role="status" className="text-sm text-ink-soft">
              Goals saved
            </span>
          )}
        </div>
      </form>

      <section className="space-y-3 border-t border-line pt-6">
        <h2 className="font-display text-lg font-bold">Account</h2>
        <p className="text-sm text-ink-soft">
          Signed in as {user?.name} ({user?.email})
        </p>
        <Button variant="quiet" onClick={signOut}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
