# PROGRESS

Living record of what's built, decisions made with the owner, and a dated changelog.

## Decisions (with the owner)

- **Accuracy**: no "95% accurate" claim. Every forecast shows a 95% range
  (split-conformal); the goal is that the range holds ≥ 95% of the time, and
  `/accuracy` publishes the measured hit rate per commodity and horizon.
- **Forecasting service**: Python FastAPI as a Vercel Python function (free on
  Hobby), numpy-only to stay far below the 250 MB bundle limit.
- **Identity**: anonymous device accounts (signed cookie), no sign-up, no typing.
  Optional phone OTP later.
- **Repo**: public GitHub repo `farmer_and_stocks`, separate from farm-manager.

## What's built (v5, 2026-10-05) — Home rebuilt

- One prioritized column: "Today's brief" (up to 3 plain sentences from
  weather, the biggest 7-day move in the watchlist and the strongest call,
  plus ONE next action: check in -> update prices -> act). Rules live in
  `src/lib/brief.ts` (pure, tested).
- Interactive weather (`WeatherPanel`): tap Now or any of 7 days to swap the
  headline and detail tiles. `describeCode` moved to `src/lib/wx.ts` so
  client components can use it.
- Shortcut row; swipeable "Plant next" and "Opportunities & risks" cards
  (`.snap-row`); watchlist with Today / 7 days / 3 months switch, sparklines
  and show-all. The three vanity KPI tiles were removed.

## What's built (v4, 2026-09-27)

- 5-year price history: resumable backfill of TCB's public archive
  (~1,400 daily sheets from May 2021; year-ago columns reach 2020) via
  `/api/cron/backfill` (`ingest_state` holds the next page). Every TCB item is
  also stored per day in `retail_product_prices`.
- Automatic daily collection: prices twice a day (`/api/cron/retail` at
  04:30 and 11:00 UTC), TCB/WFP/weather daily, weather history and archive
  backfill daily until complete. Forecasts pick the longest recent series.
- "Aurora" redesign: dark-first glass UI (Space Grotesk display numerals,
  gradient accents, floating nav pill, segmented tabs, sparklines, KPI
  tiles) with Light/Auto themes (`fs_theme` cookie, `data-theme` on <html>).
- Not available: FAO FPMA has no documented public API; the Internet Archive
  (for old Chaldal/Shwapno pages) was offline when tried.

## What's built (v3, 2026-09-27)

- "Update today's price" button (Home + Market): one shared background
  scrape (Chaldal, Shwapno, TCB) via `after()`; the client polls until done.
  `price_refresh_runs` is both the log and the lock (joins a running run;
  skips if one finished < 30 min ago; 6 taps/hour/device). Daily cron
  `/api/cron/retail` runs the same job.
- `retail_product_prices`: every product seen per day (regular + sale price,
  pack size, per-unit price). Market "Today's prices" tab shows each
  commodity vs yesterday and vs 7 days (like-for-like per source), and each
  commodity page lists its tracked products with day-on-day change.
- Forecast series order now WFP -> online grocers (Chaldal+Shwapno, once
  >= 18 months) -> TCB survey -> community.

## What's built (v2, 2026-09-26)

- Location down to division → district → upazila/thana → union (tap
  drill-down; 494 upazilas / 4,540 unions from bangladesh-geocode, MIT, built
  by `scripts/build-geo.mjs` into `src/data/bd-admin.json`). Village level is a
  one-tap GPS fix (rounded to ~100 m) with the village name from OpenStreetMap
  Nominatim. Weather/price reports are tagged with union + GPS.
- Unlimited commodity selection (was max 12), with select-all/clear.
- 5-year daily weather history per district (Open-Meteo archive from
  2021-01-01, backfilled 12 districts per `/api/cron/history` run); used for
  district climate normals (crop fit) and "this month vs last 5 years".
- 12-month crop plan grouped by planting window (0–3, 3–6, 6–12 months).
- Chaldal + Shwapno daily retail prices (`/api/cron/retail`), always the
  regular price (discounts excluded); "Avg. price" = mean of TCB, Chaldal and
  Shwapno prices from the last 3 days.
