# Jwalamala News PWA — implementation status

Updated: 16 September 2026.

The user's latest request was to build the PWA using the new brief and supplied logo. The earlier plan-only task is superseded. This workspace now contains a runnable **local sample edition**. No production deployment, database reset, database push, or remote database operation has been performed.

## Working local application

- Native Next.js App Router, React Server Components, strict TypeScript, Tailwind tokens and locally served Anek Kannada / Noto Serif Kannada fonts.
- Supplied logo used unchanged in the masthead; derived PNG icons with safe margins; reusable five-flame SVG; Kannada content strings and site configuration in separate modules.
- Responsive home with featured story, latest news, category links, video band, event strip, trending list and send-news banner. Dark/light theme switch and mobile bottom navigation.
- Category pages with year/place/sort filters and pagination; article/video pages with separate event and publication dates; sharing and login-gated save controls.
- Kannada keyword and Latin alias search; event-date ranges and category filters; empty/error/loading states.
- Month calendar, day selection, event details, previous/next navigation.
- About/contact/advertise/privacy/terms/disclaimer pages; photo credits. Legal copy is explicitly preliminary.
- Manifest, regular and maskable icons, install/update/network notices, Serwist cache strategies, cached article reading and offline fallback. No private pages or raw authenticated Supabase responses cached.
- All sample stories/events are explicitly identified as samples. Demo mode is noindex. Photos are attributed and licensed, resized to local WebP assets.

## Implemented integrations requiring configuration and verification

- Supabase SSR/browser clients, auth callback and Next.js proxy. Optional Google/phone login; account profile/interests, bookmarks/reminders, logout and push subscription registration.
- Server-protected staff dashboard, posts list, Tiptap editor and basic resource managers for categories/events/ads/submissions/users/settings. Server actions validate input and check roles. User management/settings require admin.
- Atomic post/category SQL RPC with reporter draft-only enforcement; publication requires an event date and exactly one primary category.
- Six reviewable SQL migrations: core/features/functions/RLS/storage/editor transaction. Includes all principal tables, audit log, rate-limit table, role guard and publication checks. Written only, **not applied or database-tested**.
- Generated local SQL fixtures: 12 categories, 20 posts, 5 events. Seed records use is_seed and seed-prefixed slugs; no shared admin credentials.
- Turnstile form and submit-news Edge Function with schema checks and durable rate-limit RPC. Browser calls the Edge Function directly so the gateway can identify the originating client. Verify gateway IP header provenance when configuring deployment.
- Secret-protected revalidation route and revalidate-site Edge Function.

## Verification

- Production compilation and TypeScript checks have passed in earlier runs; the final rebuild and final browser rerun are being recorded below.
- Unit tests: **10 passed** (Kannada/Latin search, date boundaries, category intersection, sanitizer, return URL safety, video normalization and validation).
- ESLint: **passed with zero warnings** after fixes.
- Initial browser run: 12 of 14 passed across desktop/mobile. The two failures found an omitted year on the event-date badge; fixed in source. Offline cached reading and uncached fallback passed on both devices.
- Browser plugin had no connected browser. Tests use headless installed Chrome through Playwright.
- No database advisors, RLS integration tests, SMS/OAuth delivery tests, push delivery tests, Lighthouse scores or real-device installation results are claimed.

## Phase-pack coverage and remaining work

| Phase | Status |
| --- | --- |
| 0 Plan | Completed previously; latest request authorized implementation. |
| 1 Foundation | Implemented and compiled. |
| 2 Database | Migration/seed source prepared; local Docker/Supabase, execution, generated database types, RLS tests and advisors remain. |
| 3 Public site | Working sample edition; live data wiring supplied. Dynamic ad placement, key-point seeking, short-video layout and configurable homepage ordering remain. |
| 4 Search | Working local aliases/filters; complete bidirectional transliteration and paginated production RPC integration remain. Live list currently fetches up to 200 records. Trending currently uses cumulative counters; daily view aggregation is not wired. |
| 5 Accounts | Source integrated; provider configuration and live persistence tests remain. OTP resend timer and reminder removal/channel controls remain. |
| 6 CMS | Basic protected editors/managers supplied; live validation, autosave, drag ordering, bulk actions, full preview/SEO/key-point editing, CSV import and submission conversion remain. |
| 7 Automation | submit-news/revalidate-site source supplied. Push dispatch, delivery tracking/retries, daily reminders, video imports, editor alerts, webhooks and cron activation remain. |
| 8 PWA | Core installability/cache/offline flows implemented and browser-tested. Push dispatch, topic customization, automatic iOS install guidance and real-device tests remain. |
| 9 SEO/migration | Basic metadata, canonical URLs, sitemap/robots. Full VideoObject/Event metadata, Kannada OG images/news sitemap and WordPress migration remain. |
| 10 Launch quality | Unit/lint/build and browser checks; full performance/accessibility/security/database audits and launch decisions remain. |

