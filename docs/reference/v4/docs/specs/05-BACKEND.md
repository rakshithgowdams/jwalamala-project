# 05 — BACKEND (Next.js server + Supabase)

## 1. Supabase clients
- `lib/supabase/server.ts` — server components/actions, user session (anon key + cookies).
- `lib/supabase/client.ts` — browser client (anon key).
- `lib/supabase/admin.ts` — service role, `import 'server-only'`, used only in trusted server code (ads click, imports, revalidation helpers).
- `middleware.ts` — refresh session, protect `/admin` and `/account`, legacy WordPress redirects.

## 2. Data access layer (`lib/queries/`)
One file per domain: home.ts, posts.ts, categories.ts, search.ts, events.ts, ads.ts, settings.ts, account.ts, admin/*.ts.
- Public reads use `unstable_cache`/fetch cache with tags: `settings`, `home`, `posts`, `post:{slug}`, `category:{slug}`, `events`, `ads`, `ad-slots`.
- Return typed DTOs (no raw DB rows to components).
- Pagination via range; always return total count.

## 3. Mutations (`lib/actions/`, Server Actions)
- Every action: `'use server'`, Zod parse, `requireRole([...])`, perform, write audit_log, `revalidateTag(...)`, return `{ ok, error, data }`.
- Actions: savePost, publishPost, schedulePost, archivePost, deletePost, reorderEditorsPicks, setBreaking, setLive, saveCategory, reorderCategories, saveTag, savePlace, saveAuthor, saveEvent, saveHomeSections, saveSettings, saveRedirect, saveAdSlot, saveAdvertiser, saveCampaign, saveAd, pauseAd, duplicateAd, uploadCreative, moderateComment, updateSubmission, convertSubmissionToPost, updateUserRole, toggleBookmark, setReminder, saveInterests, savePushTopics.

## 4. Route handlers (`app/api/`)
- `POST /api/revalidate` — header secret; body `{ tags: string[] }`.
- `POST /api/view` — `{ postId }`; one count per session (cookie); calls increment_view.
- `GET /api/ads/pick?slot=&page=&cats=&place=&device=` — returns public ad fields; cache 60s.
- `POST /api/ads/impression` — beacon batch `[{adId, slotKey, device}]`; max 50; calls record_ad_events.
- `GET /api/ads/click/[id]?slot=&d=` — record_ad_click → 302 to target with UTM; bot UA filter.
- `POST /api/push/subscribe`, `POST /api/push/unsubscribe`.
- `GET /api/search/suggest?q=` — search_suggest, cache 5 min.
- `GET /rss.xml`, `GET /category/[slug]/rss.xml`.
- `GET /ads.txt` — from settings.
- Rate limiting: simple token bucket per IP hash stored in Supabase (or Cloudflare rules) for view, impression, click, suggest, push.

## 5. Edge Functions (`supabase/functions/`)
- `submit-form`: kinds news/event/advertise/contact; Zod; Turnstile verify; rate limit 5/hour per IP hash; insert submission; notify editors (push/email).
- `send-push`: webhook on posts when published with is_breaking/is_live, or manual trigger from admin; send to matching topics; remove 404/410 endpoints; write notifications_log.
- `event-reminders`: daily; push to users with reminders for events tomorrow.
- `ads-alerts`: daily; find ads ending in 3 days or at 90% cap; notify ad managers; set expired ads to `expired`.
- `import-videos`: batches of 100 from import job; normalise URLs; extract video_id; duplicate check; optional YouTube Data API metadata; title_translit; map categories/places by name; write import_rows; update job progress.
- `revalidate-site`: webhook on posts, categories, events, site_settings, ad_slots, ads → POST /api/revalidate with tags.
- Shared: `_shared/cors.ts`, `_shared/supabaseAdmin.ts`, `_shared/turnstile.ts`, `_shared/rateLimit.ts`.

## 6. Search
- `lib/utils/transliterate.ts`: Latin ↔ Kannada using a maintained Indic transliteration library (confirm Kannada support) + spelling normalisation (sh/s, aa/a, ee/i, oo/u, double consonants, w/v).
- Query flow: normalise → if Latin, create Kannada candidate → call search_posts with both → log normalised query in search_queries_daily.
- Backfill script for title_translit.

## 7. Caching and revalidation
- Public pages: static with tag-based revalidation; fallback `revalidate = 300`.
- Article pages: `generateStaticParams` for latest 200; others on demand.
- Views and ad counters never trigger revalidation.
- Breaking ticker and live banner: small client fetch every 60s (cheap endpoint) so cached pages stay fresh.

## 8. WordPress migration (`scripts/migrate-wordpress.ts`)
- Input: WXR XML in docs/data/wordpress/. Flags: `--dry-run`, `--limit`.
- Skip slugs in docs/data/demo-skip-list.txt; report skipped.
- Map categories by legacy id; keep multi-category links; primary = first real category.
- Extract YouTube/Facebook URLs from content/Elementor data.
- Parse event dates from title text (Kannada and English month names, dd-mm-yyyy, dd/mm/yyyy); failures → draft + report.
- Clean HTML (strip Elementor wrappers), sanitize, convert to body_html and basic body_json.
- Create redirects for `?p=`, `?page_id=`, `?cat=`, pretty slugs if any.
- Output docs/data/migration-report.csv.

## 9. Security checklist
- CSP with nonces; allow Supabase, youtube-nocookie.com, www.youtube.com, facebook.com, i.ytimg.com, Turnstile, AdSense domains (03-ADS.md §5).
- Headers: HSTS, X-Content-Type-Options, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy.
- Only http/https URLs accepted for links and ad targets.
- File uploads: type and size checked server-side.
- Admin session: re-check role on every action; log out blocked users.
- Supabase advisors clean before each phase ends.

## 10. Environment variables (.env.example)
NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, REVALIDATE_SECRET, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY, YOUTUBE_API_KEY, NEXT_PUBLIC_ADSENSE_CLIENT (fallback if not in settings), IP_HASH_SALT, NEXT_PUBLIC_ANALYTICS_ID, WEATHER_PROVIDER, WEATHER_API_KEY (if commercial), TTS_PROVIDER, SARVAM_API_KEY, AI_PROVIDER, AI_API_KEY, EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_FROM, FACEBOOK_PAGE_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, TOKEN_ENCRYPTION_KEY, INDEXNOW_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET (P2).
