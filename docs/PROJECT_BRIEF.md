# Jwalamala News PWA — VS Code Agent Master Prompt Pack

Version 2.0 · Prepared by MyDesignNexus · September 2026
For any AI coding agent inside VS Code (GPT-based agents, Copilot agent mode, Cline, etc.). No Claude-only or MCP-only features are required. Supabase is handled through the **Supabase CLI** in the VS Code terminal.

---

## Why this pack is split in two

VS Code agents lose track on very long prompts. So this pack uses:

1. **A permanent project brief** (Part A). Save it as a file in the repo. The agent re-reads it before every task.
2. **Short phase prompts** (Part B). Paste one per chat session. Each one points back to the brief.

---

## Setup (do this once, by hand)

1. Install: Node.js LTS, pnpm, Git, Docker Desktop (needed for local Supabase), Supabase CLI.
2. Create the folder `jwalamala-pwa`, open it in VS Code, run `git init`.
3. Create these files and paste Part A into each (same content):
   - `AGENTS.md` (read by many agents automatically)
   - `.github/copilot-instructions.md` (read by Copilot-style agents)
   - `docs/PROJECT_BRIEF.md` (for agents that need you to reference it)
4. Put your reference files in `docs/` (list at the end of this file).
5. Give the agent permission to run terminal commands, but **approve each command** yourself, especially anything touching Supabase.
6. Start a fresh chat for each phase and paste the phase prompt from Part B.

---

# PART A — PROJECT BRIEF (save as AGENTS.md)

