# 02 — PAGE SPECIFICATIONS

Legend: [AD:slot_key] = an ad slot from 03-ADS.md. Every page uses the global header, breaking ticker (when active) and footer unless stated. Mobile shows the bottom navigation.

## Global layout
Header (desktop) — updated in v4 (see 08, 09, 10)
- Row 0 (thin, optional): ಕನ್ನಡ/English toggle (P2), sister-site links, today's date in Kannada, Jain daily times shortcut.
- Row 1 (indigo #1F2447): wordmark "ಜ್ವಾಲಾಮಾಲಾ" + FlameGarland (left) · weather + AQI chip (09 W1) · WhatsApp channel button (10 E6) · LIVE icon (glows ember when live) · search icon · theme toggle · login/avatar · menu icon (mega menu).
- Row 2 (white, 3px ember top border): home icon + category menu from DB (show_in_menu, sort_order), dropdown for sub-categories, "ಇನ್ನಷ್ಟು" overflow menu.
- Row 3 (white, 1px border): Trending topics bar (10 T2) — flash icon + hot topic, ವಿಡಿಯೋ, ಶಾರ್ಟ್ಸ್, #hashtags, ಹವಾಮಾನ, ಜೈನ ಪಂಚಾಂಗ, ವೆಬ್‌ಸ್ಟೋರಿ, place links.
- Below header on content pages: [AD:article_top] / [AD:category_top] leaderboard with "ಜಾಹೀರಾತು" label.
Header (mobile): compact indigo bar with wordmark, weather temp, search, menu icon; scrollable category pills; scrollable trending bar; drawer menu with all categories, utility pages (ಹವಾಮಾನ, ಜೈನ ಪಂಚಾಂಗ, ಬಸದಿಗಳು, ಸಮುದಾಯ ಪ್ರಕಟಣೆ, ಅವಕಾಶಗಳು), channels and settings.
Breaking ticker: ember "ತಾಜಾ" label + rotating headlines (pause on hover/focus).
Footer (indigo): about text, category links, quick links (ನಮ್ಮ ಬಗ್ಗೆ, ಸಂಪರ್ಕ, ಜಾಹೀರಾತು ನೀಡಿ, ಗೌಪ್ಯತಾ ನೀತಿ, ನಿಯಮಗಳು, ಹಕ್ಕು ನಿರಾಕರಣೆ, ಜಾಹೀರಾತು ನೀತಿ), social icons, app install link, FlameGarland, copyright.
Mobile bottom nav: ಮುಖಪುಟ, ವಿಡಿಯೋ, ಹುಡುಕಿ, ಕಾರ್ಯಕ್ರಮ, ಖಾತೆ.
Global: [AD:global_mobile_sticky] on mobile only.

## P-01 Home `/`
Section order is controlled from Admin → Homepage builder (site_settings.home_sections). Default order:
1. [AD:home_top_leaderboard]
2. Live banner (only when a post is_live): indigo panel, LIVE badge, thumbnail, title, "ಲೈವ್ ನೋಡಿ".
3. Hero: lead story (8 cols: large video/image, event-date badge, headline, summary) + "ಇತ್ತೀಚಿನ ಸುದ್ದಿ" list of 6 (4 cols) with [AD:home_hero_sidebar] under the list.
4. Editor's picks: 4 cards.
5. [AD:home_after_hero]
6. Upcoming events strip: horizontal scroll, gold date badges, "ಎಲ್ಲಾ ಕಾರ್ಯಕ್ರಮಗಳು" link.
7. "ನಿಮಗಾಗಿ" personalised row (logged-in users with interests only).
8. Category band ×N (each: title, "ಎಲ್ಲವನ್ನೂ ನೋಡಿ", 1 large + 4 small cards on desktop; swipe row on mobile). [AD:home_between_sections] after every 2nd band.
9. Shorts row (9:16 cards, swipe).
10. Two columns: Trending (numbered 1–5) + Most viewed videos, with [AD:home_sidebar_sticky] on desktop right rail if 3-column layout is enabled.
11. "ಈ ದಿನ ಹಿಂದಿನ ವರ್ಷಗಳಲ್ಲಿ" (On this day) — hidden if empty.
12. Send-news band (soft gold background): "ನಿಮ್ಮ ಊರಿನ ಸುದ್ದಿ ಕಳುಹಿಸಿ" + WhatsApp button.
13. YouTube / WhatsApp channel subscribe band.
14. [AD:home_footer_banner]
Data: cached with tags; revalidated on publish. Skeletons for each section.

## P-02 Category `/category/[slug]`
1. Breadcrumb: ಮುಖಪುಟ › Parent › Category.
2. Title, description, post count, "ಅಧಿಸೂಚನೆ ಪಡೆಯಿರಿ" follow button (push topic).
3. [AD:category_top]
4. Sub-category pills (if children exist).
5. Filter bar: type (ಎಲ್ಲಾ/ಲೇಖನ/ವಿಡಿಯೋ/ಶಾರ್ಟ್ಸ್), year, place, sort (ಹೊಸದು / ಕಾರ್ಯಕ್ರಮ ದಿನಾಂಕ / ಹೆಚ್ಚು ವೀಕ್ಷಣೆ). Filters live in URL search params. Mobile: filter button → bottom sheet.
6. Featured post of the category (latest featured, else latest).
7. Grid: desktop 3 columns + right sidebar (4-col layout option), tablet 2, mobile 1. [AD:category_in_grid] after card 6 and after card 15.
8. Sidebar (desktop): [AD:category_sidebar], popular in this category, upcoming events in this category.
9. Pagination (numbered, SEO-friendly `?page=2`) + "ಇನ್ನಷ್ಟು ತೋರಿಸಿ" on mobile (infinite load).
10. Empty state if no posts.
Same template reused for: tag `/tag/[slug]`, place `/place/[slug]`, author `/author/[slug]` (with author bio header), archive `/archive/[year]/[month]` (with month switcher).

## P-03 News (article) `/news/[slug]`
Main column (8 cols, reading width 68ch):
1. Breadcrumb (primary category).
2. Category pills (all categories), "ಪ್ರಾಯೋಜಿತ" label if sponsored.
3. H1 headline; optional English title in small muted text.
4. Summary (lead paragraph, larger).
5. Meta row: event-date badge · "ಕಾರ್ಯಕ್ರಮ: date" · "ಪ್ರಕಟಣೆ: date/time" · "ನವೀಕರಿಸಲಾಗಿದೆ: date" (if updated) · author · reading time · place.
6. Tool row: share buttons, bookmark, font size A−/A/A+, print.
7. [AD:article_top]
8. Media: lite video embed or featured image (16:9) with caption.
9. Body (Noto Serif Kannada 18px/1.8). [AD:article_in_content_1] after paragraph 2, [AD:article_in_content_2] after paragraph 6 (only if body has ≥ 8 paragraphs). Never inside quotes, lists or tables.
10. Event info box (date, time, place, organiser, map link, link to event page, "ಜ್ಞಾಪನೆ ಹೊಂದಿಸಿ").
11. Photo gallery (if any).
12. Tags row. Share again.
13. Prev / next in category.
14. [AD:article_end]
15. Related posts (4).
16. Comments (only if feature flag on).
Sidebar (4 cols, desktop): [AD:article_sidebar_top], latest news, [AD:article_sidebar_sticky] (sticky), upcoming events.
Mobile: sidebar content moves below related posts; floating WhatsApp share button.
Tracking: view counted once per session via /api/view.

## P-04 Video `/video/[slug]`
1. Player 16:9 (sticky on mobile scroll), LIVE badge if live.
2. Title, meta (event date, place, duration, views), actions (share, bookmark, font size for description).
3. [AD:video_below_player] — must keep at least 150px distance from player controls.
4. Description (collapsible), key points with timestamps, transcript (collapsible).
5. Event info box.
6. Right column: up-next playlist (same category), [AD:video_sidebar].
7. Below: "ಇದೇ ಆಚಾರ್ಯರ/ವಿಭಾಗದ ಇತರ ವಿಡಿಯೋಗಳು", [AD:article_end].

## P-05 Videos hub `/videos` and Shorts `/shorts`
- Live panel (or "ಈಗ ಯಾವುದೇ ಲೈವ್ ಇಲ್ಲ" with next scheduled live).
- Tabs by video category. Shorts row. Grid with filters. [AD:category_top], [AD:category_in_grid].
- `/shorts`: vertical swipe viewer (one short per screen) on mobile; grid on desktop. No ads between shorts in v1.

## P-06 Photo gallery `/gallery/[slug]`
- Title, meta, grid of photos, lightbox with swipe, captions, share. [AD:article_top], [AD:article_end].

## P-07 Search `/search`
- Search bar with ಕೀವರ್ಡ್ / ಕಾರ್ಯಕ್ರಮ ದಿನಾಂಕ toggle; date or range picker in date mode.
- Suggestions dropdown while typing (titles, categories, places).
- "Searching for ಶ್ರವಣಬೆಳಗೊಳ" helper when input is Latin.
- Filters panel (category, type, place, year, author); results count; sort.
- Result rows: thumbnail, highlighted title, snippet, event-date badge, pills.
- [AD:search_inline] after result 5.
- Empty state with suggestions, popular searches, recent searches.

## P-08 Events `/events` and `/events/[slug]`
- Month calendar (dots on days with events/coverage), day panel, list view toggle, year archive chips, filter by place.
- Upcoming vs completed tabs.
- Event page: name, dates, place, organiser, map link, description, reminder button, all linked coverage (videos/articles), [AD:events_sidebar].

## P-09 Static pages
- `/about`: mission, timeline, team, stats.
- `/contact`: send-news form (F-60), contact form, WhatsApp, email, map, FAQ.
- `/advertise`: audience stats, ad placement previews (from ad_slots), rate card note, enquiry form (F-61).
- `/privacy`, `/terms`, `/disclaimer`, `/ads-policy`: legal template with sticky table of contents. Privacy page must mention Google AdSense cookies.
- No ads on /contact, /advertise, legal pages.

## P-10 Login `/login` and Account `/account`
- Login: phone OTP (6 boxes, 30s resend), Google, "ಈಗ ಬೇಡ".
- Account tabs: ಉಳಿಸಿದವು, ಕಾರ್ಯಕ್ರಮ ಜ್ಞಾಪನೆಗಳು, ಆಸಕ್ತಿಗಳು ಮತ್ತು ಊರು, ಅಧಿಸೂಚನೆಗಳು, ಪ್ರೊಫೈಲ್, ಲಾಗ್ ಔಟ್.
- No ads.

## P-11 System pages
- 404: unlit flame illustration, search bar, home button, popular posts. No ads.
- `/offline`: saved posts list from cache, retry button. No ads.
- Error boundary page with retry.

## P-13 New public pages (v4)
See 09 and 10 for details: `/weather`, `/jain-calendar`, `/reservoirs` (P2), `/rates` (P2), `/topic/[slug]`, `/live/[slug]` (live blog uses /news/[slug] with liveblog layout), `/stories/[slug]` (P2), `/series/[slug]`, `/notices` + `/notices/[id]`, `/opportunities`, `/basadis` + `/basadis/[slug]`, `/polls/[id]`, `/quiz/[slug]`, `/account/feed`, `/account/history`, `/newsletter/confirm`, `/corrections`, `/editorial-policy`, `/fact-check-policy`, `/ownership`, `/support` (P2).
Home additions: Jain daily times panel, next parva days, weather mini-card, topic hub cards, series row, photo of the day, poll of the day, notices strip, stories shelf (P2).
Article additions: quick summary box, listen button + floating player, label badge, corrections box, reactions, inline "ಇದನ್ನೂ ಓದಿ", poll embed, accessibility toolbar, series rail, image layouts.

## P-12 Admin
See 07-ADMIN.md. No ads, no public header.
