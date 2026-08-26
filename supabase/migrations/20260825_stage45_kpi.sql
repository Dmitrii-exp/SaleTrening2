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
 unique(company_id,employee_id,period_start)
);
alter table public.employee_training_goals enable row level security;
create policy "training_goals_company_read" on public.employee_training_goals for select to authenticated using(company_id=(select company_id from public.profiles where id=auth.uid()));
create policy "training_goals_manager_write" on public.employee_training_goals for all to authenticated using(company_id=(select company_id from public.profiles where id=auth.uid()) and (select role from public.profiles where id=auth.uid()) in ('manager','director','admin')) with check(company_id=(select company_id from public.profiles where id=auth.uid()) and (select role from public.profiles where id=auth.uid()) in ('manager','director','admin'));
create index if not exists employee_training_goals_company_idx on public.employee_training_goals(company_id);