```markdown
# JWALAMALA NEWS PWA — PROJECT BRIEF
Read this whole file before starting any task. If a task conflicts with this file, stop and ask.

## 1. Your role
You are a senior full-stack engineer building a production Progressive Web App for "Jwalamala News" (ಜ್ವಾಲಾಮಾಲಾ ನ್ಯೂಸ್), for the agency MyDesignNexus. Write clean, typed, tested, secure code. Work only on the task given. Stop when the task is done and give a summary.

## 2. Project summary
- Client: Kannada-language Jain community news and video channel in Karnataka, running about 10 years.
- Replaces a WordPress + Elementor + NewsExo site at jwalamala.news (plain permalinks like ?p=123, ?cat=45; about 88 real posts, about 35 real categories, plus demo content that must NOT be migrated).
- About 1,800 transcribed videos arrive as a CSV. Overlap with existing posts is unknown, so detect duplicates by video URL.
- Readers: Jain families, many aged 35–70, mostly on mobile, often on slow networks.
- Videos are YouTube/Facebook embeds only. No self-hosted video.
- Hosting budget: about USD 25/month.
- The codebase may be reused for a second site later: keep site config in one file.

## 3. Must-have features
1. Kannada-first interface; English only as helper text.
2. One post can belong to many categories, with one primary category.
3. `event_date` (when the event happened) is separate from `published_at`. Shown on cards, searchable, filterable.
4. Search by keyword AND by event date. Works for Kannada script and English typing ("shravanabelagola" finds "ಶ್ರವಣಬೆಳಗೊಳ").
5. Lite video embed: thumbnail first, load player on tap.
6. Optional reader login (phone OTP, Google): save posts, event reminders, interests.
7. Admin CMS: posts, videos, categories, events, ads, reader submissions, users/roles, settings, CSV import.
8. Installable PWA: offline support, install prompt, web push for breaking/live news.
9. Old WordPress URLs 301-redirect to new URLs.
10. Fast on low-end Android phones.

## 4. Tech stack (use latest stable versions; check official docs if unsure; never invent APIs)
- Next.js App Router, TypeScript strict, React Server Components by default.
- Tailwind CSS with tokens in section 5.
- Supabase: Postgres, Auth, Row Level Security (RLS), Edge Functions, Database Webhooks, pg_cron. Use `@supabase/ssr`.
- Supabase CLI for everything database-related (local dev with Docker, migrations, type generation).
- PWA: Serwist (`@serwist/next`).
- Web push: `web-push` with VAPID keys (sent from Edge Function).
- Forms: React Hook Form + Zod. Rich text: Tiptap (store JSON + sanitized HTML).
- Fonts via `next/font/google`: Anek Kannada (headings/UI), Noto Serif Kannada (article body).
- Icons: lucide-react. Bot protection: Cloudflare Turnstile.
- Tests: Vitest, Playwright, Lighthouse CI.
- Package manager: pnpm.
- Hosting: Cloudflare (OpenNext adapter) or Vercel — decided in Phase 0.

## 5. Design system (follow exactly; full kit in docs/design/)
Colours (Tailwind names):
- ember #C8341E (600 #A82A17, 100 #FBE7E3): primary buttons, LIVE badge, breaking label, play button, active nav.
- haldi #E9A31B (100 #FDF1D8): event-date badges and focus rings ONLY. Never text on white.
- marble #FFFFFF, marble-2 #F3F4F7 (surface), marble-3 #E4E6EC (border).
- tulasi #2E7D5B (100 #E2F1EA): success/published.
- indigo #1F2447 (700 #3A406B, 500 #5F6590, 300 #9EA2BF): text, header, footer, meta, placeholder.
- Dark mode: bg #12152B, surface #1B1F3A, border #2C3154, text #ECEDF4, muted #A6AACB, accent #F06A4F.
Type scale (size/line-height/weight): display 49/1.15/800, h1 39/1.25/700, h2 31/1.3/700, h3 20/1.4/600, body 18/1.8 serif, ui 16/1.5/500, meta 13/1.4.
Rules: Kannada line-height ≥ 1.6; letter-spacing 0; no uppercase; no italic Kannada; dates like "14 ಸೆಪ್ಟೆಂಬರ್ 2026" with Western digits.
Layout: 12-col grid, max width 1200px, radius 4px (cards/buttons/inputs), 8px (panels/modals), full for pills; flat 1px borders; one shadow `0 8px 24px rgba(31,36,71,.16)` for menus/modals only; touch targets ≥ 44px; 3px haldi focus outline.
Signature: `<FlameGarland />` SVG — five teardrop flames in order ember, haldi, white (indigo outline), tulasi, indigo. Used beside the wordmark, as loader, max two dividers per page, in footer. Never over photos.
Video cards: 16:9 thumbnail, round ember play button centre, haldi event-date badge bottom-left.

## 6. Folder structure
```
src/
  app/
    (public)/            home, category, news, video, videos, search, events, static pages
    (auth)/login/
    account/
    admin/
    api/                 revalidate, push, view
    manifest.ts  sitemap.ts  robots.ts  sw.ts  offline/
  components/
    ui/                  buttons, pills, badges, inputs, toast, bottom-sheet, skeletons
    layout/              Header, CategoryNav, BottomNav, Footer, FlameGarland
    news/                NewsCard, VideoCard, ShortCard, LiteVideoEmbed, BreakingTicker, KeyPoints, ShareButtons
    search/  events/  admin/
  lib/
    supabase/            server.ts, client.ts, middleware.ts, database.types.ts
    queries/             all data-fetching functions
    validation/          zod schemas
    utils/               dates.ts (Kannada months), transliterate.ts, youtube.ts, sanitize.ts
  content/strings.kn.ts  all Kannada UI text
  config/site.ts         site name, colours, socials, feature flags
supabase/
  migrations/            numbered SQL files
  functions/             edge functions
  seed.sql
