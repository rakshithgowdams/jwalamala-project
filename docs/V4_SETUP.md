# Jwalamala v4 setup and verification

This guide describes the implemented integrations. The local preview uses clearly marked sample content. Supabase credentials are present. A read-only connectivity check reached the configured project, but its posts, provider_settings, push_campaigns and calendar_reminders tables returned PGRST205 (missing schema cache table). Authentication and external providers have not been tested live. The feature tracker in V4_IMPLEMENTATION.md records unfinished specification details.

## Run locally

Use Node.js 22 or newer and pnpm. Install from pnpm-lock.yaml with pnpm install --frozen-lockfile. On this workstation, scripts/run.ps1 locates the bundled Node runtime when Node is absent from PATH.

- Development: ./scripts/run.ps1 dev
- Production preview: ./scripts/run.ps1 build, then ./scripts/run.ps1 start
- Verification: pnpm typecheck, pnpm lint, pnpm test, pnpm test:db
- Browser verification: start the production server on port 3000, then pnpm test:e2e.
- AMP validation: node scripts/check-amp.mjs (downloads the official validator rules).

## Supabase and authentication

1. For a project without the Jwalamala application schema, supabase/release/01-schema.sql is a combined schema bundle with no sample data. It is not a repeatable reset script. Use a separate development Supabase project or local Supabase instance. Review and apply either the 36-migration bundle followed by 02-categories.sql, or all numbered migrations in chronological order. Do not run both approaches against the same initialized project. The isolated PGlite test applies these migrations and both development seeds; it does not replace testing Supabase Auth, Storage, Realtime or its REST gateway. Location-filter setup is in [LOADING-AND-LOCATIONS.md](LOADING-AND-LOCATIONS.md).
2. Check the existing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in the deployment environment. Keep the service-role key server-only. Never put secrets in site_settings: that table contains public configuration.
3. Follow AUTH_SETUP.md for email confirmation, recovery redirects, Google OAuth and optional phone OTP. Email/password uses a Jwalamala account password. The app never asks for a Google account password.
4. Create your first authenticated account, then assign its profile the admin role through the database dashboard. Subsequent roles and permissions are managed in /admin/users and /admin/roles.
5. Seed files are development fixtures only. They contain labels and placeholder records, not verified news, observance dates or market values. Do not run development seeds against a live newsroom database.
6. Enable Realtime on the live-update tables if live blog subscriptions are required; the reader also polls as a fallback. Test storage access and public/private read policies using separate reader, contributor, editor and administrator sessions.

## Provider configuration

NEXT_PUBLIC_DEMO_MODE=true isolates all sample pages and disables live database/authentication actions, even when credentials are present. Switch it to false and rebuild only after applying the schema and inserting genuine content.

Every integration has a disabled or unavailable state. Saving credentials alone does not enable provider delivery. Enable the relevant service and set a finite monthly budget in /admin/providers after testing.

| Integration | Server configuration | Administration |
| --- | --- | --- |
| Submission verification | TURNSTILE_SECRET_KEY plus public NEXT_PUBLIC_TURNSTILE_SITE_KEY | Register intended hostnames in Turnstile |
| Request signing/rate limits | IP_HASH_SECRET; TRUST_PROXY_IP only behind a trusted proxy | Use independent random production secrets |
| Weather | OPEN_METEO_API_KEY | /admin/providers; verified place coordinates in /admin/places |
| Kannada speech | SARVAM_API_KEY, FFMPEG_PATH | TTS voice/pace and character budget; per-post audio toggle |
| AI suggestions | OPENAI_API_KEY, OPENAI_MODEL | AI budget/model pricing and sensitive-category exclusions |
| Newsletters and receipts | RESEND_API_KEY, NEWSLETTER_FROM | Verified sending domain; /admin/newsletter |
| Social publishing | SOCIAL_ENCRYPTION_KEY (64 hexadecimal characters), FACEBOOK_GRAPH_VERSION | /admin/social; encrypted destination tokens and explicit editorial approval |
| Web Push | NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT | /admin/push; reader preferences in account |
| Support payments | RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET | /admin/support; test keys first |
| Worker authorization | CRON_SECRET | Authenticated scheduler requests described below |

