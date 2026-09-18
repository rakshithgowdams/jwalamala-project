# 09 — WIDGETS AND LIVE DATA (weather, AQI, Jain daily times, calendars, utility data)

General rules for all live data
- Never call third-party APIs from the browser. Fetch on the server (Edge Function or route handler), store in Supabase, serve from our own cached endpoint.
- Every widget shows "ನವೀಕರಿಸಲಾಗಿದೆ: time" and the data source credit.
- If data is stale (> 2× refresh interval) show last value with a muted "ಹಳೆಯ ಮಾಹಿತಿ" note; never show a broken widget.
- All providers are wrapped behind an interface (`lib/data-providers/*`) so they can be swapped.

## W — Weather and air quality

### W1 Header chip
- Shows weather icon + temperature + AQI badge for the reader's selected place (default: Bengaluru; saved in localStorage/profile).
- Tap → popover: condition in Kannada, feels-like, humidity, rain chance, AQI level with colour and advice, "ಊರು ಬದಲಿಸಿ" (change place), link to /weather.
- Mobile: compact icon + temperature in header; AQI inside popover.
- Optional "ನನ್ನ ಸ್ಥಳ ಬಳಸಿ" (use my location) — browser geolocation only after tap; snap to nearest seeded place.

### W2 Weather page `/weather` (ಹವಾಮಾನ)
- Place picker (all 31 Karnataka districts + key Jain centres).
- Now: temperature, condition, feels like, humidity, wind, UV, sunrise/sunset.
- Hourly strip (24h) and 7-day forecast cards.
- AQI panel: overall index, PM2.5, PM10, O₃, NO₂ with level colours and plain-Kannada advice.
- Rain alert banner when forecast precipitation crosses thresholds set in admin.
- District grid: small cards for all districts (temperature + icon).
- Related weather news (tag: ಹವಾಮಾನ).
- [AD:category_top], [AD:category_sidebar].

### W3 Data pipeline
- Provider: Open-Meteo Forecast + Air Quality APIs (free tier is non-commercial; budget a commercial plan for production or choose an alternative; attribution required). Keep the provider swappable.
- Edge Function `fetch-weather`: every 30 minutes (pg_cron), fetch all seeded places in batched requests; upsert `weather_snapshots` (current + hourly + daily JSON) and `aqi_snapshots`.
- AQI: calculate Indian National AQI (NAQI) category from pollutant values using the official breakpoints table (store table in code with source note); show "ಉತ್ತಮ / ತೃಪ್ತಿಕರ / ಮಧ್ಯಮ / ಕಳಪೆ / ಅತಿ ಕಳಪೆ / ತೀವ್ರ". Label it "ಅಂದಾಜು" (estimated) since values are model-based, not station readings.
- Weather codes mapped to Kannada text + lucide icons in `lib/weather/codes.ts`.
- Route `/api/weather?place=slug` returns cached snapshot (s-maxage 600).
- ⚠ Official IMD warnings: only add if an approved IMD data feed is available; otherwise do not claim official alerts.

## J — Jain community utilities

### J1 Daily Jain times panel (ಇಂದಿನ ಸಮಯ)
- For the selected place: date in Kannada, sunrise, sunset, and a configurable list of observance times computed as offsets from sunrise/sunset (for example the time to finish meals before sunset).
- Calculation: `suncalc` (offline, no API) with place lat/lng and Asia/Kolkata timezone.
- The list of observances, their Kannada names and offset rules are stored in `site_settings.jain_times` and MUST be approved by the client's community advisor (Karnataka Jains follow mostly Digambar traditions; do not hard-code practices). Admin screen lets them edit names, formulas (sunrise + N minutes, sunset − N minutes, fraction of daytime) and visibility.
- Placement: home sidebar/section, /jain-calendar page, optional header popover tab.
- Disclaimer line: "ಸಮಯಗಳು ಅಂದಾಜು; ಸ್ಥಳೀಯ ಪಂಚಾಂಗ ನೋಡಿ".

### J2 Jain calendar `/jain-calendar` (ಜೈನ ಪಂಚಾಂಗ / ಪರ್ವ ದಿನಗಳು)
- Month view with parva days, festivals (e.g. Mahavir Jayanti, Paryushana/Dashalakshana, Deepavali-Nirvana, Ashtahnika), tithis entered by editors.
- Data is EDITOR-MANAGED (`jain_calendar_days` table) — no automatic tithi calculation in v1 (accuracy risk). Bulk CSV import for a full year.
- Each day links to related events and coverage.
- "ಜ್ಞಾಪನೆ ಹೊಂದಿಸಿ" for parva days (push).
- Home widget: next 3 parva days.

## D — Utility data (P2)

### D1 Reservoir water levels `/reservoirs` (ಜಲಾಶಯಗಳ ನೀರಿನ ಮಟ್ಟ) ⚠
- Table/cards: reservoir, full level, today level, storage %, inflow, outflow, last year same day, updated time.
- Source: official Karnataka state data. There may be no public API: default is ADMIN MANUAL ENTRY (fast form + CSV paste). Automated import only if the source's terms allow it.

### D2 Market rates `/rates` (ಚಿನ್ನ, ಬೆಳ್ಳಿ, ಇಂಧನ ದರ) ⚠
- Gold 22K/24K, silver per kg, petrol/diesel for Bengaluru and chosen districts, with daily change arrow and 30-day chart.
- Source: licensed data API (paid) or admin manual entry. Show source and time. No scraping without permission.

### D3 Utility pages in trending bar
Admin can pin any utility page (weather, reservoirs, rates, Jain calendar, jobs) to the trending topics bar.

## Tables (see 13-DATABASE-ADDITIONS.md)
places (add lat/lng, is_district, show_in_weather), weather_snapshots, aqi_snapshots, jain_calendar_days, reservoir_readings, market_rates.
