create table if not exists public.realtime_training_sessions (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references auth.users(id) on delete cascade,
 scenario_id uuid not null references public.saletrening_scenarios(id) on delete restrict,
 messages jsonb not null default '[]'::jsonb,
 engine_state jsonb not null default '{}'::jsonb,
 score integer not null default 0 check (score between 0 and 100),
 duration_seconds integer not null default 0,
 ai_feedback text,
 created_at timestamptz not null default now(),
 completed_at timestamptz
);
create index if not exists realtime_sessions_company_idx on public.realtime_training_sessions(company_id, created_at desc);
create index if not exists realtime_sessions_employee_idx on public.realtime_training_sessions(employee_id, created_at desc);
alter table public.realtime_training_sessions enable row level security;
create policy "realtime_sessions_company_read" on public.realtime_training_sessions for select to authenticated using (
 company_id=(select company_id from public.profiles where id=auth.uid())
);
create policy "realtime_sessions_employee_insert" on public.realtime_training_sessions for insert to authenticated with check (
 employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid())
);
create policy "realtime_sessions_employee_update" on public.realtime_training_sessions for update to authenticated using (
 employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid())
) with check (
 employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid())
);
