# PHASE PROMPTS — paste ONE per new chat (phases 0–26)

Every prompt starts by telling the agent what to read. Commit to git after each approved phase.

---

## Phase 0 — Plan (no code)
```
Read AGENTS.md and ALL files in docs/specs/. Scan docs/design/ and docs/data/.
TASK: Phase 0 — planning only. Do not write code.
Give me:
1. The project in 6 lines.
2. A table of every page (02-PAGES) with its route and the ad slots on it.
3. Assumptions.
4. Questions I must answer, including: WordPress vs video dataset overlap; event date range needed; Latin search scope; hosting (Cloudflare OpenNext or Vercel); SMS provider for OTP; AdSense account approved yet and publisher ID; which slots should start as manual vs Google; comments on or off; WhatsApp alerts now or later.
5. Exact packages to install with purpose.
6. Risks and mitigations (especially AdSense + CSP + CLS, Kannada search, cache vs ad rotation).
Also read docs/specs/08–13 and list which P0 items from 08 must be folded into phases 1–14, and extra questions: weather provider plan, TTS provider and budget, AI provider, email provider, Jain times list approved by community advisor, reservoir/rates data sources.
Create docs/PROGRESS.md with phases 0–26 as a checklist. Stop.
```

## Phase 1 — Project foundation and design system
```
Read AGENTS.md and docs/specs/06-FRONTEND-UI.md.
TASK: Phase 1.
1. Create Next.js app (App Router, TS strict, Tailwind, ESLint, src dir, pnpm) in this folder. Add Prettier and @/ alias.
2. Tailwind theme + CSS variables for light/dark exactly as 06 §1.
3. Fonts via next/font/google (Anek Kannada with wdth axis, Noto Serif Kannada). html lang="kn".
4. src/config/site.ts, src/content/strings.kn.ts, src/lib/utils/dates.ts (Kannada month names, formatters, tests).
5. Build ALL ui/ components from 06 §2 plus FlameGarland.
6. Dev-only page /dev/components showing every component in all variants, light and dark.
7. .env.example from 05 §10.
8. Vitest + Playwright + axe set up with sample tests.
Report and stop.
```

## Phase 2 — Supabase database
```
Read AGENTS.md, docs/specs/04-DATABASE.md, docs/specs/03-ADS.md.
TASK: Phase 2 — LOCAL Supabase only.
1. Tell me to run `supabase init` and `supabase start`; wait for my confirmation and local keys.
2. Create migrations 001–013 in the order in 04-DATABASE.md. Show me each file before I apply.
3. Write supabase/seed.sql per 04 "Seed", including every ad slot from 03 §2 and 3 manual ads (active, expired, future).
4. Tell me to run `supabase db reset` locally.
5. Generate types: `supabase gen types typescript --local > src/lib/supabase/database.types.ts`.
6. Create lib/supabase/server.ts, client.ts, admin.ts (server-only), middleware.ts and root middleware.ts (session refresh + route protection; legacy redirects can be a TODO).
7. Tests (Vitest with anon/auth keys): anon can't read drafts; anon can't read ads table directly; pick_manual_ad never returns expired/future/wrong-device ads; reader can't change own role; search_posts finds "ಶ್ರವಣ" and "shravana".
8. Tell me how to open Supabase Studio advisors locally; fix all findings.
Report and stop.
```

## Phase 3 — Global layout and Home page
```
Read AGENTS.md, docs/specs/02-PAGES.md (Global layout incl. v4 header rows + P-01), docs/specs/10-CONTENT-ENGAGEMENT.md §T2, 05-BACKEND.md §2 and §7, 06-FRONTEND-UI.md §3. Look at docs/design/stitch/ home screens.
TASK: Phase 3.
1. Public layout: Header with all rows (weather chip and trending bar can show placeholders until Phase 15–16), CategoryMenu from DB, MobileDrawer, BreakingTicker (60s client refresh), LiveBanner, Footer, BottomNav, BackToTop.
2. lib/queries/home.ts using get_home_feed(); settings.ts; categories.ts. Cache tags as in 05 §7.
3. Home page with all sections in the order from site_settings.home_sections (P-01), each with skeletons and empty handling.
4. Temporary <AdSlot> that renders AdPlaceholder with the right reserved size (real ads come in Phase 7). Place all home slots.
5. SEO metadata for home + Organization JSON-LD.
6. Playwright: home renders all sections, ticker visible when breaking exists, menu drawer works on mobile.
Report and stop.
```

