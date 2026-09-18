# 01 — FEATURE CATALOG

Every feature has an ID. Phase prompts refer to these IDs.

## Content
- F-01 Post types: article, video, short (vertical), photo gallery.
- F-02 Post status: draft, in review, scheduled, published, archived.
- F-03 Multi-category: one post in many categories, one marked primary (used in URL breadcrumb and card pill).
- F-04 Sub-categories (parent/child, 2 levels).
- F-05 Tags (free keywords) with tag pages.
- F-06 Places: town + district per post, with place pages (e.g. ಹಾಸನ, ಶ್ರವಣಬೆಳಗೊಳ).
- F-07 EVENT DATE separate from publish date; optional end date for multi-day events. Shown on every card and article.
- F-08 Events (ceremonies/programmes) with their own pages; many posts can link to one event.
- F-09 Authors/reporters with author pages.
- F-10 Video embeds: YouTube and Facebook; lite embed (thumbnail first, load on tap); youtube-nocookie.
- F-11 Key points with timestamps for videos (tap to jump).
- F-12 Transcript (collapsible) for pravachana videos.
- F-13 Photo galleries: external image URLs or small bucket images, lightbox, swipe.
- F-14 Reading time and video duration.
- F-15 Sponsored/partner posts flagged "ಪ್ರಾಯೋಜಿತ".

## Highlighting
- F-20 Breaking news: ticker on all public pages; auto-expires after set hours.
- F-21 LIVE: live stream banner on home and videos hub, LIVE badge, push alert.
- F-22 Featured / lead story slot on home (manual pick, fallback to latest).
- F-23 Editor's picks (ordered list).
- F-24 Latest news (time-sorted).
- F-25 Trending (views last 48 hours) and Most viewed (7 days).
- F-26 Upcoming events strip.
- F-27 "On this day" (posts whose event_date matches today in previous years).

## Discovery
- F-30 Keyword search in Kannada and English typing (transliteration).
- F-31 Event-date search (single date or range).
- F-32 Filters: category, type, place, year, author.
- F-33 Sort: newest, event date, most viewed.
- F-34 Event calendar (month grid + day list) and year archive.
- F-35 Date archive pages `/archive/[year]/[month]`.
- F-36 Related posts (shared categories/tags/event, then same place).
- F-37 Previous / next post in primary category.
- F-38 Recent searches (local) and popular searches (server).
- F-39 RSS feeds: site-wide and per category.

## Reading comfort (important for older readers)
- F-40 Font size control A− / A / A+ on article pages, remembered locally.
- F-41 Light / dark / system theme.
- F-42 Print-friendly article view.
- F-43 Share: WhatsApp first, Facebook, X, Telegram, copy link, native share on mobile.
- F-44 Bottom navigation on mobile.
- F-45 Back-to-top button on long pages.

## Reader accounts (optional login)
- F-50 Login with phone OTP or Google.
- F-51 Save posts (bookmarks), available offline.
- F-52 Event reminders (push; WhatsApp later).
- F-53 Interests (categories, town) → "ನಿಮಗಾಗಿ" personalised row on home.
- F-54 Notification preferences per topic.
- F-55 Continue watching (last watched videos, local).

## Community input
- F-60 Send news form (with event date, link, town), Turnstile protected.
- F-61 Advertise enquiry form.
- F-62 Contact/feedback form.
- F-63 Comments: OFF by default; if enabled, logged-in only and moderated (feature flag).
- F-64 WhatsApp channel / YouTube subscribe call-to-action bands.

## Ads (details in 03-ADS.md)
- F-70 Manual ads (direct advertisers) with scheduling, targeting, rotation, tracking.
- F-71 Google AdSense ads per slot.
- F-72 Per-slot mode: manual, google, manual with Google fallback, off.
- F-73 Global ads switch and per-page/per-post "no ads" switch.
- F-74 Impression and click reports, CSV export, expiry alerts.
- F-75 ads.txt managed from admin.
- F-76 Mobile sticky bottom ad (closable).

## Notifications and PWA
- F-80 Installable app, offline reading, offline page.
- F-81 Web push: breaking, live, chosen categories, event reminders.
- F-82 Update-available toast; online/offline toast.

## SEO and sharing
- F-90 Metadata, canonical URLs, JSON-LD (NewsArticle, VideoObject, Event, BreadcrumbList, Organization).
- F-91 Sitemaps (+ news sitemap last 48h), robots.txt.
- F-92 Dynamic OG images with Kannada title and event date.
- F-93 301 redirects from old WordPress URLs.

## Admin (details in 07-ADMIN.md)
- F-100 Roles: admin, editor, reporter, ad_manager, reader.
- F-101 Content CMS, categories, tags, places, events, authors.
- F-102 Homepage builder (drag sections, pick featured/editor's picks).
- F-103 Breaking/live controls.
- F-104 Ads manager + reports.
- F-105 Submissions inbox.
- F-106 Bulk CSV video import.
- F-107 Users and roles, audit log, settings, redirects.
- F-108 Analytics dashboard (views, top posts, ad performance).
