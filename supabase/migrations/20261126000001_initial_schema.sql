-- Svastha Initial Schema (Section 9)
-- Region target: ap-south-1 (Mumbai, India) — DPDP Act 2023 + Rules 2025
-- Privacy invariant: NO image or PDF file columns on meal_logs or reports.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  dob date not null,
  sex text check (sex in ('M','F','other')),
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  waist_cm numeric(5,2),
  target_weight_kg numeric(5,2),
  city text,
  diet_type text default 'vegetarian',
  fasting_practices text[] default '{}',
  activity_level text default 'moderate',
  job_type text default 'desk',
  wake_time text default '06:30',
  sleep_time text default '22:45',
  cuisine_prefs text[] default '{}',
  budget_level text default 'moderate',
  goals text[] default '{}',
  units text default 'metric',
  language text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Health background
create table if not exists public.health_background (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  conditions text[] default '{}',
  family_history text[] default '{}',
  allergies text[] default '{}',
  smoking text default 'never',
  alcohol_units_week numeric(4,1) default 0,
  pregnant boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

-- 3. Medications (user-entered prescribed medicines only)
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dose_text text,
  schedule jsonb default '{}'::jsonb,
  prescribed_by text,
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. User supplements
create table if not exists public.supplements_user (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dose_text text,
  schedule jsonb default '{}'::jsonb,
  doctor_approved boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. Reports (NO file stored by design)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_name text not null,
  collected_at timestamptz not null,
  reported_at timestamptz,
  source_type text not null check (source_type in ('pdf','photo','sample')),
  extraction_confidence numeric(4,3),
  created_at timestamptz not null default now()
);

-- 6. Report values
create table if not exists public.report_values (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  biomarker_code text not null,
  raw_name text not null,
  value numeric not null,
  value_text text,
  unit text not null,
  ref_low numeric,
  ref_high numeric,
  ref_operator text,
  status text not null,
  severity numeric(5,2) default 0,
  lab_flag text,
  confidence numeric(4,3) default 1.0,
  user_edited boolean not null default false
);

-- 7. Report summaries (versioned prompts)
create table if not exists public.report_summaries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  summary jsonb not null,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);

-- 8. Public Reference Tables
create table if not exists public.biomarker_dictionary (
  code text primary key,
  display_name text not null,
  synonyms text[] default '{}',
  system text not null,
  canonical_unit text not null,
  conversions jsonb default '{}'::jsonb,
  default_ranges jsonb default '{}'::jsonb,
  explainer_md text
);

create table if not exists public.red_flag_rules (
  id text primary key,
  biomarker_code text not null,
  operator text not null,
  threshold numeric not null,
  unit text not null,
  message text not null
);

create table if not exists public.retest_windows (
  biomarker_group text primary key,
  weeks_min int not null,
  weeks_max int not null,
  source_note text not null
);

-- 9. Plans, Tasks, Task Logs
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  status text not null default 'active' check (status in ('active','archived')),
  targets jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '{}'::jsonb,
  daily_targets jsonb not null default '{}'::jsonb,
  sections jsonb not null default '{}'::jsonb,
  start_date date not null default current_date,
  retest_date date not null,
  version int not null default 1,
  model text,
  prompt_version text,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('meal','exercise','sleep','water','med','supplement','routine','measure')),
  title text not null,
  details jsonb default '{}'::jsonb,
  scheduled_at text not null,
  repeat_rule text not null default 'daily',
  reminder boolean not null default true,
  calendar_sync boolean not null default true,
  device_event_id text
);

create table if not exists public.task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.plan_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  status text not null check (status in ('done','skipped','missed','snoozed')),
  at timestamptz not null default now()
);

-- 10. Nutrition & Meals (NO image column on meal_logs by design)
create table if not exists public.foods (
  id text primary key,
  name text not null,
  name_hi text,
  synonyms text[] default '{}',
  source text not null check (source in ('IFCT2017','USDA','OFF','custom')),
  per_100g jsonb not null,
  household_units jsonb not null default '{}'::jsonb,
  image_key text not null,
  embedding vector(1536)
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  slot text not null check (slot in ('breakfast','lunch','snack','dinner')),
  source text not null check (source in ('photo','search','barcode','voice','plan')),
  total jsonb not null,
  ai_confidence numeric(4,3),
  created_at timestamptz not null default now()
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id text references public.foods(id),
  name text not null,
  qty numeric not null,
  unit text not null,
  grams numeric not null,
  nutrients jsonb not null
);

create table if not exists public.meal_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ai_name text not null,
  corrected_food_id text references public.foods(id),
  ai_grams numeric,
  corrected_grams numeric,
  created_at timestamptz not null default now()
);

-- 11. Water, Body, Routines, Push, Consents, Recipes, Rate Limits
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ml int not null check (ml > 0),
  at timestamptz not null default now()
);

create table if not exists public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,2),
  waist_cm numeric(5,2),
  at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  blocks jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  categories jsonb not null default '{"water":true,"meals":true,"medicines":true,"routine":true,"retest":true}'::jsonb,
  quiet_start text not null default '22:30',
  quiet_end text not null default '07:00',
  daily_cap int not null default 12
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table if not exists public.recipes (
  id text primary key,
  name text not null,
  image_key text not null,
  minutes int not null,
  difficulty int not null default 1,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  per_serving jsonb not null,
  tags text[] default '{}'
);

create table if not exists public.ai_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, endpoint, day)
);

-- Indexes (Section 9)
create index if not exists idx_meal_logs_user_eaten on public.meal_logs (user_id, eaten_at desc);
create index if not exists idx_reports_user_collected on public.reports (user_id, collected_at desc);
create index if not exists idx_report_values_report_code on public.report_values (report_id, biomarker_code);
create index if not exists idx_water_logs_user_at on public.water_logs (user_id, at desc);
create index if not exists idx_task_logs_user_date on public.task_logs (user_id, date desc);

-- Row Level Security (RLS) on EVERY user table
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'health_background','medications','supplements_user','reports','report_values',
    'report_summaries','plans','plan_tasks','task_logs','meal_logs','meal_items',
    'meal_corrections','water_logs','body_logs','routines','push_tokens',
    'notification_prefs','consents','ai_rate_limits'
  ]
  loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format('drop policy if exists "user_own_rows" on public.%I;', tbl);
    execute format(
      'create policy "user_own_rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      tbl
    );
  end loop;
end $$;

-- Profiles RLS (uses id = auth.uid())
alter table public.profiles enable row level security;
drop policy if exists "profile_own_row" on public.profiles;
create policy "profile_own_row" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Public read-only reference tables
do $$
declare
  pub_tbl text;
begin
  foreach pub_tbl in array array['biomarker_dictionary','red_flag_rules','retest_windows','foods','recipes']
  loop
    execute format('alter table public.%I enable row level security;', pub_tbl);
    execute format('drop policy if exists "public_read" on public.%I;', pub_tbl);
    execute format('create policy "public_read" on public.%I for select using (true);', pub_tbl);
  end loop;
end $$;
