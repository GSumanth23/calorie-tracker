import type { Meal } from "./types";

/** Dates are handled as local-day strings (YYYY-MM-DD) so "today" matches the user's clock. */
export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const today = () => toISODate(new Date());

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + n));
}

export function fromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayLabel(iso: string) {
  const t = today();
  if (iso === t) return "Today";
  if (iso === addDays(t, -1)) return "Yesterday";
  if (iso === addDays(t, 1)) return "Tomorrow";
  return fromISO(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export const shortDay = (iso: string) => fromISO(iso).toLocaleDateString(undefined, { weekday: "short" });
export const monthDay = (iso: string) => fromISO(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const kcal = (n: number) => Math.round(n).toLocaleString();
export const grams = (n: number) => `${Math.round(n)} g`;

/** Show 1.5 as "1.5" and 2 as "2". */
export const qty = (n: number) => String(Math.round(n * 100) / 100);

/** Best-guess meal for "now", used as the default when logging. */
export function mealForNow(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "BREAKFAST";
  if (h < 16) return "LUNCH";
  if (h < 21) return "DINNER";
  return "SNACK";
}

/** "2 × 1 roti (40 g)" reads better as "2 roti (40 g)"; "1.5 × 100 g" stays as is. */
export function portion(servings: number, serving: string) {
  if (serving.startsWith("1 ") && !/^1 (g|ml)$/.test(serving)) return `${qty(servings)} ${serving.slice(2)}`;
  return `${qty(servings)} × ${serving}`;
}
