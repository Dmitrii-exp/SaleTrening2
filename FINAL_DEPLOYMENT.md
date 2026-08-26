# SaleTrening2.0 — deployment checklist

## GitHub
Upload the project root, including `package.json`, `tsconfig.json`, `next.config.ts`, `proxy.ts`, `lib/`, `app/`, and `supabase/`.

## Vercel
Import the GitHub repository as a Next.js project. Add:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- GIGACHAT_AUTH_KEY
- GIGACHAT_MODEL=GigaChat
- optional NEXT_PUBLIC_APP_URL

Redeploy after changing environment variables.

## Supabase
Run the SQL files in `supabase/migrations/` in chronological order. Before production, verify the existing `profiles` and `saletrening_scenarios` schemas match the migrations, especially primary-key types and role values.

## First smoke test
1. Sign in.
2. Open `/training/realtime`.
3. Select a published scenario.
4. Send a manager message.
5. Confirm GigaChat returns the client response.
6. Finish the session and confirm `realtime_training_sessions`.
7. Run AI feedback and confirm `realtime_training_feedback`.
8. Check `/profile`, `/training/plan`, `/achievements`.
9. For manager accounts check `/dashboard`, `/dashboard/goals`, `/dashboard/recommendations`.
10. Test voice mode in a supported browser.

## Note
The source bundle is prepared for Vercel. A production build cannot be executed in this runtime because package installation requires external npm registry access; Vercel will install dependencies during deployment. Treat the first Vercel deployment as the build verification step and fix any schema/environment mismatch shown in the build logs before going live.
