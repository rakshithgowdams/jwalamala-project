# 07 — ADMIN CMS (`/admin`)

Style: same brand, denser. Indigo left sidebar, #F3F4F7 canvas, white panels, 14–16px text, compact tables, ember primary, tulasi = published, haldi = draft/in review, grey = scheduled/archived. Kannada labels with small English helper text.

Roles and access
| Area | reporter | editor | ad_manager | admin |
|---|---|---|---|---|
| Dashboard | own stats | ✓ | ads stats | ✓ |
| Posts | own drafts, submit for review | ✓ publish | – | ✓ |
| Categories/tags/places/authors | – | ✓ | – | ✓ |
| Events | create | ✓ | – | ✓ |
| Homepage builder, breaking, live | – | ✓ | – | ✓ |
| Submissions | – | ✓ | advertise enquiries | ✓ |
| Ads manager + reports | – | view reports | ✓ | ✓ |
| Import | – | ✓ | – | ✓ |
| Comments | – | ✓ | – | ✓ |
| Users & roles, settings, redirects, audit log | – | – | – | ✓ |

## Screens
A-01 Dashboard: stat blocks (today views, 7-day views, published this week, drafts/in review, new submissions, active ads, ad CTR 7d), views chart, top 10 posts, recent activity (audit log), upcoming events, ads ending soon, quick actions (+ ಹೊಸ ಲೇಖನ, + ಹೊಸ ವಿಡಿಯೋ, ಬ್ರೇಕಿಂಗ್ ಸೇರಿಸಿ, ಲೈವ್ ಆರಂಭಿಸಿ).

A-02 Posts list: tabs by status; filters (type, category, author, place, event date range, publish date range, source); search; columns (thumb, title_kn, categories, event date, status, author, views, updated); bulk (publish, archive, add category, delete); row actions (edit, preview, duplicate, view live).

A-03 Post editor (full page):
- Left: title_kn, title_en, slug (auto from translit, editable), summary, type switch, video URL (auto-detects provider, ID, thumbnail, duration), featured image (URL or upload), Tiptap editor (headings, bold, lists, quote, link, image, YouTube embed, table), key points rows, transcript, gallery images (for gallery type).
- Right panel: status + Publish/Schedule/Submit for review; schedule time; EVENT DATE (required, gold), event end date, link to event (search/create), place (search/create), categories multi-select with primary radio, tags, author, toggles (featured, editor's pick, breaking + until, live, sponsored + sponsor name, hide ads, allow comments), SEO title/description with counters, OG image, social preview, revision history, delete.
- Autosave every 30s, unsaved-changes guard, preview in new tab (draft token), "Send push" button after publishing (editor+).

A-04 Categories: tree with drag reorder/nesting (dnd-kit); side panel form (names, slug, description, parent, show in menu, show on home, hide ads, SEO); counts.
A-05 Tags & places: tables with merge duplicates action.
A-06 Authors: list + form.
A-07 Events: calendar/table toggle; form; linked coverage list; status.
A-08 Homepage builder: draggable list of sections (from 02-PAGES P-01) with on/off toggle and settings (e.g. which category, how many items); lead story picker; editor's picks ordered list; preview.
A-09 Breaking & live: current breaking items with expiry, add/remove; live control (select post, start/stop, push toggle).
A-10 Submissions inbox: two-pane; filters by kind/status; actions convert to post (prefills editor), reply (mailto/WhatsApp link), archive; advertise enquiries → create advertiser.
A-11 Comments moderation (if enabled).
A-12 Import: upload CSV → column mapping → preview 10 rows with warnings (missing event date = haldi, duplicate = ember, bad URL = ember) → start → live progress → results table + download report.
A-13 Users & roles: list, invite by email/phone, change role, block.
A-14 Settings tabs: ಸಾಮಾನ್ಯ (site name, logo, contact), ಸಾಮಾಜಿಕ, ಸುದ್ದಿ ಟಿಕರ್, ವೈಶಿಷ್ಟ್ಯಗಳು (feature flags: comments, personalised row, shorts, on-this-day), SEO defaults, ಜಾಹೀರಾತು (global ads switches, AdSense client id, auto ads toggle with warning, test mode, labels, lazy-load margin, sticky mobile toggle, ads.txt editor), Redirects table (add, test, hits).
A-15 Audit log: filterable table with diff viewer.

## Ads manager (`/admin/ads`)
AD-01 Overview: active ads, impressions/clicks/CTR (7d, 30d), top ads, top slots, ending soon, AdSense status (enabled, client id set, ads.txt ok).
AD-02 Slots: table of all slots (key, page, size, mode dropdown, AdSense slot id, format, house ad, active). Inline mode switching. Visual map preview: wireframe of Home/Category/Article with slot positions highlighted and their current mode.
AD-03 Advertisers: list + form (name, contact, phone, email, GST, notes), their campaigns and totals.
AD-04 Campaigns: list + form (advertiser, dates, status, notes).
AD-05 Ads list: filters (status, advertiser, slot, device, date); columns (preview, title, slots, dates, device, priority/weight, impressions/cap, clicks, CTR, status); actions (pause/resume, duplicate, edit, report).
AD-06 Ad editor: title, campaign, desktop creative + mobile creative (upload/URL, size check against selected slots, live preview inside each selected slot size), alt text, target URL (validated) + UTM preview, slots multi-select, device, schedule, priority, weight, targeting (categories, places, page types), caps (total impressions, clicks, daily), house ad toggle, status.
AD-07 Reports: date range, filters (advertiser, campaign, ad, slot, device); KPIs; daily line chart; table by day/slot; CSV export; printable advertiser report page with MyDesignNexus/Jwalamala branding.
