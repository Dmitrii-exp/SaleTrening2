# Stage 39 — Adaptive AI Difficulty

Real-time training now reads the employee learning profile and chooses an effective difficulty:
- strong progress can move a scenario upward
- weak performance can move it downward
- scenario difficulty remains bounded so the AI does not jump unrealistically
- GigaChat receives explicit behavior instructions for easy/medium/hard

The selected effective difficulty is returned to the UI.
