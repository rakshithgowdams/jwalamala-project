# 03 — ADS SYSTEM (Manual ads + Google AdSense)

## 1. Concepts
- **Ad slot**: a fixed position on a page (e.g. `article_in_content_1`). Slots are rows in `ad_slots`, created by seed and editable in admin.
- **Slot mode** (per slot):
  - `manual` — show a manual ad; if none is eligible, collapse the slot.
  - `google` — always show Google AdSense.
  - `manual_then_google` — show a manual ad if eligible, otherwise AdSense (DEFAULT).
  - `off` — render nothing.
- **Manual ad (creative)**: an image (or HTML-free banner) sold directly, with schedule, targeting and tracking. Rows in `ads`.
- **Campaign**: groups creatives for one advertiser and period.
- **Global switches** in `site_settings.ads`: `enabled`, `adsense_enabled`, `adsense_client_id` (ca-pub-…), `adsense_auto_ads` (default false), `manual_label` ("ಪ್ರಾಯೋಜಿತ"), `google_label` ("ಜಾಹೀರಾತು"), `lazy_load_margin` ("200px"), `sticky_mobile_enabled`.
- **Per-post switch**: `posts.hide_ads` (for sensitive posts, e.g. obituaries/shraddhanjali).
- **Per-category switch**: `categories.hide_ads`.

## 2. Slot list (seed these)

| slot_key | Page | Position | Desktop size | Mobile size | Default mode |
|---|---|---|---|---|---|
| home_top_leaderboard | Home | Above live/hero | 970×90 or 728×90 | 320×100 | manual_then_google |
| home_hero_sidebar | Home | Under latest list | 300×250 | hidden | manual_then_google |
| home_after_hero | Home | After editor's picks | 970×250 | 300×250 | manual_then_google |
| home_between_sections | Home | After every 2nd band (max 3) | 728×90 | 300×250 | google |
| home_sidebar_sticky | Home | Right rail, sticky | 300×600 | hidden | google |
| home_footer_banner | Home | Before footer | 970×90 | 320×100 | manual_then_google |
| category_top | Category/tag/place/author/archive/videos | Under title | 728×90 | 320×100 | manual_then_google |
| category_in_grid | Same | After card 6 and 15 | card-sized native | 300×250 | google |
| category_sidebar | Same | Sidebar | 300×250 | hidden | manual_then_google |
| article_top | News/gallery | Above media | 728×90 | 320×100 | manual_then_google |
| article_in_content_1 | News | After paragraph 2 | 336×280 / fluid | 300×250 | google |
| article_in_content_2 | News | After paragraph 6 (≥8 paras) | 336×280 / fluid | 300×250 | google |
| article_end | News/video/gallery | After tags | 728×90 | 300×250 | manual_then_google |
| article_sidebar_top | News | Sidebar top | 300×250 | hidden | manual_then_google |
| article_sidebar_sticky | News | Sidebar sticky | 300×600 | hidden | google |
| video_below_player | Video | Under meta, ≥150px from player | 728×90 | 320×100 | manual_then_google |
| video_sidebar | Video | Right column | 300×250 | hidden | manual_then_google |
| search_inline | Search | After result 5 | 728×90 | 300×250 | google |
| events_sidebar | Events | Sidebar | 300×250 | 300×250 below list | manual_then_google |
| global_mobile_sticky | All public pages with ads | Fixed bottom, closable | hidden | 320×50 | manual_then_google |

Never show ads on: /admin, /account, /login, /contact, /advertise, legal pages, 404, /offline, error pages, empty-result pages.

## 3. Manual ad eligibility (server-side selection)
A manual ad is eligible for a slot when ALL are true:
- `status = 'active'` and campaign is active.
- `now()` between `starts_at` and `ends_at`.
- slot_key is in `ads.slot_keys`.
- Device matches (`all` / `mobile` / `desktop`).
- Targeting matches: `target_category_ids` empty OR overlaps the page's categories; `target_places` empty OR includes the page's place; `target_pages` empty OR includes page type.
- `max_impressions` null OR total impressions < max. `max_clicks` null OR total clicks < max.
- Daily cap not reached (`daily_impression_cap`).
Selection: highest `priority` first; among equal priority, weighted random by `weight`. Selection is done in a SQL function `pick_manual_ad(slot_key, page_type, category_ids, place, device)` so it is fast and consistent. Page HTML is cached, so the choice is made client-side-refreshable: the `<AdSlot>` component renders the server pick, and when the page is served from cache longer than 10 minutes it re-requests `/api/ads/pick` to rotate.