scripts/                 migrate-wordpress.ts
tests/                   unit/ e2e/
docs/                    brief, design, data, PROGRESS.md
```

## 7. Database design
Extensions: pg_trgm, unaccent, pg_cron.
Enums: user_role (reader, reporter, editor, admin); post_type (article, video, short); post_status (draft, scheduled, published, archived); video_provider (youtube, facebook, none); content_source (wordpress, dataset, manual); submission_status (new, in_review, converted, replied, archived); ad_slot (home_banner, sidebar, in_article, category_top, event_sponsor).

Tables (all have created_at, updated_at + trigger):
- profiles(id → auth.users, full_name, phone, town, avatar_url, role default reader, interests uuid[], notify_push, notify_whatsapp)
- categories(id, slug unique, name_kn, name_en, description_kn, parent_id, sort_order, show_in_menu, legacy_wp_id unique)
- events(id, slug unique, name_kn, name_en, start_date, end_date, place, district, organiser, status, description_kn)
- posts(id, type, status, slug unique, title_kn, title_en, title_translit, summary_kn, body_json jsonb, body_html, video_provider, video_id, video_url unique, thumbnail_url, duration_seconds, is_live, is_featured, is_breaking, event_id, event_date, event_place, published_at, scheduled_for, author_id, seo_title, seo_description, view_count, source, legacy_wp_id unique, transcript, search_vector tsvector generated with 'simple' config: titles weight A, summary B, transcript C)
- post_categories(post_id, category_id, is_primary) PK both; partial unique index: one primary per post
- tags(id, slug, name_kn, name_en); post_tags(post_id, tag_id)
- key_points(id, post_id, seconds, label_kn, sort_order)
- ads(id, slot, advertiser, image_url, target_url, alt_kn, starts_at, ends_at, category_ids uuid[], is_active, impressions, clicks)
- submissions(id, name, phone, email, town, kind, event_date, link, message, status, converted_post_id, ip_hash)
- bookmarks(user_id, post_id) PK both
- event_reminders(user_id, event_id, channel) PK all
- push_subscriptions(id, user_id nullable, endpoint unique, p256dh, auth, topics text[])
- redirects(old_path unique, new_path, status_code default 301, hits)
- site_settings(key PK, value jsonb)
- import_jobs(id, file_name, total_rows, processed_rows, created_rows, duplicate_rows, error_rows, status, created_by)
- import_rows(id, job_id, row_number, raw jsonb, result, message, post_id)
- post_views_daily(post_id, day, views) PK both
- audit_log(id, actor_id, action, table_name, record_id, diff jsonb)

Indexes: posts(status, published_at desc); posts(event_date); partial on is_breaking and is_live; GIN on search_vector; GIN trigram on title_kn, title_en, title_translit; post_categories(category_id, post_id).

Functions:
- is_staff(), has_role(role): SECURITY DEFINER, fixed search_path.
- search_posts(q, mode 'keyword'|'event_date', date_from, date_to, category_ids, p_type, p_limit, p_offset) → rows + rank + total_count; keyword mode = full-text rank + trigram similarity on the three title columns; published only.
- increment_view(post_id), trending_posts(days, limit).
- publish_scheduled_posts() run by pg_cron every 5 minutes.
- handle_new_user() trigger → creates profile.

RLS (enable on EVERY table):
- Content tables: public reads published/visible rows only; staff read all; reporters create/edit own drafts; editors/admins full write; only admins delete.
- profiles: own row read/update, cannot change own role; admins change roles.
- bookmarks, event_reminders: own rows only.
- push_subscriptions: anyone may insert; read/delete own or staff.
- submissions: inserted only via Edge Function; staff read/update.
- ads: public reads active in-date ads; editors/admins manage.
- redirects, site_settings: public read; admins write.
- import_*, post_views_daily, audit_log: staff only.

Storage: one public bucket `site-assets` (images only, ≤ 1 MB, staff write). No video storage.

## 8. Routes
Public: `/`, `/category/[slug]`, `/news/[slug]`, `/video/[slug]`, `/videos`, `/search`, `/events`, `/events/[slug]`, `/about`, `/contact`, `/advertise`, `/privacy`, `/terms`, `/disclaimer`, `/offline`, custom 404.
Reader: `/login`, `/account`.
Admin (`/admin`, protected in middleware AND server-side with is_staff): dashboard, posts list, post editor (event date required), categories, events, ads, submissions, import, users, settings.
API: `/api/revalidate` (secret), `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/view`.
Middleware: refresh session; protect /admin and /account; 301 legacy URLs (`/?p=`, `/?page_id=`, `/?cat=`, `/?m=`, `/?s=`) using the redirects table and legacy ids.

## 9. Security rules (never break these)
- SUPABASE_SERVICE_ROLE_KEY only in server code and Edge Functions. Never in client code, never with NEXT_PUBLIC_ prefix.
- Never commit `.env.local`. Keep `.env.example` updated.
- Sanitize all HTML before saving and before rendering.
- Strict CSP allowing only: self, Supabase, youtube-nocookie.com, facebook.com, i.ytimg.com, Turnstile.
- Rate-limit public APIs.
- Never run destructive SQL or `supabase db reset` / `supabase db push` without asking me first.
- Work only against LOCAL Supabase unless I say otherwise.

## 10. Quality rules
- No `any`. Small components. Server Components unless interaction is needed.
- All Kannada UI text in `src/content/strings.kn.ts`.
- next/image with fixed aspect ratios.
- WCAG 2.1 AA: labels, keyboard access, visible focus, reduced motion.
- Mobile targets: LCP < 2.5s, CLS < 0.1, INP < 200ms, public page JS < 170 KB, Lighthouse Accessibility/SEO ≥ 95, Performance ≥ 90.
- After each task these must pass: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## 11. How to report after every task
1. What was built (short list).
2. Files created/changed.
3. Commands I should run and how to test it.
4. Open issues or questions.
5. Update docs/PROGRESS.md.
Then STOP and wait.
```