## Phase 4 — Category and listing pages
```
Read AGENTS.md, 02-PAGES.md P-02, 05-BACKEND.md §2.
TASK: Phase 4.
1. Shared ListingTemplate (header area, filters, featured, grid, sidebar, pagination/load more, empty state).
2. Routes: /category/[slug], /tag/[slug], /place/[slug], /author/[slug], /archive/[year]/[month].
3. Filters in URL params: type, year, place, sort; mobile BottomSheet.
4. AdSlot placeholders: category_top, category_in_grid (after card 6 and 15), category_sidebar.
5. Follow-category button (UI only; wired in Phase 11/12).
6. generateMetadata, BreadcrumbList JSON-LD, canonical with page param, RSS route per category.
7. Tests: filters change results, pagination works, unknown slug → 404.
Report and stop.
```

## Phase 5 — News, video, shorts and gallery pages
```
Read AGENTS.md, 02-PAGES.md P-03 to P-06, 06-FRONTEND-UI.md §4.
TASK: Phase 5.
1. /news/[slug]: every item in P-03 in order, including ArticleBody that injects in-content AdSlots after paragraph 2 and 6 (only if ≥ 8 paragraphs; never inside lists/quotes/tables).
2. Tools: ShareBar (WhatsApp first + native share), FloatingShare (mobile), BookmarkButton (UI; logged-out → /login?next=), FontSizeControl, print styles.
3. EventInfoBox, PrevNext, RelatedPosts (related_posts RPC), AuthorBox, TagList.
4. /video/[slug] with StickyVideo on mobile, KeyPoints jump, Transcript, up-next list, video_below_player slot ≥150px from player.
5. /videos hub and /shorts (vertical swipe on mobile).
6. /gallery/[slug] with Lightbox (dynamic import).
7. View counting via /api/view (once per session).
8. JSON-LD NewsArticle / VideoObject / ImageGallery; generateMetadata; generateStaticParams for latest 200.
9. hide_ads and is_sponsored respected.
10. Tests: both dates shown, in-content ad positions correct, key point jumps, view counted once.
Report and stop.
```

## Phase 6 — Search and events
```
Read AGENTS.md, 02-PAGES.md P-07 and P-08, 05-BACKEND.md §6.
TASK: Phase 6.
1. transliterate.ts + normalisation + tests; title_translit backfill script.
2. /search with keyword/event-date modes, suggestions (/api/search/suggest), filters, sort, highlighting, search_inline slot, empty state with popular + recent searches.
3. Log normalised queries to search_queries_daily.
4. /events with MonthCalendar, WeekStrip (mobile), DayPanel, list view, year archive, place filter; /events/[slug] with coverage and ReminderButton (UI); Event JSON-LD.
5. /archive links from calendar.
6. Tests: "shravanabelagola" = "ಶ್ರವಣಬೆಳಗೊಳ" top result; date search exact and range; calendar dots match seed.
Report and stop.
```

## Phase 7 — Ads system (manual + Google AdSense)
```
Read AGENTS.md and docs/specs/03-ADS.md completely.
TASK: Phase 7 — replace placeholders with the real ads system.
1. lib/ads/: config loader (slots + settings, cached with tag ad-slots), eligibility helpers, device detection.
2. Components: AdSlot (all responsibilities in 03 §6), ManualAd, GoogleAd (push once, remount on route change, lazy load, unfilled collapse, in-article format), AdsenseScript (loaded once, only when enabled and route allows), StickyMobileAd, AdLabel, AdPlaceholder (dev/test mode).
3. Routes: /api/ads/pick, /api/ads/impression (sendBeacon batching, 50% for 1s rule), /api/ads/click/[id] (validation, bot filter, 30s dedupe, UTM, 302), /ads.txt.
4. Route exclusions list (03 §2) and hide_ads for posts/categories.
5. Density guard and sticky mobile rules.
6. Update CSP for AdSense domains (verify with Google's current docs) and tell me what you allowed.
7. Tests: all acceptance tests in 03 §9 (unit + Playwright); Lighthouse CLS < 0.1 on home and article with ads on (test mode).
Report and stop.
```

