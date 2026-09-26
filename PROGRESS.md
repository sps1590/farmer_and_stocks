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
- Upazila-level location (districts only today).
- Community prices are not yet used as a forecast series until ≥ 18 months exist.
- Device trust scores (column exists, not yet updated from agreement with consensus).
- Weather "AI" is Open-Meteo NWP + crowd display; no local bias correction yet
  (needs weeks of paired crowd/forecast data).
- DAM (dam.gov.bd) wholesale prices: site refused connections during build; revisit.
- Optional phone OTP, admin dashboard, crop-specific yield/cost economics.

## Changelog

- 2026-09-26 — Deployed to https://farmer-and-stocks.vercel.app (Vercel project
  `farmer-and-stocks`, GitHub-connected: every push to main auto-deploys; Neon
  resource `farmer-and-stocks-db`). Fixes found in production: TCB TLS chain
  (bundled Sectigo DV R36 intermediate), Open-Meteo 503 retries, forecast
  horizons extended to 12 months, untestable horizons omitted (was HTTP 500).
- 2026-09-26 — Initial MVP: Next.js 16 + FastAPI + Neon, ingest/forecast/push
  crons, farmer/trader/accuracy dashboards, EN/BN, CI workflow.
