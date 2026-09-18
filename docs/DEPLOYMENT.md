# Deployment preparation — not deployed

Current v4 service/worker/schema instructions are in [V4_SETUP.md](V4_SETUP.md); operational instructions are in [ADMIN-GUIDE.md](ADMIN-GUIDE.md). The exact empty-project SQL bundle has been checked locally. The following launch checklist includes external validation still required.

This repository is a development preview. Complete the remaining items in PROGRESS.md before public launch. No hosting choice is finalized.

1. Review and test all migration files against LOCAL Supabase first. Docker Desktop and Supabase CLI are prerequisites. Do not run db reset or db push until explicitly approved.
2. Configure Auth phone/SMS and Google providers; allow the local callback URL and chosen production callback /auth/callback. Create staff accounts explicitly, never seed a shared production administrator password.
3. Populate .env.local from .env.example. Production values go into the host/Edge Function secret store; service-role and Turnstile secrets never get NEXT_PUBLIC_ prefixes.
4. Run all checks, including real RLS role tests and Supabase security/performance advisors. Generate database.types.ts from the validated local schema.
5. Complete video/WordPress migration dry runs with the real exclusion list. Review duplicate conflicts and uncertain event dates before publication. Remove marked sample rows only through reviewed, scoped SQL; do not publish this sample content.
6. Verify implemented push sending, event/parva reminder automation, retry/idempotency handling and retention of rate-limit/audit data against the configured project. Do not activate scheduled jobs or webhook senders before this is tested.
7. For the two supplied Edge Functions, configure SITE_URL, TURNSTILE_SECRET_KEY, IP_HASH_SECRET, WEBHOOK_SECRET and REVALIDATE_SECRET. Verify expected gateway IP headers and CORS origins. Configure authenticated webhooks only after local testing.
8. Select Vercel's suitable commercial plan or Cloudflare Workers/OpenNext, then validate that adapter's production build, cache invalidation and image handling. This repo currently builds native Next.js; OpenNext deployment wiring is not installed.
9. Set NEXT_PUBLIC_DEMO_MODE=false, NEXT_PUBLIC_SITE_URL to the real HTTPS origin, and use a separate confirmed production Supabase project. The owner should apply reviewed production migrations; this agent has not done so.
10. Verify mobile performance, accessible contrast/touch targets, real Android installation and iOS home-screen behavior. iOS web push requires an installed home-screen app and user opt-in.
11. Configure DNS/CDN without caching admin/account/auth responses. Review CSP before enabling additional external services. Test all legacy redirect cases and structured metadata.
12. Back up the existing WordPress site and database. Keep it available for rollback until import counts, media links, redirects and critical user flows are verified. Restore the previous host/DNS and application build on rollback; never reset production data to recover a frontend deployment.