---

# PART B — PHASE PROMPTS (one per chat)

Every prompt starts with the same line so the agent re-reads the brief.

### Phase 0 — Plan
```
Read AGENTS.md (docs/PROJECT_BRIEF.md) fully, and scan everything in docs/.
TASK: Phase 0 — planning only. Do NOT write code.
Give me:
1. Your understanding of the project in 5 lines.
2. Assumptions you are making.
3. Questions I must answer. Include: dataset overlap with WordPress posts; single event date or start/end range; Latin search on titles only or also transcripts; Cloudflare or Vercel hosting; SMS provider for phone OTP; WhatsApp alerts in v1 or later; inline article photos allowed in site-assets bucket.
4. The exact package list you will install.
5. Risks and how you will handle them.
Create docs/PROGRESS.md with a phase checklist. Then stop.
```

### Phase 1 — Foundation
```
Read AGENTS.md first.
TASK: Phase 1 — project foundation.
1. Create the Next.js app (App Router, TypeScript, Tailwind, ESLint, src directory, pnpm) in the current folder.
2. Add Prettier, strict TypeScript, path alias @/.
3. Tailwind theme: colours, font families, font sizes, radius, shadow, max widths from brief section 5. Dark mode via [data-theme="dark"].
4. Fonts with next/font/google: Anek Kannada (variable, wdth axis) and Noto Serif Kannada. html lang="kn".
5. Create src/config/site.ts and src/content/strings.kn.ts.
6. Create layout components: Header (indigo bar, wordmark, FlameGarland, search icon, live button, login link), CategoryNav (scrollable, 3px ember top border), BottomNav (mobile only: ಮುಖಪುಟ, ವಿಡಿಯೋ, ಹುಡುಕಿ, ಕಾರ್ಯಕ್ರಮ, ಖಾತೆ), Footer, FlameGarland.
7. Create UI primitives: Button (primary/secondary/ghost), CategoryPill, LiveBadge, EventDateBadge, Toast, Skeleton.
8. A temporary /styleguide page showing all of the above.
9. .env.example with all variables from the brief.
10. Set up Vitest and Playwright with one sample test each.
Do not connect Supabase yet. Report and stop.
```

### Phase 2 — Supabase setup and database
```
Read AGENTS.md first, especially sections 7 and 9.
TASK: Phase 2 — database with Supabase CLI (LOCAL only).
1. Tell me the commands to run: `supabase init`, `supabase start`. Wait for me to confirm they worked and paste the local keys into .env.local.
2. Create migrations with `supabase migration new <name>`, in this order:
   001_extensions_enums
   002_core_tables (profiles, categories, events, posts, post_categories, tags, post_tags, key_points)
   003_feature_tables (ads, submissions, bookmarks, event_reminders, push_subscriptions, redirects, site_settings, import_jobs, import_rows, post_views_daily, audit_log)
   004_indexes
   005_functions_triggers (updated_at, handle_new_user, is_staff, has_role, search_posts, increment_view, trending_posts, publish_scheduled_posts, audit trigger)
   006_rls_policies
   007_storage_bucket
   008_cron_jobs
3. Show me each SQL file before I apply it.
4. Write supabase/seed.sql: 12 Kannada categories (ಸುದ್ದಿ, ಪ್ರವಚನ, ಉತ್ಸವ, ಪಂಚಕಲ್ಯಾಣ, ಚಾತುರ್ಮಾಸ, ಸಮಾಜ, ಬಸದಿಗಳು, ಆಚಾರ್ಯಶ್ರೀ, ಮುನಿಶ್ರೀ, ಭಟ್ಟಾರಕರು, ಶಿಕ್ಷಣ, ಕಾರ್ಯಕ್ರಮ), 20 sample posts with event dates and multiple categories, 5 events, 1 admin user. Tag seed rows with slug prefix "seed-".
5. Then tell me to run `supabase db reset` (local only) to apply everything.
6. Generate types: `supabase gen types typescript --local > src/lib/supabase/database.types.ts`.
7. Create src/lib/supabase/server.ts, client.ts, middleware.ts using @supabase/ssr, and root middleware.ts that refreshes the session.
8. Write SQL tests (or a Vitest script using the anon key) proving: anon cannot read drafts; anon cannot insert posts; a reader cannot change own role; search_posts returns results for "ಶ್ರವಣ" and "shravana".
9. Tell me how to run the Supabase Studio security/performance advisors, and fix anything they report.
Report and stop.
```