## Assumptions and constraints

- Use sample content because real WordPress/category/video exports and design kit were not supplied.
- Event ranges belong to events; each post has one event date. Undated imports may remain drafts at the database level.
- Enforce Kannada line-height of at least 1.6 over the conflicting tighter display scale.
- Editor create/update/publish and admin-only content deletion; the editor transaction may replace its authorized post's category links atomically.
- Push subscriptions currently require login. Anonymous subscription ownership is not implemented.
- Service worker caches public app pages/assets, not arbitrary Supabase REST requests. This avoids leaking staff drafts through a shared browser cache.
- Supabase schema and credentials remain unconfigured. Login/form controls show a Kannada unavailable message when required configuration is missing.
- Production hosting, SMS provider/budget, WhatsApp scope, editorial source of truth and import exclusions remain undecided.
- TypeScript 6.0.3 is pinned because the current typescript-eslint cannot load TypeScript 7's native-only package. ESLint 9.39.5 is pinned because the currently resolved Next.js React plugin uses APIs removed in ESLint 10. Revisit upstream compatibility before launch; do not ignore peer compatibility to choose a higher version number.
- All installed application dependencies are pinned in package.json and pnpm-lock.yaml. No secrets were added to tracked source.

## Run and review

- Current preview: http://127.0.0.1:3000 (production server, for offline testing).
- Standard commands: pnpm dev / pnpm build / pnpm start.
- This workstation without Node/pnpm on PATH: ./scripts/run.ps1 dev (or start).
- Test commands: pnpm typecheck, pnpm lint, pnpm test, pnpm test:e2e. The browser suite expects a running production server.
- Database review: supabase/migrations and supabase/README.md. Do not apply migrations without reviewing and approving the local database operation.
- Source brief preserved in docs/PROJECT_BRIEF.md. Asset credits are in docs/ASSETS.md and /credits.

## Final verification record

- Final production build: PASSED, including TypeScript validation.
- Final standalone typecheck: PASSED.
- Final ESLint: PASSED with zero warnings.
- Unit suite: 10/10 PASSED.
- Full Playwright suite: 14/14 PASSED across 1440px desktop and 390px mobile, including offline navigation.
- Screenshot review found a crowded mobile masthead; fixed with responsive styling. A new non-overlap regression assertion passes on both sizes (2/2 focused tests), followed by another successful production build and clean lint.
- Screenshots: test-results/home-desktop-viewport.png and test-results/home-mobile-viewport.png.
- Production preview remains running at http://127.0.0.1:3000.
- Live database/provider/notification delivery tests and launch audits remain unperformed as listed above.

## Google advertisement spaces — 16 September 2026

- Added a shared `src/components/ads/AdSlot.tsx` component with Kannada advertisement labels and stable placement identifiers.
- Homepage: top banner, desktop sidebar rectangle, banner between news and videos, and bottom banner.
- Videos and every category listing: top banner, desktop sidebar rectangle, and bottom banner. This includes News, Pravachana, Utsava, Panchakalyana, Chaturmasa, Samaja, and Basadigalu.
- News and video detail pages: top banner, desktop sidebar rectangle, after-content banner, and bottom banner.
- Banner content reserves 90px on desktop and 100px on phones; rectangle content reserves 300 × 250px plus its label. Sidebar placements are hidden below 901px; mobile banners remain in the normal reading flow. Print layouts hide advertisements.
- These are labeled reserved spaces only. No Google advertising script or live ad request is enabled. Live AdSense integration still needs the publisher ID and ad-unit IDs, followed by script/CSP integration and testing on the intended domain.
- Verification: production build, TypeScript, ESLint, 10 unit tests, and all 14 existing browser tests passed. A separate layout check passed all 33 combinations of 11 requested routes at 1440px, 768px, and 390px, confirming visible banners, unique placement IDs, and no horizontal overflow. Desktop/mobile category screenshots were visually reviewed.
- Preview: http://127.0.0.1:3000. Screenshots: `test-results/ads-category-1440.png` and `test-results/ads-category-390.png`.

## Email/password and Google login — 16 September 2026

