# 11 — ANALYTICS, SEO, GROWTH AND MONETIZATION

## A — Analytics
### A1 Real-time newsroom dashboard (admin)
- Live readers now (last 5 min, via lightweight beacon to `/api/pulse` stored in a short-lived table or Supabase Realtime presence), top 10 posts now, traffic sources (direct, Google, Discover, WhatsApp, Facebook, YouTube — from referrer + utm), device split, top places.
- Per-post stats page: views by hour, average engaged time (beacon every 15s while visible, capped), scroll depth (25/50/75/100), listen plays, shares clicked, push clicks.
- Daily/weekly email report to editors.
- Privacy: no personal data in analytics tables; hashed session ids; respect Do Not Track for engaged-time beacons.
### A2 External analytics
- One of GA4 / Plausible / Cloudflare Web Analytics (decide in Phase 0). Events: article_view, video_play, listen_play, share_click, push_subscribe, search, ad_click (manual ads only), newsletter_signup, install_app.
- Google Search Console + Bing Webmaster verified via settings.

## G — News SEO
### G1 Checklist
- Article: headline ≤ 110 chars, unique meta description, canonical, `max-image-preview:large` robots meta, primary image ≥ 1200px wide, author and dates in HTML + JSON-LD, speakable not required.
- News sitemap (last 48h), main sitemaps split by type and month, image sitemap entries.
- IndexNow ping (Bing/Yandex) on publish.
- "Add Jwalamala as a preferred source on Google" prompt and Discover follow tips on About page and after 3rd article view (dismissible).
- Internal linking: auto "related" + editor inline links; tag/topic hubs as pillar pages.
- Core Web Vitals budgets from 06 §7 enforced in CI.
- Structured data per type: NewsArticle, LiveBlogPosting, VideoObject, ImageGallery, Event, Person, Organization (with logo, sameAs), BreadcrumbList, FAQPage only where real FAQs exist.
### G2 Editor SEO helper (in post editor)
- Score panel: title length, summary present, event date set, image + alt, tags count, internal links count, slug readability, duplicate title warning.

## M — Monetization (in addition to 03-ADS)
### M1 Ads upgrades — P1
- Ad Manager (GAM) readiness: slot component can switch provider to GAM later (keep provider interface).
- Sponsored slots in trending bar and topic hubs ("ಪ್ರಾಯೋಜಕರು: name").
- Festival campaign packs (e.g. Paryushana/Dashalakshana week takeover) = time-boxed set of manual ads across slots.
- Advertiser self-serve enquiry → quote → admin creates campaign.
### M2 Support Jwalamala (donations/membership) — P2
- Razorpay (India) one-time and recurring support; tiers with benefits (ad-light experience, supporter badge, early access to event videos).
- `supporters`, `payments` tables; webhooks verified by signature; receipts by email. Ask client about legal/tax setup before building.
- Ad-light: supporters get fewer ad slots (config), never zero on sponsored content.
### M3 Sponsored content — P2
- Sponsored post workflow with advertiser approval step, disclosure label, rel="sponsored" on outbound links, report of views for advertiser.
### M4 Paid community notices — P2
- Price per notice type; payment link; admin marks paid.

## MS — Multi-site (Vijayaru 360) — P2
- `sites` table and `site_id` on content tables, or separate Supabase project per site (decide later). All branding in `config/site.ts` + `site_settings`. Keep code site-agnostic from Phase 1.

## Growth features summary
- Install app prompts, push, WhatsApp/Telegram channels, newsletter, preferred sources prompt, follow system, quizzes, series, topic hubs, community notices, basadi directory, Jain calendar reminders.
