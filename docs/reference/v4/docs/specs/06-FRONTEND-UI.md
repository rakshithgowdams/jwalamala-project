# 06 — FRONTEND AND UI

## 1. Design tokens (Tailwind theme)
Colours
- ember: DEFAULT #C8341E, 600 #A82A17, 100 #FBE7E3 — primary buttons, LIVE, breaking label, play button, active nav.
- haldi: DEFAULT #E9A31B, 100 #FDF1D8 — event-date badges and focus rings ONLY (never text on white).
- marble: DEFAULT #FFFFFF, 2 #F3F4F7 (surface), 3 #E4E6EC (border).
- tulasi: DEFAULT #2E7D5B, 100 #E2F1EA — success/published.
- indigo: DEFAULT #1F2447, 700 #3A406B, 500 #5F6590, 300 #9EA2BF — text, header, footer, meta, placeholder.
- Dark ([data-theme="dark"]): bg #12152B, surface #1B1F3A, border #2C3154, text #ECEDF4, muted #A6AACB, accent #F06A4F. Use CSS variables so components switch automatically.
Typography
- font-head: Anek Kannada (variable, wdth axis). font-body: Noto Serif Kannada.
- Sizes: display 49/1.15/800 (width 80%), h1 39/1.25/700 (width 85%), h2 31/1.3/700, h3 20/1.4/600, body 18/1.8, ui 16/1.5/500, meta 13/1.4.
- Font-size control (F-40) scales article body: 16 / 18 / 21px.
Spacing 4px base: 4 8 12 16 24 32 48 64 96.
Radius: sm 4px (cards, buttons, inputs, images), md 8px (panels, modals), full (pills, avatars).
Shadow: only `menu` = 0 8px 24px rgba(31,36,71,.16).
Layout: container max 1200px; grid 4/8/12 columns at <640 / 640–1023 / ≥1024; gutters 16/24/24; page padding 16/24/32.
Motion: 150–200ms ease-out for UI state; honour prefers-reduced-motion.
Focus: 3px haldi outline, 2px offset.
Kannada rules: line-height ≥ 1.6, letter-spacing 0, no uppercase/italic, clamp titles with `line-clamp` (never cut by character count).

## 2. Component inventory
layout/
- Header, TopBar, CategoryMenu (with dropdown), MobileCategoryPills, MobileDrawer, BottomNav, Footer, FlameGarland (props: size, animated, unlit), BreakingTicker, LiveBanner, Breadcrumb, Container, SectionHeader (title + "ಎಲ್ಲವನ್ನೂ ನೋಡಿ" link).
ui/
- Button (primary/secondary/ghost/icon, loading state), IconButton, Pill, Badge, LiveBadge, EventDateBadge (sizes sm/md/lg, range support), SponsoredLabel, Input, Textarea, Select, Combobox, DatePicker (Kannada month names), DateRangePicker, Checkbox, Switch, Tabs, Accordion, Modal, BottomSheet, Drawer, Toast, Tooltip, Skeleton (card, list, article), Pagination, LoadMore, EmptyState, ErrorState, Spinner (FlameGarland animated), Avatar, ThemeToggle, FontSizeControl, BackToTop.
news/
- NewsCard (variants: large, standard, compact, horizontal, list-row, numbered), VideoCard, ShortCard, GalleryCard, EventCard, LiteVideoEmbed (YouTube/Facebook), StickyVideo, KeyPoints, Transcript, ArticleBody (renders sanitized HTML, injects AdSlots after paragraphs), EventInfoBox, ShareBar, FloatingShare, BookmarkButton, PrevNext, RelatedPosts, TagList, AuthorBox, PhotoGallery + Lightbox, CommentsSection (feature flag).
ads/
- AdSlot, ManualAd, GoogleAd, AdLabel, AdsenseScript, StickyMobileAd, AdPlaceholder (dev).
search/
- SearchBar (mode toggle), SearchSuggest, FiltersPanel, FiltersSheet, ResultRow, Highlight.
events/
- MonthCalendar, WeekStrip, DayPanel, YearArchive, ReminderButton.
account/
- OtpInput, LoginPanel, InterestsPicker, NotificationPrefs, InstallPrompt, PushOptIn, UpdateToast, OfflineToast.

Each component: typed props, story-like example on `/dev/components` (dev only), loading/empty/error states, dark mode, 390px and 1440px checked.

## 3. Page building method (for every page)
1. Look at the Stitch screen in docs/design/stitch/ and 02-PAGES.md.
2. Build the static layout with sample data and skeletons.
3. Connect real queries (server components).
4. Add client interactivity only where needed.
5. Insert AdSlots at the positions in 02-PAGES.md.
6. Add metadata + JSON-LD.
7. Check 390px / 768px / 1440px, dark mode, keyboard navigation.
8. Write Playwright test for the main flow.

## 4. Images and video
- next/image, remotePatterns: i.ytimg.com, img.youtube.com, Supabase storage host, scontent/facebook CDN if needed.
- All media boxes have aspect-ratio (16:9 cards, 9:16 shorts, 1:1 avatars).
- LiteVideoEmbed: thumbnail (maxresdefault → hqdefault fallback), ember play button, loads iframe on click, `title` attribute in Kannada, `allow` limited.
- Placeholder thumbnail: indigo-700 with single flame.

## 5. Client state
- Minimal: React state + URL search params for filters. Zustand only if needed (e.g. font size, theme, recent searches) with localStorage wrapped in try/catch.
- Server Actions with useOptimistic for bookmarks.

## 6. PWA (Serwist)
- manifest: name "ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್", short_name "ಜ್ವಾಲಾಮಾಲ", lang kn, start_url "/?source=pwa", display standalone, theme #1F2447, background #FFFFFF, icons 192/512 + maskable (script generates PNGs from SVG), shortcuts (ಲೈವ್, ಹುಡುಕಿ, ಕಾರ್ಯಕ್ರಮ), screenshots.
- Caching: precache shell/fonts/icons/offline; pages network-first 3s → cache → /offline; public Supabase GET stale-while-revalidate (200 entries, 1 day); i.ytimg.com cache-first (300, 7 days); ad creatives cache-first (100, 1 day).
- NEVER cache: /admin, /account, /api/ads/*, AdSense requests, auth, non-GET.
- Saved posts pre-cached on bookmark.
- Install prompt after 2nd visit; iOS guide.
- Push opt-in after button tap only, topic picker.
- Update toast and online/offline toast.

## 7. Performance budget
- Public page first-load JS < 170 KB (AdSense script excluded, loaded after interactive).
- LCP < 2.5s, CLS < 0.1 (ads included), INP < 200ms on mid-range Android.
- Fonts: only needed weights; `display: swap`.
- Dynamic import for Lightbox, DatePicker, Tiptap, charts.

## 8. Accessibility
- Landmarks, skip link "ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ".
- All inputs labelled; errors announced (aria-live).
- Ticker pausable; carousels have controls.
- Contrast AA in both themes; ads labelled and never focus-trapping.
