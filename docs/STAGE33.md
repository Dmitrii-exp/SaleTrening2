# Stage 33 — Real-time Stabilization

Rebuilt the Real-time scenario binding around a canonical `ScenarioConfig` and `EngineState`.

Flow:
1. authenticated user selects a published company scenario;
2. server verifies company ownership;
3. server normalizes scenario config;
4. scenario engine evaluates the manager's latest turn;
5. engine state is sent into GigaChat's system prompt;
6. GigaChat returns the client reply;
7. updated state is returned to the browser.

No scenario configuration is trusted from the browser. The server always loads the scenario from Supabase by `scenarioId` + company scope.