- Traffic-light flags (green profitable / orange stable / red loss risk) with
  icon + label: price direction (market), margin after storage (stock
  planner), climate fit + harvest price (crops). `src/lib/recommend.ts`.
- New UI: 4 tabs (Home, Grow, Market, More); weather hero with current
  conditions at the user's GPS/district; "Grow for profit" and "Hot right now"
  highlights; market list with flag filters; commodity detail pages
  (`/market/[commodity]`) with per-source prices.

## What's built (MVP, 2026-09-26)

- Tap-only onboarding: language → role → division → district → commodities → reminders/day.
- Today: 3-question weather check-in per slot (morning / midday / evening),
  per-commodity retail/wholesale price confirmation (± stepper + slider,
  centred on the best known price). Outlier reports are stored but flagged.
- Farm: 7-day Open-Meteo district forecast, today's local crowd reports,
  crop suggestions (22 crop profiles, climate fit from 10-year division
  normals, harvest-time price outlook), price-forecast cards with charts.
- Trade: margin calculator (hold months, storage %/month, loss %, buy price)
  with 95% range and probability of profit; ranked "stock now" table.
- Accuracy: per-commodity coverage / MAPE / tested months for 1, 3, 6 months
  ahead; next-day rain hit rate; crowd-vs-measured rain agreement; source health.
- Settings: all fields tap-editable; Web Push opt-in (PWA + service worker).
- Ingest (daily cron): Open-Meteo forecast + observed, climate normals (once),
  WFP/HDX CSV (skipped when unchanged), TCB daily XLSX (first run back-fills
  ~2 years via each sheet's 1-month/1-year-ago columns).
- Forecast (daily cron): series choice WFP national median → TCB Dhaka →
  community medians; 1–12 month horizons stored in `price_forecasts`.

## Not built yet / next

- Web Push delivery not yet verified on a real phone/Chrome (service worker
  registration is blocked in the embedded test browser).
- Forecasts are mostly flat (naive model wins backtests); vegetable seasonality
  needs more history before seasonal models can be validated, so few items get
  a green flag yet.
- Chaldal categories for rice/dal/eggs render client-side only; those come from Shwapno.
- City thanas (DMP/CMP) are not in the upazila dataset.
- Community prices are not yet used as a forecast series until ≥ 18 months exist.
- Device trust scores (column exists, not yet updated from agreement with consensus).
- Weather "AI" is Open-Meteo NWP + crowd display; no local bias correction yet
  (needs weeks of paired crowd/forecast data).
- DAM (dam.gov.bd) wholesale prices: site refused connections during build; revisit.
- Optional phone OTP, admin dashboard, crop-specific yield/cost economics.

## Changelog

- 2026-10-05 — v5: Home rebuilt around a daily brief, interactive weather,
  swipe cards and a watchlist.
- 2026-09-27 — v4: TCB 5-year archive backfill, twice-daily automatic price
  collection, longest-series forecasting, "Aurora" futuristic redesign + themes.
- 2026-09-27 — v3: "Update today's price" button, per-product daily price
  table and day/week change views; TCB relabelled as "market survey".
- 2026-09-26 — v2: deeper location + GPS, 5-year weather history, Chaldal/Shwapno
  regular prices, traffic-light flags, 12-month crop plan, UI redesign.
- 2026-09-26 — Deployed to https://farmer-and-stocks.vercel.app (Vercel project
  `farmer-and-stocks`, GitHub-connected: every push to main auto-deploys; Neon
  resource `farmer-and-stocks-db`). Fixes found in production: TCB TLS chain
  (bundled Sectigo DV R36 intermediate), Open-Meteo 503 retries, forecast
  horizons extended to 12 months, untestable horizons omitted (was HTTP 500).
- 2026-09-26 — Initial MVP: Next.js 16 + FastAPI + Neon, ingest/forecast/push
  crons, farmer/trader/accuracy dashboards, EN/BN, CI workflow.
