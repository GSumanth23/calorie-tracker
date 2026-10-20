import { kcal } from "../lib/format";
import type { Macros } from "../lib/types";

const SIZE = 220;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 3; // surface gap between segments, in px of arc

/**
 * The day's "plate": the rim fills toward the calorie goal, split by where the calories
 * came from (protein 4 kcal/g, carbs 4 kcal/g, fat 9 kcal/g).
 */
export function PlateRing({ eaten, goal }: { eaten: Macros; goal: number }) {
  const total = eaten.calories;
  const over = total > goal;
  const filled = Math.min(total / Math.max(goal, 1), 1);

  const parts = [
    { key: "protein", label: "Protein", kcal: eaten.protein * 4, color: "var(--protein)" },
    { key: "carbs", label: "Carbs", kcal: eaten.carbs * 4, color: "var(--carbs)" },
    { key: "fat", label: "Fat", kcal: eaten.fat * 9, color: "var(--fat)" },
  ];
  const macroKcal = parts.reduce((s, p) => s + p.kcal, 0) || 1;

  let offset = 0;
  const segments = parts
    .filter((p) => p.kcal > 0)
    .map((p) => {
      const len = (p.kcal / macroKcal) * filled * C;
      const seg = { ...p, len: Math.max(len - GAP, 0.5), start: offset };
      offset += len;
      return seg;
    });

  const remaining = Math.round(goal - total);

  return (
    <figure className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`${kcal(total)} of ${kcal(goal)} calories eaten`}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--sunken)" strokeWidth={STROKE} />
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.len} ${C}`}
              strokeDashoffset={-s.start}
              className="transition-[stroke-dasharray,stroke-dashoffset] duration-700 ease-out"
            >
              <title>{`${s.label}: ${kcal(s.kcal)} kcal`}</title>
            </circle>
          ))}
        </g>
      </svg>

      <figcaption className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`num text-5xl font-extrabold tracking-tight ${over ? "text-over" : "text-ink"}`}>
          {kcal(Math.abs(remaining))}
        </span>
        <span className="mt-1 text-sm text-ink-soft">
          {over ? (
            <>
              <span aria-hidden>▲ </span>kcal over goal
            </>
          ) : (
            "kcal left"
          )}
        </span>
        <span className="mt-2 text-xs text-ink-muted">
          {kcal(total)} eaten of {kcal(goal)}
        </span>
      </figcaption>
    </figure>
  );
}
