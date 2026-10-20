import type { Macros } from "../lib/types";

const ROWS = [
  { key: "protein", label: "Protein", color: "bg-protein" },
  { key: "carbs", label: "Carbs", color: "bg-carbs" },
  { key: "fat", label: "Fat", color: "bg-fat" },
] as const;

export function MacroBars({ eaten, goal }: { eaten: Macros; goal: Macros }) {
  return (
    <dl className="grid grid-cols-3 gap-4">
      {ROWS.map((r) => {
        const value = Math.round(eaten[r.key]);
        const target = goal[r.key];
        const pct = target > 0 ? Math.min(value / target, 1) * 100 : 0;
        return (
          <div key={r.key}>
            <dt className="flex items-center gap-1.5 text-sm text-ink-soft">
              <span className={`size-2.5 rounded-full ${r.color}`} aria-hidden />
              {r.label}
            </dt>
            <dd className="mt-1">
              <span className="num text-xl font-bold text-ink">{value}</span>
              <span className="text-sm text-ink-muted"> / {target} g</span>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
                role="progressbar"
                aria-label={`${r.label} progress`}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuenow={value}
              >
                <div className={`h-full rounded-full ${r.color} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
              </div>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
