# Jwalamala News PWA

Kannada-first Next.js news app using the supplied Jwalamala logo. This is a **local development preview with clearly labeled sample content**, not a production launch.

## Run

Install Node.js 22+ and pnpm, then:

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. For install/offline testing use:

```sh
pnpm build
pnpm start
```

The service worker is deliberately disabled during development. Kannada font files are bundled locally; browsers receive self-hosted files.

On this Windows workstation, Node and pnpm were available through local tooling rather than the shell PATH. You can use `./scripts/run.ps1 dev` or `./scripts/run.ps1 start` if standard commands are unavailable. The local tool paths are detected, not committed credentials.

## v4 implementation

The application now includes discovery/community modules, editorial workflow, reviewed AI/audio/distribution integrations, configurable ads, payments, contributor review, utility imports and reports. See [feature status](docs/V4_IMPLEMENTATION.md), [setup](docs/V4_SETUP.md), and the [administrator guide](docs/ADMIN-GUIDE.md). Full specification completion and live service verification remain in progress.

## Original foundation

- Responsive home, category filters/pagination, article/video pages, video hub, Kannada/Latin alias search and date-range filtering.
- Interactive events calendar and detail pages; Kannada dates, separate event/publication timestamps.
- Header/footer/mobile navigation, light/dark toggle, original logo, credited heritage photos.
- Installable manifest and regular/maskable icons; Serwist cached reading and offline fallback; install/update/network notices.
- Supabase Google/phone login integration, server-protected reader and staff routes; bookmarks, reminders, interests and push subscription registration.
- Staff dashboard, posts list and Tiptap editor; atomic post/category save RPC draft; resource managers for categories, events, ads, submissions, users and settings.
- Turnstile contact form integration, submission Edge Function, revalidation endpoint and Edge Function.
- Reviewable SQL migrations with RLS, role protection and audit triggers; development seed generator.

## Services

Copy .env.example to .env.local and configure services there. Never commit secrets. Default demo mode runs with no Supabase connection. Set NEXT_PUBLIC_DEMO_MODE=false only after the local database is ready. See supabase/README.md. No database migrations have been applied and no production services have been touched.

Google and SMS login, real persistence, form delivery, CMS writes and push registration require a configured Supabase project. Browser controls show unavailable states when configuration is missing. Do not put production credentials in this preview.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm test:release
pnpm test:e2e
```

Start the production server before e2e tests. The Playwright config uses installed Chrome on this machine; set PLAYWRIGHT_CHROMIUM_EXECUTABLE elsewhere. Tests cover desktop 1440px and mobile 390px. Supabase integration tests require local Docker/Supabase and are not represented as passing.

## Remaining production work

The connected Supabase project still needs its schema initialized. The reviewed release bundle contains 35 migrations; its local database assertions and 56 unit tests pass. Live provider verification, deployment and the detailed remaining items are tracked in [V4_IMPLEMENTATION.md](docs/V4_IMPLEMENTATION.md). No live database migration or production deployment was performed.

Assets under public/images use the licenses in docs/ASSETS.md and /credits. Sample articles are not factual reporting; demo mode is noindex.