## 4. Manual ad rendering
- `<ManualAd>`: `<a href="/api/ads/click/{id}" rel="sponsored noopener" target="_blank">` wrapping `next/image` (desktop and mobile creatives via `<picture>`/art direction), alt text in Kannada, small label "ಪ್ರಾಯೋಜಿತ" top-left.
- Creatives: JPG/PNG/WebP/GIF ≤ 300 KB, stored in bucket `ad-creatives` (staff write, public read) or external HTTPS URL.
- No third-party HTML/JS in manual ads (security). Optional: YouTube video creative for sponsors, lite embed.
- Click endpoint `/api/ads/click/[id]`: validates id, records click (bot filter: ignore known bot user agents, dedupe same session within 30s), appends UTM params (`utm_source=jwalamala&utm_medium=banner&utm_campaign={campaign_slug}`), 302 to target URL. Only http/https targets allowed.
- Impression: counted when ≥ 50% visible for ≥ 1 second (IntersectionObserver). Batched with `navigator.sendBeacon('/api/ads/impression')` every 5 seconds or on page hide. Server writes to `ad_stats_daily` via RPC `record_ad_events` (upsert counters). No per-impression rows.

## 5. Google AdSense rendering
- Load the AdSense script ONCE in the root public layout with `next/script` strategy `afterInteractive`, only when `ads.enabled && ads.adsense_enabled` and the route allows ads:
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={adsense_client_id}` with `crossOrigin="anonymous"`.
- `<GoogleAd>` client component renders:
  `<ins class="adsbygoogle" style="display:block" data-ad-client={client} data-ad-slot={slot.adsense_slot_id} data-ad-format={slot.adsense_format} data-full-width-responsive="true">`
  and calls `(window.adsbygoogle = window.adsbygoogle || []).push({})` once on mount.
- Re-mount on route change using `key={pathname + slotKey}` so App Router navigation gets fresh ads. Guard against double push (ref flag).
- In-article slots use `data-ad-layout="in-article"` and `data-ad-format="fluid"` when `adsense_format = 'in-article'`.
- Lazy load: render the `<ins>` only when the slot is within `lazy_load_margin` of the viewport.
- Unfilled ads: listen for `data-ad-status="unfilled"` (MutationObserver) and collapse the slot to 0 height with a smooth transition (or show house ad if slot has `house_ad_id`).
- Auto ads: off by default; if turned on in admin, show a warning that layout may change.
- Development: show a grey placeholder with slot key and size instead of real AdSense (`NODE_ENV !== 'production'` or `ads.test_mode`). Never click real ads during testing.
- `/ads.txt` route returns `site_settings.ads.ads_txt` (default line: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
- CSP: allow the domains Google lists for AdSense (pagead2.googlesyndication.com, *.googlesyndication.com, *.doubleclick.net, *.google.com, *.gstatic.com, adservice.google.com and country variants). Verify against Google's current AdSense CSP guidance before finalising.
- Consent: add a simple cookie notice for India. If EEA/UK traffic matters, use a Google-certified CMP (e.g. Google Privacy & messaging) — ask before implementing.

## 6. Shared `<AdSlot slotKey pageContext />` component
Responsibilities:
1. Read slot config (cached) and global switches; return null if disabled, if route/post/category hides ads, or if device does not match.
2. Reserve space: fixed `min-height` per breakpoint from slot sizes (prevents CLS). Collapse only after we know it is empty.
3. Label above: "ಜಾಹೀರಾತು" (Google) / "ಪ್ರಾಯೋಜಿತ" (manual), 12px muted.
4. Decide: manual pick → `<ManualAd>`; else if mode allows Google → `<GoogleAd>`; else collapse.
5. Accessibility: `role="complementary"` `aria-label="ಜಾಹೀರಾತು"`; ads never steal focus.
6. Density guard: max 1 ad per viewport height on mobile; `home_between_sections` max 3 per page; never two ads adjacent.
7. Sticky mobile ad: 50px bar above bottom nav, close button (hides for session), not shown while the video player is sticky.

## 7. Placement rules (AdSense policy friendly)
- No ads that look like navigation or content cards without a label.
- Keep ads away from play buttons, share buttons and pagination (≥ 150px from video controls).
- No ads on pages without real content.
- Content must be longer than ads on each page.
- Do not ask users to click ads. No popups or interstitials in v1.

## 8. Reporting
- `ad_stats_daily(ad_id, slot_key, day, device, impressions, clicks)`.
- Admin report: date range, advertiser, campaign, slot; impressions, clicks, CTR; daily line chart; top slots; CSV export; printable advertiser report (PDF via browser print) to share with clients.
- AdSense earnings are NOT pulled in v1 (link to the AdSense dashboard). Optional later: AdSense Management API.
- Alerts: email/admin notice 3 days before a manual ad ends; when an ad reaches 90% of its impression cap.

## 9. Acceptance tests
- Slot in `off` mode renders nothing and no reserved space.
- `manual_then_google` shows manual when eligible, Google when not.
- Expired, future, wrong-device, wrong-category ads are never picked.
- Click endpoint rejects `javascript:` targets and counts a click once per 30s.
- Impression counted only after 50% visible for 1s.
- CLS < 0.1 on home and article pages with ads on.
- Ads absent on all excluded routes and on posts with hide_ads.
- AdSense script not loaded when adsense_enabled is false.