## Phase 8 — Admin CMS: shell and content
```
Read AGENTS.md, docs/specs/07-ADMIN.md (roles, A-01 to A-11), 05-BACKEND.md §3.
TASK: Phase 8.
1. Admin layout (sidebar, top bar, breadcrumbs), role guard helper requireRole(), server-side checks on every page and action.
2. A-01 Dashboard, A-02 Posts list, A-03 Post editor (Tiptap dynamic import, autosave, preview token, revisions), A-04 Categories tree (dnd-kit), A-05 Tags & places, A-06 Authors, A-07 Events, A-08 Homepage builder, A-09 Breaking & live, A-10 Submissions inbox, A-11 Comments.
3. All Server Actions from 05 §3 for these areas with Zod, audit_log, revalidateTag.
4. Tests: reporter can't publish; editor can; reader redirected from /admin; publishing updates home (tag revalidation).
Report and stop.
```

## Phase 9 — Admin: ads manager, import, users, settings
```
Read AGENTS.md, 07-ADMIN.md (A-12 to A-15, AD-01 to AD-07), 03-ADS.md §8.
TASK: Phase 9.
1. Ads manager AD-01 to AD-07, including slot mode inline switch, visual slot map, creative upload to ad-creatives bucket with size checks, live preview per slot, targeting, caps, reports with Recharts, CSV export, printable advertiser report.
2. A-12 Import UI (mapping, preview, warnings, progress, report download) — backend job comes in Phase 11, use a local processing fallback for now if needed.
3. A-13 Users & roles, A-14 Settings (all tabs incl. ads settings and ads.txt editor, redirects), A-15 Audit log.
4. Tests: ad_manager can manage ads but not posts; pausing an ad removes it from pick_manual_ad; slot set to off hides it on the site.
Report and stop.
```

## Phase 10 — Reader login and account
```
Read AGENTS.md, 02-PAGES.md P-10, 01-FEATURES.md F-50 to F-55.
TASK: Phase 10.
1. /login with phone OTP + Google (tell me dashboard settings needed), auth callback, next= redirect.
2. /account tabs; bookmarks with useOptimistic; reminders; interests + town; notification prefs; profile; logout.
3. "ನಿಮಗಾಗಿ" home row using interests.
4. Continue watching (local).
5. Tests for protected routes, bookmark toggle, interests affecting home row.
Report and stop.
```

## Phase 11 — Edge Functions and automation
```
Read AGENTS.md, 05-BACKEND.md §5, 04-DATABASE.md Cron.
TASK: Phase 11. Create with `supabase functions new`, test with `supabase functions serve`.
1. submit-form (wire /contact and /advertise forms, Turnstile), send-push, event-reminders, ads-alerts, import-videos (connect to A-12), revalidate-site, shared helpers.
2. Database webhooks and pg_cron jobs (local), with SQL in a migration.
3. /api/revalidate.
4. Write docs/DEPLOYMENT-FUNCTIONS.md with production commands for secrets, webhooks and cron (do not run).
5. Tests where possible (function unit tests; import of a 50-row sample CSV with duplicates).
Report and stop.
```

## Phase 12 — PWA and push
```
Read AGENTS.md, 06-FRONTEND-UI.md §6.
TASK: Phase 12.
1. manifest.ts, icon generation script, Serwist sw.ts with the exact caching rules (never cache ads/admin/account).
2. /offline page with saved posts; pre-cache on bookmark.
3. InstallPrompt (2nd visit, iOS guide), PushOptIn with topics, /api/push/subscribe|unsubscribe, follow-category wiring, UpdateToast, OfflineToast.
4. Give me testing steps for DevTools and a real Android phone; note iOS limits in docs.
Report and stop.
```

