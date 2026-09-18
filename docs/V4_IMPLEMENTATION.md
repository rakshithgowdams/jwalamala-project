# v4 implementation tracker

Updated 16 September 2026. The user requested all v4 features. This document distinguishes working code, external setup, and remaining specification work; it is not a claim of full v4 completion. The archived prompt pack is reference material, not a source of per-command approval requirements.

## Implemented workstreams

| Area | Available implementation |
| --- | --- |
| Requested pages | Home, videos, News, Pravachana, Utsava, Panchakalyana, Chaturmasa, Samaja and Basadigalu categories, article/video detail, events and archives |
| Accounts | Email and app password, signup/confirmation/recovery, direct Google OAuth, optional phone OTP, protected account/admin routes |
| PWA | Install/update controls, public offline reading, private-route cache exclusions, desktop/mobile layouts, supplied logo and local Kannada fonts |
| Discovery | Paginated search/categories/archives/tag/topic/place/author/series/video listings, linked state/district/city filters, Kannada/Latin aliases, follows, history, personalized feed, chapters and local video resume |
| Reading | Reader font/spacing/contrast/theme controls, sharing/printing/bookmarks, summaries, reviewed English article versions and language metadata |
| Utilities | Cached weather provider, saved-place header menu/picker, hourly/daily outlook, district snapshot grid, four-pollutant estimated AQI, rain probability banner, solar times, advisor-approved Jain rules, calendar reminders, reservoir/rate charts and CSV upserts |
| Media | Rich text links/images/tables, upload validation and resizing, image credits and collages, galleries, series, Web Stories/AMP, live-blog text/media/pins/reactions, Sarvam audio worker and persistent player |
| Community | Moderated notices/condolences/opportunities, basadi directory and near-me, optional moderated comments, contributor phone verification and administrator approval, own-draft-only contributor access |
| Engagement | Single/multiple-choice polls, closed-poll results, quizzes, reactions, newsletter double opt-in/unsubscribe, push preferences/quiet hours/caps, event and parva reminder queue/cancellation |
| Newsroom | Permission matrix, desk/assignments/review, locking/takeover, versions/comparison/restore, account draft recovery, filtered/paginated post manager, scheduling/embargoes, reviewed AI suggestions and search-readiness checks |
| Publishing operations | Homepage ordering/toggles/picks/photo selection, mapped CSV draft imports, utility imports, redirects, audit history, job failure/lease controls, reviewed social/newsletter drafts, morning/evening draft schedules |
| Advertising | Site-wide placement configuration, lazy Google units, signed/manual rotation and reports, device/category/schedule targeting/caps, mobile sticky control, ads.txt, obituary exclusions, long-article breaks |
| Monetization | Disabled-by-default Razorpay support/membership, signed webhooks, amount/currency/idempotency/refund checks, receipts, supporter ad-light/early access, sponsor version approval, paid-notice payment-link review |
| Growth | Public/news/image sitemaps, RSS, article/live/author structured metadata, search verification settings, optional publisher-supplied preferred-source link, live and per-article analytics and CSV export |
| Provider operations | Server-only credentials, finite budgets/kill switches, scheduled job endpoints, explicit delivery approval, demo isolation even when credentials exist |

## External setup still required

Supabase URL, anon key and service-role key are now present. A read-only connectivity check reached the project, but required tables returned PGRST205. No live schema/data mutation was performed. The tested empty-project release files are supabase/release/01-schema.sql and 02-categories.sql. The first contains 36 ordered migrations with transaction boundaries; the second contains 12 category definitions, with no sample news or accounts.

Apply and verify the schema through Supabase SQL tooling, configure Auth/Storage/Realtime, create the first administrator, add genuine editorial content, and then disable demo mode. Google/SMS, AdSense, TTS, AI, mail, push, social and payment services require their actual account configuration and live verification. FFmpeg must exist in the deployed audio-worker runtime. Hosting, real data sources, legal publisher/payment information and approved religious rules remain owner inputs. See [V4_SETUP.md](V4_SETUP.md).

## Unfinished specification details

- Rich inline post/poll cards, external podcast ingestion, a dedicated quick-breaking composer, collaborative live presence, and detailed text-diff highlighting remain beyond the current editor controls.
- Full phonetic transliteration, bulk newsroom actions, complete archival pagination for saved/feed relationships, and some very large v4 resource lists require further work. Public primary listing routes now paginate in PostgreSQL; the shared recent feed still loads 200 posts and generic auxiliary queries load 500 rows.
- Automatic daily/weekly editor email reports, a configured external analytics adapter, IndexNow notifications, generated Kannada social cards and quiz image sharing remain unfinished. Current reports, CSV export, sitemaps, publisher verification and ordinary sharing work.
- Weather currently computes estimated AQI from PM2.5, PM10, NO2 and SO2; O3/CO/UV panels and verification of coordinates for all districts remain outstanding. Unknown coordinates/values are deliberately unavailable.
- Anonymous community photo uploads, a richer sponsored-topic/festival package workflow, GAM delivery, and complete Kannada/English administrative copy still need implementation/polish. Staff gallery/story/ad image uploads are available.
- Supabase Auth/Storage/Realtime browser tests, provider deliveries/webhooks, deployment load tests, Lighthouse launch targets and a real-device PWA acceptance pass remain unperformed.

## Verification

The exact 36-migration release bundle and both development seeds pass isolated PGlite checks, including location filtering before pagination, RLS coverage, permissions/contributor ownership, publication/embargo/early-access restrictions, sponsor hashes, chapters, private draft recovery, jobs, payments/paid notices, ballot deduplication, push/reminders and imports. This does not substitute for Supabase Auth/Storage/Realtime or advisor checks.

60 unit tests, TypeScript, ESLint and the final production build pass. The latest 50-test desktop/mobile regression passed 46 checks and identified text-animation contrast and menu keyboard issues in the remaining four checks. After fixing them and rebuilding, all four affected desktop/mobile checks pass. Automated WCAG 2 A/AA and 2.1 AA checks cover home, login, article, weather and the open navigation dialog. Requested news sections were checked at 320, 390, 768, 1024 and 1440 pixels; location filtering, reload/pagination persistence, image skeletons and reduced motion also pass. See [LOADING-AND-LOCATIONS.md](LOADING-AND-LOCATIONS.md). Live Supabase/provider verification remains outstanding.
