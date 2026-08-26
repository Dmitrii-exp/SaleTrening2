create table if not exists public.training_notifications (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references auth.users(id) on delete cascade,
 type text not null,
 title text not null,
 body text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.training_notifications enable row level security;
create policy "notifications_employee_read" on public.training_notifications for select to authenticated using(employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid()));
create policy "notifications_employee_update" on public.training_notifications for update to authenticated using(employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid())) with check(employee_id=auth.uid() and company_id=(select company_id from public.profiles where id=auth.uid()));
create index if not exists training_notifications_employee_idx on public.training_notifications(employee_id,created_at desc);
