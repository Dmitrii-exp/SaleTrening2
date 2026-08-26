# SaleTrening2.0 — Supabase compatibility

This build targets the existing `K2-trener` Supabase project.

Verified existing schema:
- `profiles` uses `first_name` / `last_name`
- `saletrening_scenarios.id` is `bigint`
- scenarios use `active` rather than `status`
- `user_notifications` uses `user_id`
- `realtime_training_sessions.scenario_id` is `bigint`
- realtime sessions and feedback already exist

The application was patched to use those existing structures instead of requiring destructive schema changes.

Only two missing tables are added by:
`supabase/migrations/20260826_stage55_existing_k2_compat.sql`

Do not run old migrations that attempt to recreate or alter the existing realtime/scenario schema blindly. The compatibility migration is the intended migration for the current database.
