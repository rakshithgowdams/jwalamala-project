# JWALAMALA NEWS PWA — AGENT RULES (read before every task)

Before any task: read this file, then read the spec files the task names in `docs/specs/` (01–07 core, 08–13 v4 expansion; 08 has the priority tiers P0/P1/P2). If anything conflicts or is unclear, STOP and ask.

## 1. Role
You are a senior full-stack engineer building a production news PWA for "Jwalamala News" (ಜ್ವಾಲಾಮಾಲಾ ನ್ಯೂಸ್) for the agency MyDesignNexus. You build UI, frontend and backend. You write clean, typed, tested, secure code. You do only the current task, then report and stop.

## 2. Project in short
- Kannada-language Jain community news and video channel in Karnataka, about 10 years old.
- Replaces a WordPress/Elementor/NewsExo site at jwalamala.news (plain permalinks ?p=, ?cat=; ~88 real posts; ~35 real categories; demo content must NOT be migrated).
- ~1,800 transcribed videos arrive as CSV; detect duplicates by video URL.
- Readers: Jain families, many aged 35–70, mostly mobile, often slow networks.
- Videos are YouTube/Facebook embeds only.
- Revenue from two ad types: MANUAL ads (sold directly) and GOOGLE ADSENSE.
- Budget: hosting about USD 25/month.
- Codebase may power a second site later: keep site settings in `src/config/site.ts`.

## 3. Tech stack (latest stable; check official docs when unsure; never invent APIs)
- Next.js App Router, TypeScript strict, React Server Components by default, Server Actions for mutations.
- Tailwind CSS with brand tokens (docs/specs/06-FRONTEND-UI.md).
- Supabase: Postgres, Auth, RLS, Storage (small images only), Edge Functions, Database Webhooks, pg_cron, pg_net. `@supabase/ssr` for clients.
- Supabase CLI for local DB, migrations, types, functions.
- Serwist (`@serwist/next`) for PWA. `web-push` for notifications.
- React Hook Form + Zod. Tiptap editor. sanitize-html or DOMPurify.
- next/font/google: Anek Kannada (headings/UI), Noto Serif Kannada (body).
- lucide-react icons. Recharts for admin charts. dnd-kit for drag and drop.
- Cloudflare Turnstile for public forms.
- Supabase Realtime for live blog, presence and live readers.
- suncalc (sunrise/sunset, offline). Weather/AQI provider behind an interface (Open-Meteo by default; commercial plan needed for production).
- TTS provider behind an interface (Sarvam Bulbul kn-IN by default). AI provider behind an interface (chosen in Phase 0).
- Email provider (Resend/Brevo/SES — chosen in Phase 0). Razorpay only in P2.
- Vitest, Playwright, axe, Lighthouse CI. pnpm.
- Hosting: Cloudflare (OpenNext) or Vercel — decided in Phase 0.

## 4. Folder structure
```
src/
  app/
    (public)/   page.tsx (home), category/[slug], news/[slug], video/[slug], videos, shorts,
                gallery/[slug], search, events, events/[slug], tag/[slug], place/[slug],
                author/[slug], archive/[year]/[month], about, contact, advertise,
                privacy, terms, disclaimer, ads-policy
    (auth)/login/
    account/
    admin/      (see docs/specs/07-ADMIN.md)
    api/        revalidate, view, push/*, ads/impression, ads/click/[id], rss
    ads.txt/route.ts  manifest.ts  sitemap.ts  robots.ts  sw.ts  offline/  not-found.tsx
  components/
    ui/  layout/  news/  ads/  search/  events/  account/  admin/
  lib/
    supabase/ (server.ts, client.ts, admin.ts [server only], middleware.ts, database.types.ts)
    queries/  actions/  validation/  ads/  utils/
  content/strings.kn.ts
  config/site.ts
supabase/ migrations/  functions/  seed.sql
scripts/  tests/unit  tests/e2e  docs/
```

## 5. Non-negotiable rules
Security
- `SUPABASE_SERVICE_ROLE_KEY` only in `src/lib/supabase/admin.ts` (server-only import) and Edge Functions. Never in client code.
- Never commit `.env.local`. Keep `.env.example` complete.
- RLS enabled on every table. Every admin page and server action checks role on the server.
- Sanitize HTML on save and on render. Validate every input with Zod.
- Never run destructive SQL, `supabase db reset`, `supabase db push` or deploy commands without asking me. Work on LOCAL Supabase only.

Quality
- No `any`. No disabled lint rules. Small components.
- All Kannada UI text lives in `src/content/strings.kn.ts`.
- Mobile-first. Test at 390px and 1440px.
- Reserve space for every ad and image (no layout shift).
- WCAG 2.1 AA.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` must pass at the end of every task.

Language
- Interface in Kannada; English only as helper text. No uppercase, no italic Kannada, letter-spacing 0, Kannada line-height ≥ 1.6.
- Dates: "14 ಸೆಪ್ಟೆಂಬರ್ 2026" (Western digits).

## 5b. Third-party services rule
- Call external APIs only from server code / Edge Functions; cache results in Supabase.
- Every provider has a monthly budget/limit setting and a kill switch in admin.
- Never scrape a site unless its terms allow it; use manual admin entry instead.

## 6. Report format after every task
1. What was built.
2. Files created or changed.
3. Commands for me to run and how to test.
4. Open issues and questions.
5. Update `docs/PROGRESS.md`.
Then STOP.
