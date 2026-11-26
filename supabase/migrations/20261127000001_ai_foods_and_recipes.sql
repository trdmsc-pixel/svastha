-- Migration: Support AI-discovered foods in cloud `foods` catalog & cloud-synced personalized AI recipes

-- 1. Allow 'ai_gemini' as a food source and track optional metadata
alter table public.foods drop constraint if exists foods_source_check;
alter table public.foods add constraint foods_source_check
  check (source in ('IFCT2017', 'USDA', 'OFF', 'custom', 'ai_gemini'));

alter table public.foods add column if not exists diet_tags text[] default '{}';
alter table public.foods add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.foods add column if not exists created_at timestamptz not null default now();

create index if not exists idx_foods_name_lower on public.foods (lower(name));

-- Allow authenticated users to insert newly AI-recognized foods into the shared cloud catalog
drop policy if exists "authenticated_insert_ai_foods" on public.foods;
create policy "authenticated_insert_ai_foods" on public.foods
  for insert
  to authenticated
  with check (source in ('ai_gemini', 'custom') and (created_by is null or created_by = auth.uid()));

-- 2. Cloud-persisted personalized AI recipes per user
create table if not exists public.user_ai_recipes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slot text not null check (slot in ('breakfast', 'lunch', 'snack', 'dinner')),
  cuisine text not null default 'Indian',
  minutes int not null default 20,
  difficulty int not null default 2,
  diet_tags text[] default '{}',
  focus text[] default '{}',
  biomarker_benefits text[] default '{}',
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  per_serving jsonb,
  why text,
  craving_prompt text,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_ai_recipes_user_created on public.user_ai_recipes (user_id, created_at desc);

alter table public.user_ai_recipes enable row level security;
drop policy if exists "user_own_ai_recipes" on public.user_ai_recipes;
create policy "user_own_ai_recipes" on public.user_ai_recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