Open-Meteo production usage requires suitable commercial access. Without approved religious rules, Jain times display astronomical sunrise/sunset only. Reservoir and rate imports require named sources; no live values are invented.

The speech worker requires an actual FFmpeg executable on the server. Verify your hosting runtime supports child processes and the executable. A Node container is the most direct deployment option for this worker; a serverless deployment needs a compatible packaged binary or a separate worker deployment. Generation has a bounded deadline and defers member-only audio until public release.

## Jobs and webhooks

Configure your scheduler to POST /api/cron/jobs every minute and /api/cron/weather every 30 minutes, with Authorization: Bearer followed by CRON_SECRET. These are server-to-server requests. Each job invocation claims one job; provision concurrency according to your volume and database connection limits. Monitor /admin/jobs for failures, stalled leases, cancellation and reviewed retries. Social and push failures can be uncertain deliveries and must not be blindly retried.

Configure Razorpay webhooks at /api/support/webhook with the matching webhook signing secret. Verify captures, subscription charges, cancellations and refund ordering in test mode. Checkout verification does not alone prove a recurring charge. Receipts are payment acknowledgments, not tax exemption certificates. Fill in the actual legal entity, contact, terms, refunds and tier prices before enabling support. /admin/notice-billing records Razorpay payment links and manually verified references for paid notices; unpaid linked notices cannot be approved.

Newsletter subscription uses a confirmation link before activation. Verify confirmation expiry, unsubscribe, provider failures and suppression behavior on the configured sending domain. Use /admin/distribution-schedule to prepare morning/evening newsletter and social drafts; these schedules never auto-approve delivery. Social publishing and push require an approved editorial action. No real recipient messages or payments were executed during implementation.

## Ads

Use /admin/ad-settings for the global switch, test mode, placement modes, AdSense publisher/slot IDs, ads.txt and the optional closable mobile placement. /admin/ads manages direct creatives/campaigns and reports. Image uploads strip metadata, resize and enforce size limits. Manual tracking uses signed tokens and deduplicated events.

Set ADS_STRICT_CSP=true only after checking the full production browser flow with your configured Google ad units. Unfilled Google placements collapse. Obituary detail pages suppress ads; active supporter accounts receive fewer placements. Test all formats on the intended domain with actual approved AdSense configuration before launch.

## Editorial operations

/admin/desk covers assignments, review states and deadlines. Posts support image credits, featured-media collages, tags/places/authors, summaries, chapters, transcripts, scheduling, embargoes, versions and edit locks. The editor keeps a tab recovery copy and an account recovery snapshot every 30 seconds. Recovery snapshots do not publish or replace the live article. Restore explicitly, review, then save.

/admin/import imports reviewed CSV rows as drafts with mapping, preview and a downloadable report. /admin/utility-import imports calendar, reservoir and rate data; repeated imports update the same natural identifiers. /admin/redirects maps legacy local paths to final URLs. /admin/audit displays change history.

Sponsored posts require approval of the saved version through a private expiring link. Generate the link in the editor and share it with the advertiser through your normal communication process. Any covered content change invalidates publication approval. Private review and account pages are excluded from offline page caching.

## Launch verification still required

Complete authenticated editor and reader browser journeys against Supabase; test real Google OAuth, mail/SMS, storage uploads, Realtime, push on supported devices, worker deployment and payment webhooks. Verify provider budgets, proxy headers, outage states, backups and a rollback procedure. Supply genuine content, publisher identity, channel URLs, data sources and approved calendar rules. Validate final language copy and device performance. No production deployment or live database changes have been performed.

## Search and language configuration

GOOGLE_SITE_VERIFICATION and BING_SITE_VERIFICATION populate ownership metadata. NEXT_PUBLIC_PREFERRED_SOURCE_URL accepts a publisher-provided Google preference URL. English article HTML and summary must be reviewed in the editor; articles expose an English link and hreflang metadata only when the translated body and title exist. Interface language and article language remain separate choices.

## Windows build output

A OneDrive read-only reparse attribute blocked Next.js from replacing a generated build folder during verification. Stop the preview before rebuilding. If this recurs, remove only the workspace .next directory with native PowerShell and rebuild; never reset the source or database to fix generated output.
