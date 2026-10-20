import { NavLink, Outlet } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Today", icon: "M10 3a7 7 0 100 14 7 7 0 000-14zm0 3v4l3 2" },
  { to: "/history", label: "History", icon: "M4 16V9m4 7V5m4 11v-5m4 5V7" },
  { to: "/foods", label: "My foods", icon: "M5 4h10v12H5zM8 8h4m-4 3h4" },
  { to: "/goals", label: "Goals", icon: "M10 3a7 7 0 100 14 7 7 0 000-14zm0 4a3 3 0 100 6 3 3 0 000-6z" },
];

export function Layout() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <span className="font-display text-xl font-extrabold tracking-tight">Plate</span>
          <nav aria-label="Main" className="hidden gap-1 sm:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-sunken font-bold text-ink" : "text-ink-soft hover:text-ink"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6 pb-40 sm:pb-28">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${isActive ? "font-bold text-brand" : "text-ink-muted"}`
            }
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              <path d={l.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
