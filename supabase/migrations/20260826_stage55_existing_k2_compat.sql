-- SaleTrening2.0 compatibility layer for the existing K2-trener Supabase project.
-- Safe: creates only missing tables; does not drop or alter existing tables.

create table if not exists public.employee_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references auth.users(id) on delete cascade,
  skill_scores jsonb not null default '{}'::jsonb,
  total_sessions integer not null default 0,
  average_score numeric(5,2) not null default 0,
  current_difficulty text not null default 'medium',
  recommended_focus text not null default '',
  last_session_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(company_id, employee_id)
);

alter table public.employee_learning_profiles enable row level security;

do $$ begin
  create policy "learning_profile_company_read"
  on public.employee_learning_profiles for select to authenticated
  using (company_id=(select company_id from public.profiles where id=auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "learning_profile_employee_insert"
  on public.employee_learning_profiles for insert to authenticated
  with check (employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "learning_profile_employee_update"
  on public.employee_learning_profiles for update to authenticated
  using (employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid()))
  with check (employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid()));
exception when duplicate_object then null; end $$;

create index if not exists learning_profiles_company_idx
  on public.employee_learning_profiles(company_id);

create table if not exists public.employee_training_goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references auth.users(id) on delete cascade,
  target_score integer not null default 80 check(target_score between 0 and 100),
  target_sessions integer not null default 10 check(target_sessions >= 1),
  period_start date not null default current_date,
  period_end date not null default (current_date + 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, employee_id, period_start)
);

alter table public.employee_training_goals enable row level security;

do $$ begin
  create policy "training_goals_company_read"
  on public.employee_training_goals for select to authenticated
  using (company_id=(select company_id from public.profiles where id=auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_goals_manager_write"
  on public.employee_training_goals for all to authenticated
  using (
    company_id=(select company_id from public.profiles where id=auth.uid())
    and (select role from public.profiles where id=auth.uid()) in ('manager','director','admin')
  )
  with check (
    company_id=(select company_id from public.profiles where id=auth.uid())
    and (select role from public.profiles where id=auth.uid()) in ('manager','director','admin')
  );
exception when duplicate_object then null; end $$;

create index if not exists employee_training_goals_company_idx
  on public.employee_training_goals(company_id);
