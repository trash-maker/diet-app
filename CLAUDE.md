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
import { Admin, List, DataTable, TextInput } from "@/components/admin"; // kit components via barrel
import { Resource } from "ra-core";                                       // NOT from react-admin
import { Button } from "@/components/ui/button";                         // shadcn primitives directly
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

## Key conventions

- Use conventional commits
- `Resource` must be imported from `ra-core`, not `react-admin`
- All feature components import from `@/components` barrel, not from individual files in `@/components/admin`
