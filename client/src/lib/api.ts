import type { DaySummary, Food, FoodLog, Goal, Meal, SearchResult, UsdaFood, User } from "./types";

const TOKEN_KEY = "plate.token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable (private mode) — session stays in memory only */
    }
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Called when the server rejects our token, so the app can sign out. */
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

type AuthResponse = { token: string; user: User };
type FoodInput = Omit<Food, "id" | "source" | "externalId" | "userId">;

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body }),
  login: (body: { email: string; password: string }) => request<AuthResponse>("/auth/login", { method: "POST", body }),
  me: () => request<{ user: User }>("/auth/me"),

  searchFoods: (q: string) => request<SearchResult>(`/foods/search?q=${encodeURIComponent(q)}`),
  cacheUsdaFood: (food: UsdaFood) => request<Food>("/foods/usda", { method: "POST", body: food }),
  recentFoods: () => request<Food[]>("/foods/recent"),
  myFoods: () => request<Food[]>("/foods/mine"),
  createFood: (body: FoodInput) => request<Food>("/foods", { method: "POST", body }),
  updateFood: (id: string, body: FoodInput) => request<Food>(`/foods/${id}`, { method: "PUT", body }),
  deleteFood: (id: string) => request<void>(`/foods/${id}`, { method: "DELETE" }),

  logsFor: (date: string) => request<FoodLog[]>(`/logs?date=${date}`),
  addLog: (body: { foodId: string; servings: number; meal: Meal; date: string }) =>
    request<FoodLog>("/logs", { method: "POST", body }),
  updateLog: (id: string, body: { servings?: number; meal?: Meal }) =>
    request<FoodLog>(`/logs/${id}`, { method: "PATCH", body }),
  deleteLog: (id: string) => request<void>(`/logs/${id}`, { method: "DELETE" }),

  goal: () => request<Goal>("/goals"),
  saveGoal: (body: Omit<Goal, "userId">) => request<Goal>("/goals", { method: "PUT", body }),

  range: (end: string, days: number) => request<DaySummary[]>(`/stats/range?end=${end}&days=${days}`),
};
