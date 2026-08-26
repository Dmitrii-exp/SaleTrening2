-- Keep the realtime session schema compatible with saletrening_scenarios.id (bigint).
-- The original stage34 migration declared scenario_id as uuid; current production is bigint.
-- Idempotent: does nothing when the column is already bigint.

do $$
declare
  current_type text;
  rows_count bigint;
begin
  select udt_name
    into current_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'realtime_training_sessions'
    and column_name = 'scenario_id';

  if current_type = 'uuid' then
    select count(*) into rows_count from public.realtime_training_sessions;
    if rows_count > 0 then
      raise exception 'Cannot safely convert realtime_training_sessions.scenario_id from uuid to bigint while rows exist';
    end if;

    alter table public.realtime_training_sessions
      drop constraint if exists realtime_training_sessions_scenario_id_fkey;

    alter table public.realtime_training_sessions
      alter column scenario_id type bigint using null::bigint;

    alter table public.realtime_training_sessions
      add constraint realtime_training_sessions_scenario_id_fkey
      foreign key (scenario_id) references public.saletrening_scenarios(id) on delete restrict;
  end if;
end $$;
