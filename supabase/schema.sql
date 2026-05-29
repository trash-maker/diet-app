-- ============================================================
-- Diet App — Supabase schema + RLS policies
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

create table public.users (
  id   bigint generated always as identity primary key,
  name text   not null,
  gender text check (gender in ('male', 'female', 'other'))
);

create table public.ingredients (
  id          bigint generated always as identity primary key,
  name        text not null,
  description text,
  category    text
);

create table public.recipes (
  id           bigint generated always as identity primary key,
  name         text   not null,
  link         text,
  ingredients  jsonb  not null default '[]'::jsonb,
  schedule     jsonb  not null default '{}'::jsonb,
  instructions text
);

-- Note: the resource is named "meal-plans" in the app.
-- PostgREST exposes tables at /rest/v1/<table_name>, so the
-- table must be named exactly "meal-plans" (quoted identifier).
create table public."meal-plans" (
  id                    bigint generated always as identity primary key,
  "weekStart"           text   not null,   -- ISO date of Monday: "YYYY-MM-DD"
  slots                 jsonb  not null default '{}'::jsonb,
  "shoppingListChecked" jsonb  not null default '[]'::jsonb
);

-- ------------------------------------------------------------
-- GRANTS
-- RLS controls row visibility, but the role must also have
-- table-level privileges. Grant DML + sequence usage so that
-- authenticated users can read, insert, update and delete.
-- ------------------------------------------------------------

grant select, insert, update, delete on public.users          to authenticated;
grant select, insert, update, delete on public.ingredients    to authenticated;
grant select, insert, update, delete on public.recipes        to authenticated;
grant select, insert, update, delete on public."meal-plans"   to authenticated;

-- Needed for identity (auto-increment) columns on INSERT
grant usage, select on all sequences in schema public to authenticated;

-- Uncomment if you also want anonymous (unauthenticated) read access:
-- grant select on public.users, public.ingredients, public.recipes, public."meal-plans" to anon;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Enable RLS on every table, then choose ONE of the two policy
-- blocks below depending on whether you want authentication.
-- ------------------------------------------------------------

alter table public.users          enable row level security;
alter table public.ingredients    enable row level security;
alter table public.recipes        enable row level security;
alter table public."meal-plans"   enable row level security;

-- ------------------------------------------------------------
-- OPTION A — Authenticated users only (recommended)
-- Users must log in via Supabase Auth (email/password).
-- Create the first user in Dashboard > Authentication > Users.
-- ------------------------------------------------------------

create policy "authenticated_all_users"
  on public.users for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_ingredients"
  on public.ingredients for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_recipes"
  on public.recipes for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_meal_plans"
  on public."meal-plans" for all
  to authenticated
  using (true)
  with check (true);

-- ------------------------------------------------------------
-- OPTION B — Anonymous access (no login required)
-- Uncomment this block and comment out Option A if you prefer
-- to skip authentication entirely.
-- ------------------------------------------------------------

-- create policy "anon_all_users"
--   on public.users for all to anon using (true) with check (true);
--
-- create policy "anon_all_ingredients"
--   on public.ingredients for all to anon using (true) with check (true);
--
-- create policy "anon_all_recipes"
--   on public.recipes for all to anon using (true) with check (true);
--
-- create policy "anon_all_meal_plans"
--   on public."meal-plans" for all to anon using (true) with check (true);

-- ------------------------------------------------------------
-- OPTIONAL: seed data (copy from src/data/data.ts if needed)
-- ------------------------------------------------------------
-- insert into public.users (name, gender) values ('Stefano', 'male'), ('Fabiola', 'female');