- Login now opens with email/password and a separate Google sign-in button. Gmail addresses are accepted with an app-specific Jwalamala password; Google passwords are entered only on Google's sign-in page.
- Added account creation with email-confirmation messaging, password-reset requests with a non-enumerating success message, and protected password updates at `/account/password`. Password visibility controls, matching confirmation fields, an 8-character minimum for new passwords, Kannada feedback, and busy states are included.
- Kept phone OTP as an alternate login method, including a change-number action.
- Google uses Supabase OAuth with PKCE, account selection and a callback that preserves safe local return paths. Cancellation, invalid/expired links and network failures display a safe error. Email token-hash confirmation/recovery links are supported.
- Login/auth/account/admin responses are private and non-cacheable; these routes were already excluded from PWA navigation caching.
- Verification: production build (after allowing the existing Kannada font downloads), standalone TypeScript, ESLint, 25 unit tests and all 18 desktop/mobile browser tests passed. Login screenshots reviewed at both widths. Auth unit tests use provider mocks; no successful live provider/session claim is made.
- Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` remain empty. Live email/password authentication, Google consent, email delivery and authenticated session persistence remain unverified until services are configured. No credentials, database changes or deployments were made.
- Setup instructions: [AUTH_SETUP.md](./AUTH_SETUP.md). Preview: http://127.0.0.1:3000/login.


## 16 September 2026 — v4 expansion

User confirmed all v4 features. See [V4_IMPLEMENTATION.md](V4_IMPLEMENTATION.md). Discovery, community, reading tools, newsroom, provider jobs, distribution, audio, ads and analytics implementations are present. 17 migrations and development seeds pass isolated PostgreSQL checks; 37 unit tests pass. Live Supabase and provider verification await configuration. Work continues on the remaining v4 specification.

## v4 continuation — current implementation record

The earlier verification sections above describe historical baseline builds. The current v4 status is maintained in [V4_IMPLEMENTATION.md](V4_IMPLEMENTATION.md), with configuration instructions in [V4_SETUP.md](V4_SETUP.md). Latest additions include member early access, advertiser approval links, image uploads/collages, rich article tables and links, moderated condolences, utility CSV imports, redirects/audit history, mobile sticky ads, video chapters and local resume. Twenty-four migrations and 54 unit tests pass locally. Production build and full browser regression are running for this revision. Live provider verification and remaining feature details are still outstanding.

## v4 build — 16 September 2026, current checkpoint

This supersedes the older counts and missing-credential statements above. Supabase credentials are present; read-only requests reached the project, but required tables are not initialized (PGRST205). Demo mode isolates the preview from real authentication/database mutations. No live schema changes or provider deliveries were performed.

- 35 ordered migrations; the exact release SQL bundle and seeds pass isolated PostgreSQL assertions. The release category file contains 12 definitions and no sample news/accounts.
- 56 unit tests, TypeScript and ESLint pass. The production build passes; the final desktop/mobile regression is in progress. The previous full run passed 36 tests.
- New checks cover contributor approval/ownership, private draft recovery, job controls, paid-notice approval, translated-content persistence, chapter/reminder behavior and safe article advertisement breaks.
- Browser bundle inspection: 176 JavaScript files checked; no configured server-secret values found. This is a targeted check, not a complete security audit.
- Desktop automated WCAG 2 A/AA and 2.1 AA checks pass on home, login, article and weather pages. Saved-place weather selection passes desktop/mobile. Mobile homepage visual review found no horizontal overflow.
- Added reviewed English articles, short-video authoring, account autosave recovery, reminder cancellation, SEO helper, editable newsletter/social drafts, scheduled bulletin drafts, paid-notice billing, article performance charts, weather menu/grid, and gallery/story/ad upload controls.
- Setup: [V4_SETUP.md](V4_SETUP.md). Operations: [ADMIN-GUIDE.md](ADMIN-GUIDE.md). Remaining scope: [V4_IMPLEMENTATION.md](V4_IMPLEMENTATION.md). Full v4 completion and production launch are not claimed.

## Final checkpoint verification

- Final clean production build: passed, with all latest application changes included. Preview running at http://127.0.0.1:3000.
- Unit tests: 56 passed. TypeScript and ESLint: passed.
- Release database verification: exact 35-migration schema file, exact 12-category initialization file, development seeds and behavioral assertions passed in isolated PGlite. No live SQL was applied.
- Full desktop/mobile regression: 39/40 passed. The only failure was a missing accessible name on the collapsed mobile weather control. Added an explicit label and constrained the expanded menu to the viewport; the affected mobile accessibility and weather tests both pass after the fix. No broader rerun was needed for this localized control change.
- OneDrive marked a generated Next.js directory read-only/reparse, blocking cleanup. Stopped the preview, moved and removed only generated output within the workspace, then completed a clean rebuild. Source and database files were preserved.
- Full v4 completion is still not claimed: remaining implementation details and live-service dependencies are listed in V4_IMPLEMENTATION.md.
- Targeted mobile rerun completed: 2/2 passed in 2.6 minutes (exit code 0), covering accessibility and weather menu boundaries/persistence.

## 16 September 2026 — loading, component polish and location filtering

- Added shared route/panel/article/editor skeletons, progressive public images with fallbacks, dynamic editor/calendar/gallery/chart modules, deferred comments, and independent header weather/trending boundaries.
- Added consistent short animations and interaction feedback, honoring reduced motion. Text entrances preserve contrast and menu surfaces stay opaque.
- Replaced the More label with an icon-only hamburger, kept visible while categories scroll. Added the main sections, keyboard focus handling, Escape/backdrop dismissal and scroll locking.
- Added state → district → city/town filters to news/search/categories/videos/events/community listings; an expandable homepage control opens the news listing. Selections reset their children, combine with other criteria, persist in URLs and reset pagination on application.
- Migration 36 adds place states/indexing and location-aware public listing SQL. All 36 migrations and the regenerated release bundle pass isolated database tests, including conflicting locations, draft privacy and pagination. 60 unit tests pass; production build, TypeScript and ESLint pass.
- Sample coverage is the existing Karnataka district catalog plus nine city/town records, not a complete all-India inventory. New regions can be maintained in Admin → Places. Details: [LOADING-AND-LOCATIONS.md](LOADING-AND-LOCATIONS.md).
- Browser verification found and fixed keyboard focus and transient text-contrast issues. The full regression and final affected-check rerun are being recorded below. No live SQL or provider changes were made.

### Verified UI checkpoint

- Final production rebuild, TypeScript and ESLint pass. The preview is running at http://127.0.0.1:3000.
- Full browser regression: 46/50 passed initially. The four failures covered menu closing and animation-time text contrast on desktop/mobile. Removed text-opacity animation, strengthened focus/Escape handling, prevented unnecessary menu-route prefetches, and rebuilt. All four affected checks pass on the final build; this is an affected-check rerun, not a new full 50-test run.
- Verified filtering and pagination, parent/child reset, URL persistence, disabled/empty options, lazy image placeholders, reduced-motion behavior, category/calendar interactions, login guards, gallery focus, reader preferences, PWA routes and public mutation origin checks.
- Reviewed desktop and phone screenshots. News, videos, Pravachana, Utsava, Panchakalyana, Chaturmasa, Samaja, Basadigalu, events, directory, search and login layouts fit all five tested widths: 320, 390, 768, 1024 and 1440 pixels.
- The migration remains local and tested; live Supabase needs migration 36 after its previous migrations. The current location catalog is Karnataka; additional regions require saved place records.

## 16 September 2026 — GSAP motion upgrade

The user requested more visible card/component animation. Added GSAP 3.15 and a shared `SiteMotion` controller in the root layout, replacing the small CSS-only entrances when the engine is active.

- Viewport-triggered reveals: 38px rise with 0.965 scale on cards, 26px entrances on panels/headings/forms/navigation, 75ms stagger steps and 0.65–0.78 second easing.
- Card hover/focus lift, image zoom, button press/release feedback, dialog entrances and staggered menu links. Text remains fully opaque and advertisement units stay stationary.
- Covers news/video cards, event cards, community and gallery cards, newsroom/stat cards, utility/facts/timeline panels, filters, forms, navigation and footer columns. New custom components can opt in with `data-motion` attributes.
- Automatically registers streamed/dynamically inserted content; tears down observers/listeners and restores styles on route changes and reduced-motion changes.
- Details and reuse instructions: [MOTION.md](MOTION.md). New browser tests verify actual transforms, scrolling, dynamic insertion, hover, reduced-motion changes and coverage across component families. Verification results are recorded below.

### GSAP verification

- Final production build, TypeScript and targeted ESLint checks pass. Preview: http://127.0.0.1:3000.
- The combined browser run recorded 17 passing motion, accessibility, location/menu and responsive checks before the slow runner was interrupted. The remaining mobile motion cases were run separately against the final build: all three pass. This is combined evidence, not a single completed 20-test run.
- Corrected the dynamic-insertion test to scroll newly prepended cards into view on mobile, where browser scroll anchoring otherwise kept those cards above the viewport. Their waiting state was expected application behavior.
- Verified real GSAP transforms during reveals, staggered groups, hover lift, dynamic component registration, route changes, hero/event/community/gallery/form/panel coverage, and live reduced-motion preference changes. Ads remain outside the animation system.
- No database, provider or authentication changes were made for the motion upgrade.