### Phase 3 — Public pages
```
Read AGENTS.md first. Look at docs/design/ screens before building.
TASK: Phase 3 — public site with real data from local Supabase.
1. src/lib/queries/: getHomeData, getCategoryPosts, getPostBySlug, getRelatedPosts, getUpcomingEvents, getEventsByMonth, getTrending, getActiveAds, getSettings. Use fetch cache tags (posts, post:<slug>, category:<slug>, settings).
2. Components: NewsCard, VideoCard, ShortCard, LiteVideoEmbed (youtube-nocookie, loads on tap), BreakingTicker, KeyPoints (clicking jumps video time), ShareButtons (WhatsApp first), AdSlot, EmptyState, EventCalendar.
3. Pages:
   - / : ticker, lead/live video, latest list, upcoming events strip, category bands in order from site_settings, trending, send-news banner.
   - /category/[slug] : sub-category pills, year/place/sort filters (URL search params), pagination.
   - /news/[slug] and /video/[slug] : breadcrumb, pills, title, "ಕಾರ್ಯಕ್ರಮ: date | ಪ್ರಕಟಣೆ: date", embed, sanitized body, event info box, related, up-next list for videos.
   - /videos, /events, /events/[slug], /about, /contact (form UI only for now), /advertise, /privacy, /terms, /disclaimer, not-found.
4. loading.tsx skeletons for each route. Kannada date formatter in utils/dates.ts.
5. Responsive at 390px and 1440px. Delete /styleguide or hide it in production.
6. Playwright tests: home loads, category filter changes results, article shows both dates.
Report and stop.
```

### Phase 4 — Search
```
Read AGENTS.md first.
TASK: Phase 4 — search.
1. utils/transliterate.ts: convert Latin input to Kannada and Kannada to Latin (use a maintained Indic transliteration library; confirm it supports Kannada before installing). Also normalise common spellings (sh/s, aa/a, double letters).
2. Make sure title_translit is filled for all posts (trigger or script). Add a backfill script.
3. /search page: search bar with ಕೀವರ್ಡ್ / ಕಾರ್ಯಕ್ರಮ ದಿನಾಂಕ toggle, date range picker, category/type/place filters (desktop side panel, mobile bottom sheet), result count, sort, highlighted matches, pagination, empty state with suggestions, recent searches (localStorage).
4. Call search_posts RPC from a server action or route handler with debounce on the client.
5. Tests: "shravanabelagola" and "ಶ್ರವಣಬೆಳಗೊಳ" return the same top result; event-date search for a seeded date returns only posts with that event_date; empty query shows suggestions.
Report and stop.
```

### Phase 5 — Reader login and account
```
Read AGENTS.md first.
TASK: Phase 5 — optional reader accounts.
1. /login: phone OTP (6-digit boxes, resend timer 30s) and Google sign-in via Supabase Auth; "ಈಗ ಬೇಡ" skip link. Tell me which Supabase dashboard settings I must configure (SMS provider, Google OAuth, redirect URLs).
2. Auth callback route. Profile auto-created by trigger.
3. /account: tabs ಉಳಿಸಿದವು (bookmarks grid), ಕಾರ್ಯಕ್ರಮ ಜ್ಞಾಪನೆಗಳು (reminders with channel toggles), ನನ್ನ ಊರು ಮತ್ತು ಆಸಕ್ತಿಗಳು (town + category pills), ಅಧಿಸೂಚನೆಗಳು, ಲಾಗ್ ಔಟ್.
4. Bookmark button on cards and article pages (logged-out users go to /login with return URL).
5. "Remind me" button on event pages.
6. Tests for protected routes and bookmark flow.
Report and stop.
```

