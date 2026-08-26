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
 unique(company_id,employee_id)
);
alter table public.employee_learning_profiles enable row level security;
create policy "learning_profile_company_read" on public.employee_learning_profiles for select to authenticated using (company_id=(select company_id from public.profiles where id=auth.uid()));
create policy "learning_profile_employee_upsert" on public.employee_learning_profiles for insert to authenticated with check (employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid()));
create policy "learning_profile_employee_update" on public.employee_learning_profiles for update to authenticated using (employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid())) with check (employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid()));
create index if not exists learning_profiles_company_idx on public.employee_learning_profiles(company_id);
