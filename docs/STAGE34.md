# Stage 34 — Real-time Results Persistence

Adds persistent Real-time training sessions:
- full dialogue JSON
- final engine state
- score
- duration
- scenario/company/employee linkage
- completion timestamp
- RLS policies

The trainer can explicitly finish a session; the server validates company/scenario ownership, calculates a deterministic score, and saves the result to Supabase.
