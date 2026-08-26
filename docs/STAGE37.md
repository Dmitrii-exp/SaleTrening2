# Stage 37 — AI Learning Loop

The AI block is now connected into a learning loop:
1. GigaChat runs the real-time client.
2. GigaChat analyzes the completed session.
3. Feedback is stored in Supabase.
4. The system identifies the weak skill from feedback.
5. A published company scenario is automatically selected.
6. The recommended scenario opens directly in Real-time training.

Keys stay server-side. The next-scenario selector is deterministic and auditable; it does not invent a scenario.
