# Diet App

Client-side diet management admin built with React Admin + shadcn/ui. No backend — all data persists in browser localStorage.

## Stack

- **Vite 8 / React 19 / TypeScript 6**
- **React Admin** (`ra-core` 5.x) with `ra-data-local-storage`
- **shadcn-admin-kit** — admin UI on top of shadcn/ui + Radix UI
- **Tailwind CSS v4** (CSS-only config, no `tailwind.config.js`)
- **React Router 7**, **TanStack Query 5**, **React Hook Form 7**

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run lint     # ESLint
```

## Features

### Users
Basic patient registry with name and gender.

### Ingredients
Ingredient catalog used for recipe autocomplete.

### Recipes
Each recipe has:
- **Ingredients** — list with quantity and unit (g, kg, ml, l, pz, cucchiaio, cucchiaino, tazza, q.b.)
- **Schedule** — per-user day × meal assignment grid (7 days × 5 meals: colazione, spuntino mattina, pranzo, merenda, cena)
- **Instructions** — free-form markdown

Recipe scheduling is user-specific: the schedule grid is scoped to a selected user, so different users can have the same recipe on different days and meals.

A **Duplica** button is available on each row in the list and on the detail page — it creates a copy of the recipe (name prefixed with "Copia di") and opens it in the editor.

### Meal Plans
Weekly meal plans assign recipes to users for specific days and meals.

Each plan has:
- **Week** — reference Monday date; any selected date is normalised to Monday automatically
- **Slots** — a user × meal grid navigated by day; each cell holds an optional recipe (chosen from a searchable dialog filtered by the recipe's schedule) and a free-text note

The show page mirrors the edit layout with a read-only version of the same day/user/meal grid.

## Data model

```
users        { id, name, gender }
ingredients  { id, name }
recipes      { id, name, ingredients[], schedule, instructions }
meal-plans   { id, weekStart, slots }
```

`schedule` shape: `Record<userId, Record<dayId, mealId[]>>`

`slots` shape: `Record<userId, Record<dayId, Record<mealId, { recipeId, note }>>>`

## Project structure

```
src/
  App.tsx                  # Admin + Resource declarations
  resources/
    users.tsx
    ingredients.tsx
    recipes.tsx            # ScheduleInput, MarkdownInput, IngredientsInput
    meal-plans.tsx         # WeekInput, SlotsInput, SlotsField, recipe picker dialog
  components/              # shadcn-admin-kit components + shadcn/ui primitives
  lib/
    i18nProvider.ts        # Full Italian translation
    utils.ts
  index.css                # Tailwind v4 theme tokens (OKLch colors)
```