## Phase 13 — SEO, static pages and WordPress migration
```
Read AGENTS.md, 02-PAGES.md P-09 and P-11, 01-FEATURES.md F-90 to F-93, 05-BACKEND.md §8.
TASK: Phase 13.
1. Static pages: about, contact, advertise (slot previews from ad_slots), privacy (mention AdSense cookies), terms, disclaimer, ads-policy; 404; error boundary.
2. sitemap.ts (split), news sitemap, robots.ts, RSS, dynamic OG images with Kannada font.
3. scripts/migrate-wordpress.ts with --dry-run and report; legacy redirects in middleware with hits counter.
4. Tests: sample legacy URLs return 301 to correct pages; sitemap valid.
Report and stop.
```

## Phase 14 — Quality, security and launch prep
```
Read AGENTS.md and all specs.
TASK: Phase 14. Do NOT deploy.
1. Complete Playwright suite for all key flows (public, search, ads, login, admin publish, ads manager, offline).
2. Lighthouse CI (mobile) for home, category, article, video, search — meet targets in 06 §7 with ads in test mode.
3. axe accessibility pass; fix issues.
4. Security review per 05 §9 and AGENTS.md §5; list findings and fixes.
5. README.md, docs/DEPLOYMENT.md (Supabase link/push, functions, secrets, webhooks, cron, auth providers, storage buckets, hosting, Cloudflare DNS, AdSense ads.txt check, redirects check, rollback), docs/GO-LIVE-CHECKLIST.md, docs/ADMIN-GUIDE.md (simple Kannada/English guide for the client's editors and ad manager).
Report and stop.
```

---

---

# v4 EXPANSION PHASES (15–26)
Build these after Phase 14 passes, or interleave P0 items earlier if Phase 0 says so. Read docs/specs/08 for priorities.

## Phase 15 — Database additions (v4)
```
Read AGENTS.md and docs/specs/13-DATABASE-ADDITIONS.md.
TASK: Phase 15 — LOCAL Supabase only.
1. Create migrations 014+ for enum changes, column additions, new tables, RLS, functions, buckets and cron from 13. Never edit applied migrations. Show SQL before applying.
2. Seed: 31 Karnataka districts + key Jain centres with lat/lng (verify coordinates), 3 topics, 12 trending items, 2 series, 1 live blog with 8 updates, 20 Jain calendar days (mark as SAMPLE), 5 notices, 5 basadis, 3 opportunities, 2 polls, 1 quiz, sample reservoir and rate rows (SAMPLE).
3. Regenerate types. Run advisors and fix.
4. RLS tests for every new table (public vs staff vs owner), including vote/react RPC rate limits and hidden social tokens.
Report and stop.
```

## Phase 16 — Tags, topic hubs, trending bar
```
Read AGENTS.md, 10-CONTENT-ENGAGEMENT.md §T, 02-PAGES.md header rows.
TASK: Phase 16.
1. TrendingBar component (get_trending_bar, live dot, highlight item, horizontal scroll with arrows on desktop).
2. Tag chips on cards/articles, tag page upgrades (follow, popular tags block), tag merge/redirect support.
3. /topic/[slug] hub (intro, key facts, pinned, timeline, live blog link, events, auto feed) + JSON-LD.
4. Admin: /admin/trending (drag order, schedule), /admin/topics, tag tools (merge, rename, hide, usage counts).
5. Tests: expired trending items hidden; merged tag redirects; topic hub shows pinned first.
Report and stop.
```

## Phase 17 — Weather, AQI and Jain daily times
```
Read AGENTS.md and 09-WIDGETS-LIVE-DATA.md §W and §J1.
TASK: Phase 17.
1. lib/data-providers/weather (interface + Open-Meteo implementation), weather code map in Kannada, NAQI calculator with breakpoint table and unit tests.
2. Edge Function fetch-weather + cron every 30 min; /api/weather route with caching; stale handling.
3. WeatherChip (header) with popover + place picker + optional geolocation; /weather page (now, hourly, 7-day, AQI panel, rain banner, district grid, related news) with attribution.
4. Jain times: suncalc-based calculator using rules from site_settings.jain_times; JainTimesPanel for home and /jain-calendar; admin /admin/jain-times editor with live preview; disclaimer.
5. Admin /admin/weather: places toggle, rain thresholds, provider status, last fetch, budget/kill switch.
6. Tests: NAQI categories; sunrise/sunset for Hassan within ±2 min of a trusted reference you document; chip falls back gracefully when data is stale.
Report and stop.
```

