# Plate: calorie tracker

A full-stack calorie and macro tracker. Log what you eat, see your day as a "plate" ring split by protein, carbs and fat, and review trends over the last 7 or 30 days.

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts on the front end; Node.js + Express 5 + Drizzle ORM + PostgreSQL on the back end; JWT auth with bcrypt; Zod validation on every route.

## Features

- Sign up and sign in (passwords hashed with bcrypt, 30-day JWT sessions)
- Search foods across three sources at once: your custom foods, 32 built-in common foods, and the USDA FoodData Central database
- Log food to breakfast, lunch, dinner or snacks with any number of servings
- Daily ring showing calories left, coloured by where the calories came from, plus protein/carbs/fat progress
- Edit or remove entries, browse any past or future day
- Save your own foods (home-cooked dishes, family recipes) so they show up first in search
- "Recently logged" list for one-tap re-logging
- History page with a calories-per-day chart, goal line, averages and a day-by-day table
- Adjustable daily calorie and macro goals
- Light and dark mode, phone-first layout with a bottom tab bar, keyboard accessible

## Run it locally

You need **Node.js 20+** and **PostgreSQL** (Docker is the easiest way to get Postgres).

```bash
# 1. Install everything
npm run setup

# 2. Start Postgres (skip if you already run Postgres locally)
npm run db:up

# 3. Configure the API
cp server/.env.example server/.env
#    then set JWT_SECRET to a long random string, and add your USDA key (see below)

# 4. Create the tables and load the common foods
npm run db:migrate
npm run db:seed

# 5. Start the API (port 4000) and the web app (port 5173) together
npm run dev
```

Open http://localhost:5173 and create an account.

### USDA API key

Search works out of the box with the built-in foods. For the full USDA database, get a free key at https://fdc.nal.usda.gov/api-key-signup and put it in `server/.env` as `USDA_API_KEY`. The default `DEMO_KEY` works but is heavily rate-limited.

## How it fits together

```
client/  (React, port 5173)  ── /api/* proxied by Vite ──▶  server/  (Express, port 4000)  ──▶  PostgreSQL
                                                                 └──▶ USDA FoodData Central (search only)
```

### Data model

| Table | Purpose |
|---|---|
| `users` | Account, bcrypt password hash |
| `goals` | One row per user: daily calories, protein, carbs, fat |
| `foods` | Nutrition **per serving**. `source` is `SEED` (built-in), `USDA` (cached the first time someone logs it) or `CUSTOM` (owned by one user) |
| `food_logs` | One row per thing eaten: date, meal, servings, and a **snapshot** of the food name and totals |

Design decisions worth knowing:

- **Log entries snapshot their nutrition.** Editing or deleting a custom food never rewrites your history.
- **Totals are stored unrounded** and rounded only for display, so changing servings from 1.5 to 2 rescales exactly.
- **Dates are the user's local day** (`YYYY-MM-DD`) sent by the browser, so "today" always matches your clock regardless of server time zone.
- **USDA results are cached on first log**, not on search, keeping the database small. Your API key stays on the server.

### API

All routes except auth require `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` → `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/foods/search?q=` | `{ local, usda, usdaError? }` |
| POST | `/api/foods/usda` | Cache a USDA result so it can be logged |
| GET | `/api/foods/recent` | Foods you logged most recently |
| GET / POST | `/api/foods/mine`, `/api/foods` | List / create custom foods |
| PUT / DELETE | `/api/foods/:id` | Edit / delete a custom food |
| GET | `/api/logs?date=YYYY-MM-DD` | Entries for a day |
| POST | `/api/logs` | `{ foodId, servings, meal, date }` |
| PATCH / DELETE | `/api/logs/:id` | Change servings or meal / remove |
| GET / PUT | `/api/goals` | Read / update daily goals |
| GET | `/api/stats/range?end=YYYY-MM-DD&days=7` | Daily totals, zero-filled |

## Deploy (free): Neon + Render

In production the Express server also serves the built React app, so the whole project is **one web service on one URL**. On every start it applies pending migrations and loads the built-in foods (`server/src/db/migrate.ts`), so there are no manual database steps.

1. **Database:** create a free project at [neon.com](https://neon.com) and copy its connection string.
2. **Code:** push this folder to a GitHub repository.
3. **App:** on [render.com](https://render.com), create a **Web Service** from the repo with:

   | Setting | Value |
   |---|---|
   | Build command | `npm run render-build` |
   | Start command | `npm start` |
   | Instance type | Free |

   and these environment variables:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string |
   | `JWT_SECRET` | a long random string |
   | `USDA_API_KEY` | your USDA key (or `DEMO_KEY`) |

Free-tier note: Render puts the service to sleep after 15 minutes without traffic, and the first visit afterwards takes about a minute to wake it up.

## Useful scripts

| Where | Command | What it does |
|---|---|---|
| root | `npm run dev` | API and web app together |
| root | `npm run build` | Production build of both |
| server | `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| server | `npm run db:studio` | Browse the database in Drizzle Studio |
| root | `npm start` | Production: set up the database, then serve API + app on one port |
| client | `npm run lint` | Lint the front end |

## Ideas for next steps

- Barcode scanning (Open Food Facts API + the phone camera)
- Photo logging with an AI vision model
- Weight log with a trend line
- Saved meals (a group of foods logged in one tap)
- Tests (Vitest + Supertest) and a GitHub Actions pipeline
- Deploy: API + Postgres on Render or Railway, front end on Vercel
- A React Native app that reuses the same API
