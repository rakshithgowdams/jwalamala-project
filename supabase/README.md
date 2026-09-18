# Local database setup

These SQL files have been written but NOT applied or verified against Postgres. Review them before running any migration. Docker Desktop and a Supabase CLI installation are required; neither was available on PATH during the build.

1. Run `supabase init` in this project (creates local config).
2. Run `supabase start` and put the local URL and anon key in .env.local.
3. Review all migrations in order. Only with your explicit approval, run `supabase db reset` against LOCAL Supabase.
4. Generate database types: `supabase gen types typescript --local > src/lib/supabase/database.types.ts`.
5. Set NEXT_PUBLIC_DEMO_MODE=false and restart Next.js.
6. Create a user via Supabase Auth. Promote only the intended local staff account through Studio. No shared admin password is seeded.

Additional work before production: execute RLS integration tests; run database advisors; verify migrations and RPC transaction behavior; configure SMS/Google Auth, Turnstile, VAPID, editor notification delivery and scheduled jobs. The scheduled publisher function is supplied but no cron job is enabled automatically.

Anonymous push subscriptions are intentionally not enabled in this version: subscriptions require a reader account so ownership can be checked. Raw public Supabase REST responses are not cached by the service worker, preventing accidental staff-data caching.
