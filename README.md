# SaleTrening2.0

Production-oriented Next.js App Router source for the SaleTrening AI sales trainer.

## Stack
- Next.js 16 + React 19 + TypeScript
- Supabase Auth/Postgres/RLS
- GigaChat server-side API integration
- Vercel deployment target

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Fill Supabase and GigaChat variables.
3. Run `npm install`.
4. Run `npm run dev`.

## Production
Push the repository to GitHub and import it into Vercel. Add the variables from `.env.example` in Vercel. Apply the SQL migrations in `supabase/migrations/` in chronological order.

Never expose `GIGACHAT_AUTH_KEY` to the browser or prefix it with `NEXT_PUBLIC_`.
