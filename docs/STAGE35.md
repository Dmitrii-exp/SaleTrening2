# Stage 35 — AI Training Feedback

Adds GigaChat post-session analysis:
- summary
- strengths
- mistakes
- missed discovery questions
- objection handling assessment
- stage scores
- recommendations
- next training focus

The analysis is generated server-side and stored by session with company-scoped RLS. `GIGACHAT_AUTH_KEY` is never sent to the browser.
