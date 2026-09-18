# 08 — FEATURE RESEARCH AND PRIORITY MAP (v4 expansion)

Goal: bring Jwalamala to the level of a large professional news platform (TV9 Kannada, Prajavani, Vijay Karnataka, Public TV, Asianet Suvarna, BBC, NDTV, The Hindu class), adapted for a Jain community audience.

Sources: the TV9 Kannada article page screenshot supplied by the client (docs/design/reference/tv9-article.png), common patterns across major Indian and global news sites, and current platform research (listed at the end). Where a feature needs a paid or unofficial data source, it is marked ⚠.

## 1. What the TV9 Kannada reference page shows
| Element on reference | Jwalamala equivalent | Spec |
|---|---|---|
| Top strip with sister-language links | Kannada / English interface toggle + link to sister sites (Vijayaru 360 later) | 10 §L1 |
| Logo left; weather icon + AQI chip in header | Weather + AQI chip for reader's district | 09 §W1 |
| WhatsApp "Channel" button | WhatsApp channel follow button | 10 §E6 |
| LIVE TV icon | "ಲೈವ್" icon, glows ember when live | 02 P-01 |
| Search, profile, hamburger | Already in plan | 02 |
| Main nav with home icon, 15 categories | Category menu from DB | 02 |
| Second "trending" bar: flash icon + hot topic, video, short video, hashtags, weather, reservoir levels, web stories, city news, jobs | Trending topics bar managed by editors (tags, topic pages, utility pages) | 10 §T2 |
| "ಜಾಹೀರಾತು" labelled leaderboard below nav | article_top / global leaderboard slot | 03 |
| English breadcrumb with English article title | Kannada breadcrumb + English slug/title for SEO | 02 P-03 |
| Kannada H1 + long standfirst | Title + summary | 02 P-03 |
| Split two-image hero | Image collage layout option (2 or 3 images) | 10 §C4 |
| Sidebar 300×250 ad, then "Latest Articles" + "View More" | article_sidebar_top + latest list | 02/03 |
| Floating round audio/megaphone button bottom-left | "ಕೇಳಿ" listen-to-article (text-to-speech) | 10 §C1 |

## 2. Feature priority tiers
- **P0 Launch** — needed on day one (already in specs 01–07, plus items marked P0 below).
- **P1 Growth** — within 1–3 months after launch.
- **P2 Advanced** — 3–9 months; build when traffic and budget justify.

| ID | Feature | Tier | Spec |
|---|---|---|---|
| X-01 | Trending topics bar (editor-controlled, hashtags/topics/utility links) | P0 | 10 §T2 |
| X-02 | Tag pages, topic hub pages (curated), hashtag chips on articles | P0 | 10 §T1 |
| X-03 | Weather + AQI header chip, district picker, weather page | P0 | 09 §W1–W3 |
| X-04 | Jain daily panel: sunrise, sunset, Navkarsi, Porsi, Chauvihar times for chosen town | P0 | 09 §J1 |
| X-05 | Listen to article (Kannada TTS) with floating player | P1 | 10 §C1 |
| X-06 | AI short summary "ಸಂಕ್ಷಿಪ್ತ" (editor-approved bullet points) | P1 | 10 §C2 |
| X-07 | Live blog (minute-by-minute updates for big events) | P1 | 10 §C3 |
| X-08 | Web Stories (visual swipe stories, AMP) | P2 | 10 §C5 |
| X-09 | Photo of the day / picture stories | P1 | 10 §C6 |
| X-10 | Jain calendar: parva, tithi, festival list (editor-managed) | P1 | 09 §J2 |
| X-11 | Reservoir water levels (Karnataka) | P2 ⚠ | 09 §D1 |
| X-12 | Gold & silver rates, fuel prices | P2 ⚠ | 09 §D2 |
| X-13 | Community notices: shraddhanjali (obituaries), anniversaries, felicitations, programme invitations | P1 | 10 §N1 |
| X-14 | Jobs / opportunities board (community + scholarships) | P2 | 10 §N2 |
| X-15 | Basadi (temple) directory with map, timings, contacts | P1 | 10 §N3 |
| X-16 | Polls and quizzes | P1 | 10 §E3 |
| X-17 | Newsletter (daily/weekly email digest) | P1 | 10 §E5 |
| X-18 | WhatsApp channel + Telegram links; WhatsApp share of every card | P0 | 10 §E6 |
| X-19 | Personalised "My feed" + follow topics/places/authors | P1 | 10 §E1 |
| X-20 | Reading history, continue reading/watching | P1 | 10 §E2 |
| X-21 | Kannada / English interface toggle (content stays Kannada unless English version exists) | P2 | 10 §L1 |
| X-22 | Fact-check label, corrections log, editorial policy pages | P0 | 10 §Q1 |
| X-23 | Author profiles with credentials (E-E-A-T) | P0 | 10 §Q2 |
| X-24 | Citizen reporter programme (verified contributors) | P2 | 12 §R3 |
| X-25 | Newsroom workflow: assignment desk, story budget, approvals, embargo | P1 | 12 |
| X-26 | AI newsroom assistant: headline ideas, tag suggestions, alt text, translation draft, transcript cleanup | P1 | 12 §AI |
| X-27 | Social auto-posting to Facebook page / Telegram; WhatsApp message formatter | P1 | 12 §S1 |
| X-28 | Real-time analytics dashboard (live readers, top stories, sources) | P1 | 11 §A1 |
| X-29 | Memberships / donations ("support Jwalamala") | P2 | 11 §M2 |
| X-30 | Sponsored content marketplace and branded sections | P2 | 11 §M3 |
| X-31 | Video playlists and series (e.g. Chaturmasa 2026 series) | P0 | 10 §C7 |
| X-32 | Podcasts / audio pravachanas (external links or YouTube audio) | P2 | 10 §C8 |
| X-33 | Accessibility toolbar (font size, contrast, line spacing) | P0 | 10 §Q3 |
| X-34 | Google Preferred Sources / Discover follow prompts, news SEO | P0 | 11 §G1 |
| X-35 | Multi-site support (Vijayaru 360 from same codebase) | P2 | 11 §MS |

## 3. Research notes (for the agent; verify before implementing)
- Open-Meteo provides free weather and air quality APIs without a key, but the free tier is for non-commercial use; an ad-supported news site should budget for a commercial plan or use another provider. Attribution (CC BY 4.0) is required.
- Sarvam AI Bulbul v3 supports Kannada (kn-IN) text-to-speech with a REST limit of about 2,500 characters per request, so long articles must be split into chunks. Input must be Kannada script.
- Google News inclusion is automatic for policy-compliant content (no application). Core Web Vitals, clear bylines/dates and speed of publishing matter for Top Stories.
- Google's "Preferred Sources" and Discover "Follow" features are live in India; add prompts on the site.
- Web Stories still exist but visibility is inconsistent; keep them P2.
- AMP is not needed for articles; focus on Core Web Vitals.