### Phase 6 — Admin CMS
```
Read AGENTS.md first.
TASK: Phase 6 — admin CMS under /admin.
1. Admin layout: indigo sidebar (ಡ್ಯಾಶ್‌ಬೋರ್ಡ್, ಲೇಖನಗಳು, ವಿಡಿಯೋಗಳು, ವರ್ಗಗಳು, ಕಾರ್ಯಕ್ರಮಗಳು, ಜಾಹೀರಾತುಗಳು, ಸಲ್ಲಿಕೆಗಳು, ಆಮದು, ಬಳಕೆದಾರರು, ಸೆಟ್ಟಿಂಗ್ಸ್), top bar, dense tables. Role check on server for every page and action.
2. Dashboard: stats, recent posts table, weekly views chart, upcoming events, "+ ಹೊಸ ಲೇಖನ".
3. Posts list: filters (status, type, category, event date range), bulk actions, pagination.
4. Post editor: title_kn, title_en, slug (auto), video URL with auto thumbnail/ID detection, Tiptap editor, key points rows, right panel with status, schedule, EVENT DATE (required, gold highlighted), event place, link to event, multi-category select with primary, tags, featured/live/breaking toggles, SEO fields with counters, share preview, preview button, autosave draft every 30s.
5. Categories tree with drag-to-reorder and nesting; events manager; ads manager with date range and slot preview; submissions inbox with "ಲೇಖನವಾಗಿ ಪರಿವರ್ತಿಸಿ"; users and roles (admin only); settings (homepage band order drag, ticker, live stream id, social links, redirects table).
6. All writes through server actions with Zod validation; write to audit_log.
7. Tests: reporter cannot publish; editor can; reader gets 404/redirect on /admin.
Report and stop.
```

### Phase 7 — Edge Functions and automation
```
Read AGENTS.md first.
TASK: Phase 7 — Supabase Edge Functions (create with `supabase functions new <name>`, test locally with `supabase functions serve`).
1. submit-news: Zod validation, Turnstile verification, rate limit 5/hour per hashed IP, insert submission. Wire the /contact form to it with success/error toasts.
2. send-push: called by a database webhook when a post is published with is_breaking or is_live; sends web-push to subscriptions matching topics; deletes expired endpoints.
3. event-reminders: daily at 07:00 IST via pg_cron + pg_net; pushes reminders for events starting tomorrow.
4. import-videos: processes a CSV from /admin/import in batches of 100: normalise YouTube/Facebook URLs, extract video_id, skip duplicates by video_url, fetch metadata from YouTube API if key exists, fill title_translit, write import_rows, update import_jobs progress. Admin import page shows column mapping, 10-row preview, warnings (missing event date = gold, duplicate = ember), live progress.
5. revalidate-site: webhook on posts/categories/site_settings → POST to /api/revalidate with secret and cache tags.
6. /api/revalidate route handler with secret check.
7. Give me the exact commands and dashboard steps to set secrets, webhooks and cron in production later (do not run them).
Report and stop.
```

### Phase 8 — PWA
```
Read AGENTS.md first.
TASK: Phase 8 — make the app an installable PWA with Serwist.
1. app/manifest.ts: name "ಜ್ವಾಲಾಮಾಲಾ ನ್ಯೂಸ್", short_name "ಜ್ವಾಲಾಮಾಲಾ", lang kn, start_url "/?source=pwa", display standalone, theme_color #1F2447, background_color #FFFFFF, icons 192/512 + maskable (ember flame on indigo — generate PNGs from an SVG with a script), shortcuts (ಲೈವ್, ಹುಡುಕಿ, ಕಾರ್ಯಕ್ರಮ).
2. Serwist service worker (src/app/sw.ts):
   - precache app shell, fonts, icons, /offline
   - pages: network-first, 3s timeout, fallback to cache then /offline
   - public Supabase GET requests: stale-while-revalidate, 200 entries, 1 day
   - i.ytimg.com thumbnails: cache-first, 300 entries, 7 days
   - never cache /admin, /account, auth, or non-GET requests
3. Bookmarked article pages are cached when saved, so they open offline.
4. Install banner "ಆ್ಯಪ್ ಆಗಿ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ" after the 2nd visit; iOS gets an "Add to Home Screen" guide.
5. Push opt-in only after a button tap, with topic choices (ಬ್ರೇಕಿಂಗ್, ಲೈವ್, chosen categories). Save to push_subscriptions via /api/push/subscribe. Explain iOS limits in docs.
6. "ಹೊಸ ಆವೃತ್ತಿ ಲಭ್ಯವಿದೆ" update toast with refresh button. Online/offline toast.
7. Give me steps to test offline mode and installation in Chrome DevTools and on a real Android phone.
Report and stop.
```

