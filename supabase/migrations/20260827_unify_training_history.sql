-- Unify legacy K2 training history into SaleTrening2 realtime_training_sessions.
-- Existing source tables are retained as a rollback/archive source; new application reads unified sessions.

insert into public.realtime_training_sessions (
  id, company_id, employee_id, scenario_id, messages, engine_state,
  score, duration_seconds, ai_feedback, created_at, completed_at
)
select
  s.id,
  s.company_id,
  s.employee_id,
  s.scenario_id,
  coalesce(s.transcript, '[]'::jsonb),
  coalesce(s.ai_evaluation, '{}'::jsonb),
  greatest(0, least(100, coalesce(s.total_score, 0))),
  coalesce(s.duration_seconds, 0),
  coalesce(nullif(s.ai_summary, ''), nullif(s.feedback, '')),
  s.created_at,
  s.completed_at
from public.saletrening_sessions s
on conflict (id) do nothing;

insert into public.realtime_training_sessions (
  id, company_id, employee_id, scenario_id, messages, engine_state,
  score, duration_seconds, ai_feedback, created_at, completed_at
)
select
  r.id,
  r.company_id,
  r.employee_id,
  r.scenario_id,
  jsonb_build_array(jsonb_build_object('role','manager','content',coalesce(r.answer,''))),
  jsonb_build_object(
    'stageScores', jsonb_build_object(
      'opening', greatest(0, least(100, coalesce(r.need_score,0) * 10)),
      'discovery', greatest(0, least(100, coalesce(r.need_score,0) * 10)),
      'objection', greatest(0, least(100, coalesce(r.objection_score,0) * 10)),
      'value', greatest(0, least(100, coalesce(r.value_score,0) * 10)),
      'closing', greatest(0, least(100, coalesce(r.close_score,0) * 10))
    )
  ),
  greatest(0, least(100, coalesce(r.total_score, 0))),
  0,
  nullif(r.answer, ''),
  r.created_at,
  r.created_at
from public.training_results r
on conflict (id) do nothing;

with agg as (
  select
    company_id,
    employee_id,
    count(*) as total_sessions,
    round(avg(score), 2) as average_score,
    max(created_at) as last_session_at
  from public.realtime_training_sessions
  where completed_at is not null
  group by company_id, employee_id
)
insert into public.employee_learning_profiles (
  company_id, employee_id, total_sessions, average_score,
  current_difficulty, recommended_focus, last_session_at, updated_at
)
select
  company_id,
  employee_id,
  total_sessions,
  average_score,
  case
    when average_score >= 80 then 'advanced'
    when average_score >= 60 then 'medium'
    else 'beginner'
  end,
  'discovery',
  last_session_at,
  now()
from agg
on conflict (company_id, employee_id)
do update set
  total_sessions = excluded.total_sessions,
  average_score = excluded.average_score,
  current_difficulty = excluded.current_difficulty,
  last_session_at = excluded.last_session_at,
  updated_at = now();