## Phase 18 — Jain calendar, series, photo of the day, image layouts
```
Read AGENTS.md, 09 §J2, 10 §C4, §C6, §C7.
TASK: Phase 18.
1. /jain-calendar month view + day details + reminders + home "next parva" widget; admin CRUD + CSV import.
2. Series: /series/[slug], "ಈ ಸರಣಿಯಲ್ಲಿ" rail on video pages, next-episode prompt, local progress; admin series manager.
3. Photo of the day block + admin picker.
4. Image layouts (single, split2, collage3) and mandatory image credits in editor and article.
Report and stop.
```

## Phase 19 — Listen to article (TTS) and quick summary
```
Read AGENTS.md, 10 §C1 and §C2, 12 §AI.
TASK: Phase 19.
1. lib/tts provider interface + Sarvam implementation (kn-IN); text cleaner and sentence-safe chunker (respect provider character limit) with unit tests.
2. Edge Function generate-article-audio (on publish/major edit via webhook; text hash check; concatenate chunks; upload to article-audio bucket; update post_audio); monthly character budget + kill switch.
3. AudioPlayer: floating button, inline button with duration, sticky player bar, speed, skip, Media Session API; browser speechSynthesis fallback; hide when unavailable.
4. Quick summary box on articles; editor field with "AI ಸಲಹೆ" button (uses Phase 22 interface; stub until then).
5. Admin: per-post audio status, regenerate, disable; TTS usage page.
6. Tests: chunker never splits inside a word; player works across route change; budget exceeded → no generation + admin alert.
Report and stop.
```

## Phase 20 — Live blog
```
Read AGENTS.md, 10 §C3, 11 §G1.
TASK: Phase 20.
1. liveblog post layout: LIVE badge, pinned highlights, update stream, Realtime subscription with "N ಹೊಸ ಅಪ್‌ಡೇಟ್‌ಗಳು" button, load older updates, in-content ad slots after update 3 and 10.
2. Editor console /admin/live-blogs/[id]: quick composer (text, image URL, video URL, quote), key/pin flags, edit/delete, end live blog; presence of other editors.
3. LiveBlogPosting JSON-LD, revalidation per update, push option for key updates.
4. Tests: new update appears without layout jump; ended live blog shows final state.
Report and stop.
```

## Phase 21 — Community: notices, basadis, opportunities
```
Read AGENTS.md, 10 §N.
TASK: Phase 21.
1. /notices list + detail + submission form (Turnstile, photo ≤ 1 MB) + condolence messages (moderated); obituary pages hide ads and limit reactions.
2. /basadis directory with district filter, near-me (geolocation after tap), detail page with map link, timings, related news/events; place pages list basadis.
3. /opportunities with filters, expiry auto-hide, submission form.
4. Admin moderation queues for all three.
5. Tests for moderation flow and ad exclusion on obituaries.
Report and stop.
```

## Phase 22 — Newsroom workflow and AI assistant
```
Read AGENTS.md and 12-NEWSROOM-WORKFLOW.md.
TASK: Phase 22.
1. Role/permission matrix (role_permissions + admin UI) and permission checks helper replacing hard-coded role lists.
2. /admin/desk story budget kanban, assignment, deadlines, embargo, review queue with inline paragraph comments, request changes, publish checklist, edit locking with Realtime presence, version diff/restore.
3. Quick breaking modal (publish + ticker + optional push in one step).
4. lib/ai provider interface + implementation chosen in Phase 0; all assistant features from 12 §AI as suggestions with accept buttons; ai_suggestions log; usage/cost page; budget cap; disabled for chosen categories.
5. SEO helper score panel (11 §G2).
6. Tests: embargo blocks publish; checklist blocks publish; AI output never saved without accept; permission changes take effect immediately.
Report and stop.
```

