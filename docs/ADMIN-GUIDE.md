# Jwalamala administration / ನಿರ್ವಹಣಾ ಮಾರ್ಗದರ್ಶಿ

Sign in with an approved staff account. Permissions are checked by the server and database. Menu visibility alone does not grant access. Demo mode disables real account and CMS writes. See V4_SETUP.md for initialization.

## Daily publishing / ದೈನಂದಿನ ಪ್ರಕಟಣೆ

1. Open /admin/posts/new. Add Kannada title, event date/place, summary, article text and primary category. Select tags, public author and place. Add image credits for uploaded media.
2. Use the toolbar for headings, links, images and tables. Collage fields support two or three credited images. YouTube links can supply a thumbnail; chapter lines use MM:SS followed by a label.
3. Save a draft. Account recovery runs every 30 seconds for unsaved changes. The recovery button restores a saved copy for review; it does not publish it.
4. In /admin/desk, assign a story, set the deadline, request review and track changes. The post page supports paragraph comments, edit locks and version comparison/restore. An administrator can explicitly take over a lock.
5. Check search readiness and publication requirements. Set an embargo or future schedule when needed. AI output is a suggestion: review and accept individual fields.
6. For English, enter a reviewed English title, summary and article HTML. For sponsored content, save first, create the advertiser review link and obtain approval of that version. Covered changes invalidate approval.

ಶೀರ್ಷಿಕೆ, ಕಾರ್ಯಕ್ರಮದ ದಿನಾಂಕ, ಸ್ಥಳ, ಸಾರಾಂಶ, ಪ್ರಧಾನ ವಿಭಾಗ ಮತ್ತು ಚಿತ್ರ ಕೃಪೆ ಪರಿಶೀಲಿಸಿ. ಮೊದಲು ಕರಡು ಉಳಿಸಿ. ಸಂಪಾದಕೀಯ ಪರಿಶೀಲನೆಯ ನಂತರವೇ ಪ್ರಕಟಿಸಿ. AI ಸಲಹೆಗಳನ್ನು ಪರಿಶೀಲಿಸದೆ ಸ್ವೀಕರಿಸಬೇಡಿ.

## Screen directory / ಪರದೆಗಳು

| Screen | Purpose / ಬಳಕೆ |
| --- | --- |
| /admin/posts | Search/filter/paginate stories; edit / ಸುದ್ದಿ ನಿರ್ವಹಣೆ |
| /admin/desk | Assignments, deadlines, review / ಸಂಪಾದಕೀಯ ಕಾರ್ಯಪಟ್ಟಿ |
| /admin/home | Order sections, choose lead/picks, extra shelves and featured gallery / ಮುಖಪುಟ ವಿನ್ಯಾಸ |
| /admin/categories, tags, topics, trending | Categories, tag merging, topic pins/timelines and scheduled links |
| /admin/places, authors, series | Places/coordinates, author credentials and ordered episodes |
| /admin/events, jain-calendar, jain-times | Events, observances and advisor-approved religious offsets |
| /admin/live-blogs | Create live coverage; open its console to add/pin/edit/delete updates and end coverage |
| /admin/galleries, web-stories | Credited image uploads and slide content / ಚಿತ್ರಗಳು ಮತ್ತು ಕಥೆಗಳು |
| /admin/notices, opportunities, basadis | Community records and directory / ಸಮಾಜದ ಮಾಹಿತಿ |
| /admin/moderation, comments | Review community submissions, condolences and optional comments |
| /admin/contributors | Approve phone-verified local contributors; revoke contributor access |
| /admin/users, roles | Staff roles and permission matrix / ಬಳಕೆದಾರ ಅನುಮತಿಗಳು |
| /admin/ads, ad-settings | Direct campaigns, Google slots, caps, test mode, sticky placement and ads.txt |
| /admin/posters | Own 16:9 banners (1280×720) and 1:1 posters (1080×1080): pick pages (none = all), upload (auto-cropped), set IST start/end; they switch on and off by themselves |
| /admin/business-ads | Local shop ads from /advertise: verify, record offline payment, set dates/districts, approve; live status and 90-day views/clicks |
| /admin/support | Membership tiers, legal details and payment enablement |
| /admin/notice-billing | Notice amount/payment link and verified paid/waived status |
| /admin/newsletter, social | Build/edit/preview and explicitly approve distribution drafts |
| /admin/distribution-schedule | Prepare scheduled bulletin drafts; delivery still needs approval |
| /admin/push | Approve notifications; reader preferences/caps remain enforced |
| /admin/providers | Keys-present indicators, enablement, monthly budgets and AI category exclusions |
| /admin/jobs | Monitor failures, expired leases, reviewed retries and cancellation |
| /admin/analytics, analytics/posts | Live readers, article performance, daily charts and CSV export |
| /admin/weather | Coordinate readiness, snapshot times and provider status |
| /admin/reservoirs, rates | Source-backed dated readings / ಮೂಲಸಹಿತ ಅಂಕಿಅಂಶಗಳು |
| /admin/import, utility-import | Preview CSV imports; news imports remain drafts; utility imports upsert matching dates/identifiers |
| /admin/redirects, audit, settings | Legacy redirects, change history and public configuration |

## Operational rules / ಕಾರ್ಯಾಚರಣೆ

- Never place secret tokens in public settings. Provider secrets belong in the server environment; social tokens entered in the connection form are encrypted.
- Enable a provider only after setting a finite budget and testing its account. A credential alone does not activate sending.
- Review uncertain external delivery before retrying a failed push/social/email job. Job controls do not prove whether a provider delivered a timed-out request.
- A local shop ad is shown only when it is approved, marked paid or waived, and inside its start/end dates. Check every ad against the rules on /advertise before approving.
- Paid status is a staff verification record. Check the payment dashboard and record the provider reference; billing approval and editorial approval are separate.
- Mark sample material clearly and replace it with verified reporting before launch. Do not invent rates, rainfall, religious offsets or event dates.
- Image uploads accept JPEG/PNG/WebP/AVIF up to 1 MB; the server strips metadata and resizes. Ad output is limited to 300 KB.

ಪಾವತಿಯನ್ನು ಪೂರೈಕೆದಾರರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ. ಅಪೂರ್ಣ ವಿತರಣೆಯನ್ನು ಮತ್ತೆ ಕಳುಹಿಸುವ ಮೊದಲು ಹಿಂದಿನ ಸ್ಥಿತಿಯನ್ನು ಖಚಿತಪಡಿಸಿ. ಮಾದರಿ ವಿಷಯವನ್ನು ನೈಜ ಸುದ್ದಿಯಾಗಿ ಪ್ರಕಟಿಸಬೇಡಿ.
