# Stage 40 — Voice AI Training

Adds a browser voice layer on top of the existing Real-time AI engine:
- Russian speech recognition via Web Speech API
- spoken GigaChat client responses via SpeechSynthesis
- scenario selection
- same server-side scenario security and GigaChat key handling
- no AI key exposed to the browser

The voice layer sends recognized text into the existing `/api/training/realtime` flow, so scoring, scenario engine, adaptive difficulty and persistence remain centralized.
