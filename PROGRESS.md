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

- 2026-09-26 — v2: deeper location + GPS, 5-year weather history, Chaldal/Shwapno
  regular prices, traffic-light flags, 12-month crop plan, UI redesign.
- 2026-09-26 — Deployed to https://farmer-and-stocks.vercel.app (Vercel project
  `farmer-and-stocks`, GitHub-connected: every push to main auto-deploys; Neon
  resource `farmer-and-stocks-db`). Fixes found in production: TCB TLS chain
  (bundled Sectigo DV R36 intermediate), Open-Meteo 503 retries, forecast
  horizons extended to 12 months, untestable horizons omitted (was HTTP 500).
- 2026-09-26 — Initial MVP: Next.js 16 + FastAPI + Neon, ingest/forecast/push
  crons, farmer/trader/accuracy dashboards, EN/BN, CI workflow.
