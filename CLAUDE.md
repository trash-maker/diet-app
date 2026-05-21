# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Vite 8 + React 19 + TypeScript 6**
- **React Admin** (`ra-core` 5.x) — no backend, all data in localStorage
- **shadcn-admin-kit** — admin UI components built on shadcn/ui + Radix UI
- **Tailwind CSS v4** — configured via CSS only (`src/index.css`), no `tailwind.config.js`
- **React Router 7**, **TanStack Query 5**, **React Hook Form 7**

## Commands

```bash
npm run dev       # Vite dev server (localhost:5173)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
```

## Architecture

Pure client-side admin CRUD app — no backend. Data persists in localStorage via `ra-core`'s `localStorageStore()`.

The `<Admin>` component in `src/components/admin.tsx` wraps `ra-core`'s `CoreAdminContext`/`CoreAdminUI` and injects the custom Layout, LoginPage, ThemeProvider, and Ready components automatically. App.tsx just renders `<Admin>` and passes `dataProvider` + `Resource` children.

All shadcn-admin-kit components live in `src/components/` as individual `.tsx` files. They are re-exported through a single barrel at `src/components/index.ts`. The shadcn/ui primitives live in `src/components/ui/`.

## Import conventions

```ts
import { Admin } from "@/components/admin";          // Admin wrapper (specific file)
import { List, DataTable, TextInput } from "@/components"; // all other kit components via barrel
import { Resource } from "ra-core";                  // NOT from react-admin
import { Button } from "@/components/ui/button";    // shadcn primitives directly
import { cn } from "@/lib/utils";
```

The `@` alias maps to `src/`.

## Tailwind v4

No config file — all theme tokens are defined in `src/index.css` via `@theme inline { ... }`. Colors use OKLch. Dark mode via `.dark` class. Do not create `tailwind.config.js`.

## Windows setup gotchas (already fixed, do not reintroduce)

- `baseUrl` removed from `tsconfig.app.json` — deprecated in TypeScript 6; `paths` works without it
- `src/global.d.ts` declares `process.env` — kit components reference `process.env.NODE_ENV` for dev warnings
- `@types/lodash` is in devDependencies — required for kit components using `lodash/get`, `lodash/isEqual`, etc.
- Three kit files had `../ui/` instead of `./ui/` (already corrected): `array-input.tsx`, `bulk-export-button.tsx`, `cancel-button.tsx`
- `Github` icon removed from lucide-react v1.x — replaced with `ExternalLink` in `ready.tsx`

## Resources

Three React Admin resources, all stored in localStorage:

| Resource | File | Fields |
|---|---|---|
| `users` | `src/resources/users.tsx` | `name`, `gender` (male/female/other) |
| `ingredients` | `src/resources/ingredients.tsx` | `name` |
| `recipes` | `src/resources/recipes.tsx` | `name`, `ingredients[]`, `schedule`, `instructions` |

### Recipe data model

```ts
type Ingredient = { name: string; quantity: string; unit: string };

// schedule is keyed by userId, then by dayId, then list of mealIds
type Schedule  = Record<string, string[]>;          // { [dayId]: mealId[] }
type UserSchedules = Record<string, Schedule>;      // { [userId]: Schedule }

// dayIds:  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
// mealIds: "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner"
```

`ScheduleInput` renders a user selector (dropdown from the `users` resource) + a day×meal checkbox grid for the selected user. `ScheduleField` groups the display by user name.

### Instructions

Free-form markdown field rendered via `@uiw/react-md-editor`.

### Duplicate recipe

`CloneRecipeButton` (in `src/resources/recipes.tsx`) uses `useCreate` + `useRedirect` from `ra-core` to copy the current record (prepending "Copia di " to the name) and redirect to the edit page of the new record. It appears both as a row action in `RecipeList` and at the bottom of `RecipeShow`.

## Key conventions

- Use conventional commits
- `Resource` must be imported from `ra-core`, not `react-admin`
- All feature components import from `@/components` barrel, not from individual files in `@/components/admin`