## Phase 23 — Engagement: follows, feed, history, polls, quizzes, reactions, newsletter, push upgrades
```
Read AGENTS.md, 10 §E.
TASK: Phase 23.
1. Follow buttons (category, tag, topic, place, author, series), local follows for guests with sync on login, /account/feed, home "ನಿಮಗಾಗಿ" upgrade.
2. Reading history + "ಮುಂದುವರಿಸಿ" row + clear history.
3. Polls (embed block + home poll), quizzes with share card, reactions — all via rate-limited RPCs with device hash.
4. Newsletter: signup, double opt-in, digest builder, send via email provider, unsubscribe, admin list + issue history.
5. Push upgrades: rich notifications, action buttons, quiet hours, per-user daily cap, click tracking.
6. WhatsApp channel/Telegram buttons, WhatsApp formatter in admin, morning/evening bulletin drafts.
7. Tests for vote uniqueness, unsubscribe, quiet hours.
Report and stop.
```

## Phase 24 — Analytics, SEO upgrades, social publishing
```
Read AGENTS.md, 11-GROWTH-ANALYTICS-SEO.md, 12 §S.
TASK: Phase 24.
1. Pulse + engagement beacons (visible time, scroll depth, listen plays, share clicks) with batching and privacy rules.
2. /admin/analytics/live and /admin/analytics/posts dashboards; daily editor email report.
3. External analytics events; Search Console/Bing verification fields.
4. SEO: robots max-image-preview, IndexNow ping, image sitemap entries, LiveBlogPosting/Person JSON-LD checks, preferred-sources prompt.
5. Trust pages (editorial, corrections, fact-check, ownership), article labels, corrections box and /corrections log, author credentials.
6. Social publishing to Facebook Page and Telegram (official APIs, encrypted tokens), social_posts log, caption editor.
Report and stop.
```

## Phase 25 — Utility data and web stories (P2)
```
Read AGENTS.md, 09 §D, 10 §C5.
TASK: Phase 25.
1. /reservoirs and /rates pages with charts; admin fast-entry forms + CSV paste; source and time display; optional provider interface (only if a licensed source is confirmed).
2. Web Stories editor (slides), AMP story pages, stories shelf, structured data.
3. Accessibility toolbar (if not done), UI language toggle with strings.en.ts (P2).
Report and stop.
```

## Phase 26 — Monetization P2 and final hardening
```
Read AGENTS.md, 11 §M, 03-ADS.md.
TASK: Phase 26. Ask me before starting anything payment-related.
1. Sponsored trending/topic slots, festival campaign packs, GAM-ready provider switch in AdSlot.
2. (If approved) Razorpay support/membership with signed webhooks, supporter ad-light mode, receipts.
3. Paid notices flow (payment link + admin mark paid).
4. Full regression: Playwright suite, Lighthouse CI, axe, security review of all v4 features, load test of weather/pulse/vote endpoints.
5. Update README, DEPLOYMENT.md (new functions, cron, buckets, secrets, provider plans), ADMIN-GUIDE.md (Kannada + English) for all new admin screens.
Report and stop.
```


# FIX PROMPTS (use anytime)

```
Read AGENTS.md. Error: [paste]. Find the root cause, explain in 3 lines, fix it without touching unrelated files, then run typecheck, lint and tests.
```
```
Read AGENTS.md and 02-PAGES.md [page id]. Compare the page at 390px and 1440px with docs/design/stitch/[file]. List differences, then fix.
```
```
Read 03-ADS.md. Ads are [not showing / causing layout shift / showing on excluded pages / not counting]. Debug with the acceptance tests in §9 and fix.
```
```
Read AGENTS.md §5. Audit for service role key leaks, missing RLS, unsanitized HTML, missing role checks, unsafe URLs. Report first, then fix.
```
```
Kannada text is clipped, broken or in English somewhere. Check fonts, line-heights, strings.kn.ts usage on all pages and fix.
```
```
Read docs/PROGRESS.md and the code. Tell me what is done, what is left, what is risky, and what to do next.
```