### Phase 9 — SEO and WordPress migration
```
Read AGENTS.md first.
TASK: Phase 9 — SEO and data migration.
1. generateMetadata on every public route; canonical URLs.
2. JSON-LD: NewsArticle, VideoObject, Event, BreadcrumbList, Organization.
3. sitemap.ts (split by type), news sitemap for last 48 hours, robots.ts.
4. Dynamic OG images 1200×630 with next/og: indigo background, Kannada title (load Anek Kannada font file), flame row, event-date badge.
5. scripts/migrate-wordpress.ts (run with tsx): read docs/data/wordpress/ export; skip anything in docs/data/demo-skip-list.txt; map categories by legacy_wp_id; keep multi-category links; pull YouTube/Facebook URLs from content; parse event dates from Kannada/English title text; if parsing fails, save as draft and list in a report; create redirects rows for every old URL; write docs/data/migration-report.csv. Support --dry-run.
6. Middleware legacy URL redirects using the redirects table; test with sample old URLs.
Report and stop.
```

### Phase 10 — Quality and launch
```
Read AGENTS.md first.
TASK: Phase 10 — testing, audit and launch prep.
1. Complete Playwright suite for key flows (home, category, article, search both modes, login, bookmark, contact form, admin publish, offline page).
2. Lighthouse CI config for /, a sample article, /search on mobile; fix anything below brief targets.
3. Accessibility pass (axe) and fix issues.
4. Security review: env usage, RLS on every table, CSP headers, rate limits, sanitization. List findings and fixes.
5. README.md: setup, scripts, architecture, env vars.
6. docs/DEPLOYMENT.md: create production Supabase project, `supabase link`, `supabase db push`, deploy functions, set secrets, webhooks, cron, auth providers, hosting deploy steps for our chosen host, Cloudflare DNS, redirect checks, rollback plan.
7. docs/GO-LIVE-CHECKLIST.md.
Do NOT deploy anything. Report and stop.
```

---

# PART C — Fix-up prompts (use anytime)

```
Read AGENTS.md. Something is wrong: [describe error / paste terminal output]. Find the root cause, explain it in 3 lines, then fix it. Do not change unrelated files.
```
```
Read AGENTS.md section 5. Compare [page] at 390px and 1440px with docs/design/stitch/[file]. List the differences, then fix them.
```
```
Read AGENTS.md section 9. Audit the code for any use of the service role key, missing RLS, unsanitized HTML, or missing auth checks in admin actions. Report first, then fix.
```
```
Some Kannada text is clipped or shows English. Check strings.kn.ts usage, fonts and line-heights across all pages and fix them.
```
```
Run pnpm typecheck, pnpm lint and pnpm test. Fix every error. Do not disable rules or add `any`.
```
```
Summarise the current state of the project from docs/PROGRESS.md and the code. What is done, what is left, what is risky?
```

---

## Files to put in `docs/` before Phase 0

| Path | Content |
|---|---|
| `docs/design/jwalamala-brand-kit.html` | Brand kit |
| `docs/design/stitch/` | Exported Google Stitch screens |
| `docs/audit/jwalamala-audit.docx` | Live-site audit |
| `docs/data/categories.csv` | Real categories: name_kn, name_en, slug, parent, legacy_wp_id |
| `docs/data/wordpress/` | WordPress export (WXR XML) |
| `docs/data/demo-skip-list.txt` | Demo slugs to skip |
| `docs/data/videos-dataset.csv` | Nithin's video dataset |

## Tips for GPT-based agents in VS Code

- **One phase per chat.** Start a new chat when a phase is approved.
- **Big phases:** if the agent stops halfway, reply `continue from where you stopped; check docs/PROGRESS.md first`.
- **Commit after every phase:** `git add . && git commit -m "Phase N complete"`, so you can roll back.
- **Never paste production keys** into the chat. Local Supabase keys are fine.
- **Screens:** attach the Stitch screenshot for the page you're building in that chat.