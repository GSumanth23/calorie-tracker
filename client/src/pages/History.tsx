import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorNote, Segmented } from "../components/ui";
import { api } from "../lib/api";
import { dayLabel, kcal, monthDay, shortDay, today } from "../lib/format";
import type { DaySummary, Goal } from "../lib/types";

type Range = "7" | "30";

export function HistoryPage() {
  const [range, setRange] = useState<Range>("7");
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.range(today(), Number(range)), api.goal()])
      .then(([d, g]) => {
        setDays(d);
        setGoal(g);
      })
      .catch((e: Error) => setError(e.message));
  }, [range]);

  const logged = days?.filter((d) => d.logged) ?? [];
  const avg = (k: keyof DaySummary) =>
    logged.length ? logged.reduce((s, d) => s + (d[k] as number), 0) / logged.length : 0;
  // Round axis ticks: steps of 500 kcal, always tall enough to show the goal line.
  const peak = Math.max(goal?.calories ?? 0, ...(days ?? []).map((d) => d.calories));
  const step = peak > 4000 ? 1000 : 500;
  const ticks = Array.from({ length: Math.ceil(peak / step) + 1 }, (_, i) => i * step);
  const overDays = goal ? logged.filter((d) => d.calories > goal.calories).length : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">History</h1>
        <div className="w-48">
          <Segmented
            label="Time range"
            value={range}
            onChange={setRange}
            options={[
              { id: "7", label: "7 days" },
              { id: "30", label: "30 days" },
            ]}
          />
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {days && goal && (
        <>
          <dl className="grid grid-cols-3 gap-4">
            <Summary label="Average per logged day" value={kcal(avg("calories"))} unit="kcal" />
            <Summary label="Days logged" value={`${logged.length}`} unit={`of ${days.length}`} />
            <Summary label="Average protein" value={kcal(avg("protein"))} unit="g" />
          </dl>

          <figure>
            <figcaption className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
              <span>Calories per day</span>
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-5 border-t-2 border-dashed border-ink-soft" aria-hidden />
                Goal {kcal(goal.calories)}
              </span>
              {overDays > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-over" aria-hidden />
                  Over goal ({overDays} {overDays === 1 ? "day" : "days"})
                </span>
              )}
            </figcaption>
            <div className="h-64" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={range === "7" ? "28%" : "12%"}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={range === "7" ? shortDay : monthDay}
                    tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--line)" }}
                    tickLine={false}
                    interval={range === "7" ? 0 : "preserveStartEnd"}
                    minTickGap={16}
                  />
                  <YAxis ticks={ticks} domain={[0, ticks[ticks.length - 1]]} tickFormatter={kcal} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip
                    cursor={{ fill: "var(--sunken)" }}
                    content={({ active, payload }) => {
                      const d = active && (payload?.[0]?.payload as DaySummary | undefined);
                      if (!d) return null;
                      return (
                        <div className="rounded-xl border border-line bg-raised px-3 py-2 text-sm shadow-md">
                          <p className="font-bold text-ink">{dayLabel(d.date)}</p>
                          {d.logged ? (
                            <>
                              <p className="num text-ink">{kcal(d.calories)} kcal</p>
                              <p className="text-ink-muted">
                                P {d.protein} g, C {d.carbs} g, F {d.fat} g
                              </p>
                            </>
                          ) : (
                            <p className="text-ink-muted">Nothing logged</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={goal.calories} stroke="var(--ink-soft)" strokeDasharray="5 4" strokeWidth={1.5} />
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {days.map((d) => (
                      <Cell key={d.date} fill={d.calories > goal.calories ? "var(--over)" : "var(--brand)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>

          <section aria-labelledby="day-table">
            <h2 id="day-table" className="mb-2 font-display text-lg font-bold">
              Day by day
            </h2>
            <table className="w-full text-sm">
              <thead className="text-left text-ink-muted">
                <tr className="border-b border-line">
                  <th className="py-2 font-normal">Day</th>
                  <th className="py-2 text-right font-normal">kcal</th>
                  <th className="hidden py-2 text-right font-normal sm:table-cell">Protein</th>
                  <th className="hidden py-2 text-right font-normal sm:table-cell">Carbs</th>
                  <th className="hidden py-2 text-right font-normal sm:table-cell">Fat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...days].reverse().map((d) => (
                  <tr key={d.date}>
                    <td className="py-2.5">
                      <Link to={d.date === today() ? "/" : `/?date=${d.date}`} className="underline-offset-4 hover:underline">
                        {dayLabel(d.date)}
                      </Link>
                    </td>
                    <td className={`num py-2.5 text-right ${d.calories > goal.calories ? "text-over" : ""}`}>
                      {d.logged ? kcal(d.calories) : <span className="text-ink-muted">–</span>}
                      {d.calories > goal.calories && <span className="sr-only"> (over goal)</span>}
                    </td>
                    <td className="num hidden py-2.5 text-right sm:table-cell">{d.logged ? `${d.protein} g` : ""}</td>
                    <td className="num hidden py-2.5 text-right sm:table-cell">{d.logged ? `${d.carbs} g` : ""}</td>
                    <td className="num hidden py-2.5 text-right sm:table-cell">{d.logged ? `${d.fat} g` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function Summary({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted sm:text-sm">{label}</dt>
      <dd className="mt-1">
        <span className="num text-2xl font-bold">{value}</span> <span className="text-sm text-ink-muted">{unit}</span>
      </dd>
    </div>
  );
}
